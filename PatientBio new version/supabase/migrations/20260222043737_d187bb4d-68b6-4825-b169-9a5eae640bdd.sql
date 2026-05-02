
-- Fix race condition in add_audit_entry() by adding FOR UPDATE locking
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
BEGIN
  -- Lock the latest row to prevent concurrent transactions from reading the same previous_hash
  SELECT event_hash INTO v_previous_hash
  FROM public.audit_trail
  ORDER BY created_at DESC, id DESC
  LIMIT 1
  FOR UPDATE;
  
  IF v_previous_hash IS NULL THEN
    v_previous_hash := 'GENESIS_0000000000000000000000000000000000000000000000000000000000000000';
  END IF;
  
  v_event_hash := public.compute_audit_hash(
    p_event_type,
    p_entity_type,
    p_entity_id,
    p_user_id,
    p_action,
    p_details,
    v_previous_hash,
    now()
  );
  
  INSERT INTO public.audit_trail (
    event_type, entity_type, entity_id, user_id, action, details, previous_hash, event_hash
  ) VALUES (
    p_event_type, p_entity_type, p_entity_id, p_user_id, p_action, p_details, v_previous_hash, v_event_hash
  ) RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$function$;

-- Fix the same race condition in audit_trail_hash_chain() trigger
CREATE OR REPLACE FUNCTION public.audit_trail_hash_chain()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  last_hash TEXT;
BEGIN
  -- Lock the latest row to serialize concurrent inserts
  SELECT event_hash INTO last_hash
  FROM public.audit_trail
  ORDER BY created_at DESC, id DESC
  LIMIT 1
  FOR UPDATE;
  
  NEW.previous_hash := last_hash;
  
  NEW.event_hash := public.compute_audit_hash(
    NEW.event_type, NEW.entity_type, NEW.entity_id, NEW.user_id,
    NEW.action, NEW.details, NEW.previous_hash, NEW.created_at
  );
  
  RETURN NEW;
END;
$function$;
