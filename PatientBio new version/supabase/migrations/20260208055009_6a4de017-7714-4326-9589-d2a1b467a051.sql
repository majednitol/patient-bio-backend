-- =============================================================================
-- DATA PROVENANCE TRACKING TABLE
-- Tracks origin and history of all health data for FHIR Provenance compliance
-- =============================================================================

CREATE TABLE public.data_provenance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  target_resource_type TEXT NOT NULL, -- 'health_metrics', 'health_records', 'health_data', etc.
  target_resource_id UUID NOT NULL,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('create', 'update', 'delete', 'import', 'export', 'share')),
  agent_type TEXT NOT NULL CHECK (agent_type IN ('patient', 'doctor', 'pathologist', 'researcher', 'hospital', 'system', 'external_ehr')),
  agent_id TEXT, -- User ID or system identifier
  agent_name TEXT, -- Display name for the agent
  source_system TEXT, -- 'manual', 'fhir_import', 'ccda_import', 'hl7v2_import', 'ehr_name'
  source_document TEXT, -- Original filename or reference
  source_version TEXT, -- Version of the source format (e.g., 'R4', 'CDA R2')
  policy_reference TEXT, -- Reference to consent or policy that authorized this action
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  signature TEXT, -- Optional digital signature for non-repudiation
  metadata JSONB DEFAULT '{}'::jsonb, -- Additional context
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for efficient querying
CREATE INDEX idx_data_provenance_user_id ON public.data_provenance(user_id);
CREATE INDEX idx_data_provenance_target ON public.data_provenance(target_resource_type, target_resource_id);
CREATE INDEX idx_data_provenance_recorded_at ON public.data_provenance(recorded_at DESC);
CREATE INDEX idx_data_provenance_activity ON public.data_provenance(activity_type);

-- Enable RLS
ALTER TABLE public.data_provenance ENABLE ROW LEVEL SECURITY;

-- Patients can view their own provenance records
CREATE POLICY "Users can view own provenance"
ON public.data_provenance FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- System can insert provenance (via service role or triggers)
CREATE POLICY "System can insert provenance"
ON public.data_provenance FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- =============================================================================
-- CROSS-BORDER DATA TRANSFER AGREEMENTS TABLE
-- Tracks consent for international data transfers (GDPR/HIPAA compliance)
-- =============================================================================

CREATE TYPE public.transfer_basis AS ENUM (
  'explicit_consent',
  'standard_contractual_clauses',
  'binding_corporate_rules',
  'adequacy_decision',
  'derogation_vital_interests',
  'derogation_public_interest'
);

CREATE TYPE public.jurisdiction_code AS ENUM (
  'EU', 'US', 'UK', 'IN', 'CN', 'JP', 'AU', 'CA', 'BR', 'SG', 'AE', 'ZA', 'OTHER'
);

CREATE TABLE public.data_transfer_agreements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  access_token_id UUID REFERENCES public.access_tokens(id) ON DELETE CASCADE,
  source_jurisdiction public.jurisdiction_code NOT NULL,
  destination_jurisdiction public.jurisdiction_code NOT NULL,
  transfer_basis public.transfer_basis NOT NULL,
  recipient_name TEXT, -- Name of receiving organization
  recipient_type TEXT CHECK (recipient_type IN ('healthcare_provider', 'researcher', 'insurance', 'government', 'other')),
  data_categories TEXT[] NOT NULL, -- ['demographics', 'conditions', 'medications', 'lab_results', 'vitals']
  purpose TEXT NOT NULL, -- Purpose of the transfer
  retention_period_days INTEGER, -- How long recipient can retain data
  acknowledged_risks BOOLEAN DEFAULT false,
  acknowledged_at TIMESTAMPTZ,
  consent_timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  revocation_reason TEXT,
  transfer_impact_assessment JSONB, -- GDPR DPIA details if applicable
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_data_transfer_user_id ON public.data_transfer_agreements(user_id);
CREATE INDEX idx_data_transfer_token_id ON public.data_transfer_agreements(access_token_id);
CREATE INDEX idx_data_transfer_jurisdictions ON public.data_transfer_agreements(source_jurisdiction, destination_jurisdiction);
CREATE INDEX idx_data_transfer_active ON public.data_transfer_agreements(user_id) WHERE revoked_at IS NULL;

-- Enable RLS
ALTER TABLE public.data_transfer_agreements ENABLE ROW LEVEL SECURITY;

-- Users can view their own agreements
CREATE POLICY "Users can view own transfer agreements"
ON public.data_transfer_agreements FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Users can create their own agreements
CREATE POLICY "Users can create own transfer agreements"
ON public.data_transfer_agreements FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Users can update their own agreements (for revocation)
CREATE POLICY "Users can update own transfer agreements"
ON public.data_transfer_agreements FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

-- Trigger for updated_at
CREATE TRIGGER update_data_transfer_agreements_updated_at
BEFORE UPDATE ON public.data_transfer_agreements
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================================================
-- HELPER FUNCTION: Record data provenance
-- =============================================================================

CREATE OR REPLACE FUNCTION public.record_provenance(
  p_user_id UUID,
  p_target_type TEXT,
  p_target_id UUID,
  p_activity TEXT,
  p_agent_type TEXT,
  p_agent_id TEXT DEFAULT NULL,
  p_source_system TEXT DEFAULT 'manual',
  p_source_document TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_provenance_id UUID;
BEGIN
  INSERT INTO public.data_provenance (
    user_id,
    target_resource_type,
    target_resource_id,
    activity_type,
    agent_type,
    agent_id,
    source_system,
    source_document,
    metadata
  ) VALUES (
    p_user_id,
    p_target_type,
    p_target_id,
    p_activity,
    p_agent_type,
    p_agent_id,
    p_source_system,
    p_source_document,
    p_metadata
  )
  RETURNING id INTO v_provenance_id;
  
  RETURN v_provenance_id;
END;
$$;

-- =============================================================================
-- HELPER FUNCTION: Check if cross-border transfer requires additional consent
-- =============================================================================

CREATE OR REPLACE FUNCTION public.requires_cross_border_consent(
  p_source_jurisdiction public.jurisdiction_code,
  p_destination_jurisdiction public.jurisdiction_code
)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
BEGIN
  -- Same jurisdiction never requires cross-border consent
  IF p_source_jurisdiction = p_destination_jurisdiction THEN
    RETURN false;
  END IF;
  
  -- EU to EU transfers don't require additional consent (adequacy)
  IF p_source_jurisdiction = 'EU' AND p_destination_jurisdiction IN ('EU', 'UK') THEN
    RETURN false;
  END IF;
  
  -- All other cross-border transfers require explicit consent
  RETURN true;
END;
$$;