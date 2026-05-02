
CREATE OR REPLACE FUNCTION public.record_blockchain_transaction(
  p_transaction_type blockchain_transaction_type,
  p_actor_id uuid,
  p_target_resource_type text DEFAULT NULL,
  p_target_resource_id uuid DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
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
  v_block_number BIGINT;
BEGIN
  SELECT data_hash, COALESCE(block_number, 0)
  INTO v_previous_hash, v_block_number
  FROM public.blockchain_transactions
  ORDER BY created_at DESC, id DESC
  LIMIT 1
  FOR UPDATE;

  IF v_previous_hash IS NULL THEN
    v_previous_hash := 'GENESIS_0000000000000000000000000000000000000000000000000000000000000000';
    v_block_number := 0;
  END IF;

  v_block_number := v_block_number + 1;

  v_hash_input := p_transaction_type::TEXT || '|' ||
                  p_actor_id::TEXT || '|' ||
                  COALESCE(p_target_resource_type, 'NULL') || '|' ||
                  COALESCE(p_target_resource_id::TEXT, 'NULL') || '|' ||
                  v_previous_hash || '|' ||
                  p_metadata::TEXT || '|' ||
                  now()::TEXT;

  v_data_hash := encode(digest(v_hash_input, 'sha256'), 'hex');

  INSERT INTO public.blockchain_transactions (
    transaction_type, actor_id, target_resource_type, target_resource_id,
    data_hash, previous_hash, metadata, block_number, is_verified
  ) VALUES (
    p_transaction_type, p_actor_id, p_target_resource_type, p_target_resource_id,
    v_data_hash, v_previous_hash, p_metadata, v_block_number, true
  ) RETURNING id INTO v_transaction_id;

  RETURN v_transaction_id;
END;
$function$;

-- Also backfill existing transactions: set block_number and is_verified
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC, id ASC) AS rn
  FROM public.blockchain_transactions
  WHERE block_number IS NULL
)
UPDATE public.blockchain_transactions bt
SET block_number = numbered.rn,
    is_verified = true
FROM numbered
WHERE bt.id = numbered.id;
