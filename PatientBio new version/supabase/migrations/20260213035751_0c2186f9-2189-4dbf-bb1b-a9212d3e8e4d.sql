
-- Fix functions that reference digest() to use extensions schema
-- Update compute_audit_hash to use extensions.digest
CREATE OR REPLACE FUNCTION public.compute_audit_hash(p_event_type text, p_entity_type text, p_entity_id uuid, p_user_id uuid, p_action text, p_details jsonb, p_previous_hash text, p_timestamp timestamp with time zone)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public', 'extensions'
AS $function$
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
$function$;

-- Update add_audit_entry
CREATE OR REPLACE FUNCTION public.add_audit_entry(p_event_type text, p_entity_type text, p_entity_id uuid, p_user_id uuid, p_action text, p_details jsonb DEFAULT '{}'::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_previous_hash TEXT;
  v_event_hash TEXT;
  v_id UUID;
  v_hash_input TEXT;
BEGIN
  SELECT event_hash INTO v_previous_hash
  FROM public.audit_trail
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF v_previous_hash IS NULL THEN
    v_previous_hash := 'GENESIS_0000000000000000000000000000000000000000000000000000000000000000';
  END IF;
  
  v_hash_input := v_previous_hash || '|' || 
                  p_event_type || '|' || 
                  p_entity_type || '|' || 
                  COALESCE(p_entity_id::TEXT, 'NULL') || '|' || 
                  p_user_id::TEXT || '|' || 
                  p_action || '|' || 
                  p_details::TEXT || '|' || 
                  now()::TEXT;
  
  v_event_hash := encode(digest(v_hash_input, 'sha256'), 'hex');
  
  INSERT INTO public.audit_trail (
    event_type, entity_type, entity_id, user_id, action, details, previous_hash, event_hash
  ) VALUES (
    p_event_type, p_entity_type, p_entity_id, p_user_id, p_action, p_details, v_previous_hash, v_event_hash
  ) RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$function$;

-- Update record_blockchain_transaction
CREATE OR REPLACE FUNCTION public.record_blockchain_transaction(p_transaction_type blockchain_transaction_type, p_actor_id uuid, p_target_resource_type text DEFAULT NULL::text, p_target_resource_id uuid DEFAULT NULL::uuid, p_metadata jsonb DEFAULT '{}'::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_previous_hash TEXT;
  v_data_hash TEXT;
  v_hash_input TEXT;
  v_transaction_id UUID;
BEGIN
  SELECT data_hash INTO v_previous_hash
  FROM public.blockchain_transactions
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_previous_hash IS NULL THEN
    v_previous_hash := 'GENESIS_0000000000000000000000000000000000000000000000000000000000000000';
  END IF;

  v_hash_input := p_transaction_type::TEXT || '|' ||
                  p_actor_id::TEXT || '|' ||
                  COALESCE(p_target_resource_type, 'NULL') || '|' ||
                  COALESCE(p_target_resource_id::TEXT, 'NULL') || '|' ||
                  v_previous_hash || '|' ||
                  p_metadata::TEXT || '|' ||
                  now()::TEXT;

  v_data_hash := encode(digest(v_hash_input, 'sha256'), 'hex');

  INSERT INTO public.blockchain_transactions (
    transaction_type, actor_id, target_resource_type, target_resource_id, data_hash, previous_hash, metadata
  ) VALUES (
    p_transaction_type, p_actor_id, p_target_resource_type, p_target_resource_id, v_data_hash, v_previous_hash, p_metadata
  ) RETURNING id INTO v_transaction_id;

  RETURN v_transaction_id;
END;
$function$;

-- Update generate_consent_signature
CREATE OR REPLACE FUNCTION public.generate_consent_signature(p_patient_id uuid, p_consent_type text, p_purpose text, p_scope jsonb, p_timestamp timestamp with time zone)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public', 'extensions'
AS $function$
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
$function$;

-- Update audit_trail_hash_chain trigger function
CREATE OR REPLACE FUNCTION public.audit_trail_hash_chain()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  last_hash TEXT;
BEGIN
  SELECT event_hash INTO last_hash
  FROM public.audit_trail
  ORDER BY created_at DESC
  LIMIT 1;
  
  NEW.previous_hash := last_hash;
  
  NEW.event_hash := public.compute_audit_hash(
    NEW.event_type, NEW.entity_type, NEW.entity_id, NEW.user_id,
    NEW.action, NEW.details, NEW.previous_hash, NEW.created_at
  );
  
  RETURN NEW;
END;
$function$;
