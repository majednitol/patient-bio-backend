-- Emergency access tokens table
CREATE TABLE public.emergency_access_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emergency_token TEXT NOT NULL UNIQUE,
  emergency_pin_hash TEXT,
  access_level TEXT NOT NULL DEFAULT 'critical_only' CHECK (access_level IN ('critical_only', 'full')),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  accessed_at TIMESTAMPTZ,
  access_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_by TEXT NOT NULL DEFAULT 'patient' CHECK (created_by IN ('patient', 'qr_scan', 'system')),
  responder_identifier TEXT
);

-- Index for token lookups
CREATE INDEX idx_emergency_tokens_token ON public.emergency_access_tokens(emergency_token);
CREATE INDEX idx_emergency_tokens_patient ON public.emergency_access_tokens(patient_id);

-- RLS Policies
ALTER TABLE public.emergency_access_tokens ENABLE ROW LEVEL SECURITY;

-- Patients can manage their own emergency tokens
CREATE POLICY "Patients manage own emergency tokens"
ON public.emergency_access_tokens
FOR ALL
TO authenticated
USING (patient_id = auth.uid())
WITH CHECK (patient_id = auth.uid());

-- Audit table for emergency accesses
CREATE TABLE public.emergency_access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  emergency_token_id UUID NOT NULL REFERENCES public.emergency_access_tokens(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL,
  accessed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_address INET,
  user_agent TEXT,
  responder_identifier TEXT,
  location_data JSONB,
  data_accessed JSONB
);

-- Enable RLS
ALTER TABLE public.emergency_access_logs ENABLE ROW LEVEL SECURITY;

-- Patients can view their own access logs
CREATE POLICY "Patients view own emergency logs"
ON public.emergency_access_logs
FOR SELECT
TO authenticated
USING (patient_id = auth.uid());