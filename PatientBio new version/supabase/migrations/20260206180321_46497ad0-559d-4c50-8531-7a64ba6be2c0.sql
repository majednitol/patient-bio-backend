-- =====================================================
-- PHASE 3: TRUST & COMPLIANCE
-- =====================================================

-- 1. CREATE CRYPTOGRAPHIC HASH CHAIN FUNCTION FOR AUDIT TRAIL
-- Uses pgcrypto for SHA-256 hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Function to compute SHA-256 hash for audit entry
CREATE OR REPLACE FUNCTION public.compute_audit_hash(
  p_event_type TEXT,
  p_entity_type TEXT,
  p_entity_id UUID,
  p_user_id UUID,
  p_action TEXT,
  p_details JSONB,
  p_previous_hash TEXT,
  p_timestamp TIMESTAMPTZ
)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  hash_input TEXT;
BEGIN
  -- Concatenate all fields into a single string for hashing
  hash_input := COALESCE(p_event_type, '') || '|' ||
                COALESCE(p_entity_type, '') || '|' ||
                COALESCE(p_entity_id::TEXT, '') || '|' ||
                COALESCE(p_user_id::TEXT, '') || '|' ||
                COALESCE(p_action, '') || '|' ||
                COALESCE(p_details::TEXT, '{}') || '|' ||
                COALESCE(p_previous_hash, 'GENESIS') || '|' ||
                COALESCE(p_timestamp::TEXT, '');
  
  RETURN encode(digest(hash_input, 'sha256'), 'hex');
END;
$$;

-- Trigger function to automatically chain hashes
CREATE OR REPLACE FUNCTION public.audit_trail_hash_chain()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  last_hash TEXT;
BEGIN
  -- Get the most recent hash from the audit trail
  SELECT event_hash INTO last_hash
  FROM public.audit_trail
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- Set previous hash (or NULL for genesis block)
  NEW.previous_hash := last_hash;
  
  -- Compute the new hash
  NEW.event_hash := public.compute_audit_hash(
    NEW.event_type,
    NEW.entity_type,
    NEW.entity_id,
    NEW.user_id,
    NEW.action,
    NEW.details,
    NEW.previous_hash,
    NEW.created_at
  );
  
  RETURN NEW;
END;
$$;

-- Drop existing trigger if exists and create new one
DROP TRIGGER IF EXISTS audit_trail_hash_chain_trigger ON public.audit_trail;
CREATE TRIGGER audit_trail_hash_chain_trigger
  BEFORE INSERT ON public.audit_trail
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_trail_hash_chain();

-- 2. CONSENT RECORDS TABLE FOR EXPLICIT CONSENT MANAGEMENT
CREATE TABLE IF NOT EXISTS public.consent_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  consent_type TEXT NOT NULL CHECK (consent_type IN ('data_sharing', 'research_participation', 'marketing', 'emergency_access', 'third_party_access')),
  granted_to_id UUID, -- Can be NULL for general consents
  granted_to_type TEXT CHECK (granted_to_type IN ('doctor', 'hospital', 'pathologist', 'researcher', 'system', 'emergency_services')),
  purpose TEXT NOT NULL,
  scope JSONB DEFAULT '[]'::jsonb, -- Which data categories are covered
  is_active BOOLEAN DEFAULT true,
  granted_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  revocation_reason TEXT,
  digital_signature TEXT, -- Hash of consent details + timestamp + user_id
  signature_method TEXT DEFAULT 'sha256_timestamp',
  consent_version TEXT DEFAULT '1.0',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on consent_records
ALTER TABLE public.consent_records ENABLE ROW LEVEL SECURITY;

-- Patients can view their own consent records
CREATE POLICY "Patients can view own consents"
  ON public.consent_records
  FOR SELECT
  TO authenticated
  USING (patient_id = auth.uid());

-- Patients can create their own consent records
CREATE POLICY "Patients can create own consents"
  ON public.consent_records
  FOR INSERT
  TO authenticated
  WITH CHECK (patient_id = auth.uid());

-- Patients can update their own consent records (revoke)
CREATE POLICY "Patients can update own consents"
  ON public.consent_records
  FOR UPDATE
  TO authenticated
  USING (patient_id = auth.uid());

-- Providers can view consents granted to them
CREATE POLICY "Providers can view consents granted to them"
  ON public.consent_records
  FOR SELECT
  TO authenticated
  USING (granted_to_id = auth.uid() AND is_active = true);

