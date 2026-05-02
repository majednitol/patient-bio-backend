
-- Backfill block_number for all existing audit_trail entries
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC, id ASC) AS rn
  FROM public.audit_trail
)
UPDATE public.audit_trail
SET block_number = numbered.rn
FROM numbered
WHERE audit_trail.id = numbered.id;

-- Update add_audit_entry() to assign sequential block_number
CREATE OR REPLACE FUNCTION public.add_audit_entry(p_event_type text, p_entity_type text, p_entity_id uuid, p_user_id uuid, p_action text, p_details jsonb DEFAULT '{}'::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_previous_hash TEXT;
  v_event_hash TEXT;
  v_block_number BIGINT;
  v_id UUID;
BEGIN
  -- Lock the latest row to prevent concurrent race conditions
  SELECT event_hash, block_number INTO v_previous_hash, v_block_number
  FROM public.audit_trail
  ORDER BY created_at DESC, id DESC
  LIMIT 1
  FOR UPDATE;
  
  IF v_previous_hash IS NULL THEN
    v_previous_hash := 'GENESIS_0000000000000000000000000000000000000000000000000000000000000000';
    v_block_number := 0;
  END IF;
  
  v_block_number := v_block_number + 1;
  
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
    event_type, entity_type, entity_id, user_id, action, details, previous_hash, event_hash, block_number
  ) VALUES (
    p_event_type, p_entity_type, p_entity_id, p_user_id, p_action, p_details, v_previous_hash, v_event_hash, v_block_number
  ) RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$function$;

-- Update audit_trail_hash_chain() trigger to also assign block_number
CREATE OR REPLACE FUNCTION public.audit_trail_hash_chain()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  last_hash TEXT;
  last_block BIGINT;
BEGIN
  -- Lock the latest row to serialize concurrent inserts
  SELECT event_hash, block_number INTO last_hash, last_block
  FROM public.audit_trail
  ORDER BY created_at DESC, id DESC
  LIMIT 1
  FOR UPDATE;
  
  NEW.previous_hash := last_hash;
  NEW.block_number := COALESCE(last_block, 0) + 1;
  
  NEW.event_hash := public.compute_audit_hash(
    NEW.event_type, NEW.entity_type, NEW.entity_id, NEW.user_id,
    NEW.action, NEW.details, NEW.previous_hash, NEW.created_at
  );
  
  RETURN NEW;
END;
$function$;

-- Add index on block_number for fast range queries
CREATE INDEX IF NOT EXISTS idx_audit_trail_block_number ON public.audit_trail (block_number);
