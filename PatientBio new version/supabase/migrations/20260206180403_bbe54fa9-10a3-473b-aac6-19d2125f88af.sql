-- Fix function search paths for security
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
SET search_path = public
AS $$
DECLARE
  hash_input TEXT;
BEGIN
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
SET search_path = public
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