-- Function to generate digital signature for consent
CREATE OR REPLACE FUNCTION public.generate_consent_signature(
  p_patient_id UUID,
  p_consent_type TEXT,
  p_purpose TEXT,
  p_scope JSONB,
  p_timestamp TIMESTAMPTZ
)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  signature_input TEXT;
BEGIN
  signature_input := p_patient_id::TEXT || '|' ||
                     p_consent_type || '|' ||
                     p_purpose || '|' ||
                     COALESCE(p_scope::TEXT, '[]') || '|' ||
                     p_timestamp::TEXT;
  
  RETURN encode(digest(signature_input, 'sha256'), 'hex');
END;
$$;

-- Trigger to auto-generate digital signature on consent insert
CREATE OR REPLACE FUNCTION public.consent_auto_signature()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.digital_signature := public.generate_consent_signature(
    NEW.patient_id,
    NEW.consent_type,
    NEW.purpose,
    NEW.scope,
    NEW.granted_at
  );
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS consent_auto_signature_trigger ON public.consent_records;
CREATE TRIGGER consent_auto_signature_trigger
  BEFORE INSERT OR UPDATE ON public.consent_records
  FOR EACH ROW
  EXECUTE FUNCTION public.consent_auto_signature();

-- 3. COMPLIANCE REPORTS TABLE
CREATE TABLE IF NOT EXISTS public.compliance_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_type TEXT NOT NULL CHECK (report_type IN ('hipaa_audit', 'gdpr_dsar', 'access_report', 'consent_report', 'security_incident')),
  generated_by UUID NOT NULL,
  report_period_start TIMESTAMPTZ NOT NULL,
  report_period_end TIMESTAMPTZ NOT NULL,
  report_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  file_url TEXT,
  status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'generating', 'completed', 'failed')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on compliance_reports
ALTER TABLE public.compliance_reports ENABLE ROW LEVEL SECURITY;

-- Only admins can view compliance reports
CREATE POLICY "Admins can manage compliance reports"
  ON public.compliance_reports
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- 4. FUNCTION TO VERIFY AUDIT TRAIL INTEGRITY
CREATE OR REPLACE FUNCTION public.verify_audit_trail_integrity(
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  total_entries BIGINT,
  verified_entries BIGINT,
  broken_chain_count BIGINT,
  first_broken_at TIMESTAMPTZ,
  integrity_percentage NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec RECORD;
  prev_hash TEXT := NULL;
  computed_hash TEXT;
  total_count BIGINT := 0;
  verified_count BIGINT := 0;
  broken_count BIGINT := 0;
  first_broken TIMESTAMPTZ := NULL;
BEGIN
  FOR rec IN 
    SELECT * FROM public.audit_trail
    WHERE (p_start_date IS NULL OR created_at >= p_start_date)
      AND (p_end_date IS NULL OR created_at <= p_end_date)
    ORDER BY created_at ASC
  LOOP
    total_count := total_count + 1;
    
    -- Compute expected hash
    computed_hash := public.compute_audit_hash(
      rec.event_type,
      rec.entity_type,
      rec.entity_id,
      rec.user_id,
      rec.action,
      rec.details,
      rec.previous_hash,
      rec.created_at
    );
    
    -- Check if hash matches and chain is valid
    IF rec.event_hash = computed_hash AND (rec.previous_hash = prev_hash OR (rec.previous_hash IS NULL AND prev_hash IS NULL)) THEN
      verified_count := verified_count + 1;
    ELSE
      broken_count := broken_count + 1;
      IF first_broken IS NULL THEN
        first_broken := rec.created_at;
      END IF;
    END IF;
    
    prev_hash := rec.event_hash;
  END LOOP;
  
  RETURN QUERY SELECT 
    total_count,
    verified_count,
    broken_count,
    first_broken,
    CASE WHEN total_count > 0 
      THEN ROUND((verified_count::NUMERIC / total_count::NUMERIC) * 100, 2)
      ELSE 100.00
    END;
END;
$$;

-- 5. INDEX FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_consent_records_patient ON public.consent_records(patient_id);
CREATE INDEX IF NOT EXISTS idx_consent_records_granted_to ON public.consent_records(granted_to_id) WHERE granted_to_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_consent_records_active ON public.consent_records(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_compliance_reports_type ON public.compliance_reports(report_type);
CREATE INDEX IF NOT EXISTS idx_compliance_reports_date ON public.compliance_reports(created_at DESC);