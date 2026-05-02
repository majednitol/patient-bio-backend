
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
  v_signature TEXT;
  v_merkle_root TEXT;
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

  -- Generate signature: HMAC of data_hash with actor context
  v_signature := encode(digest(v_data_hash || '|' || p_actor_id::TEXT || '|' || now()::TEXT, 'sha256'), 'hex');

  -- Generate merkle root: hash of (previous_hash + data_hash)
  v_merkle_root := encode(digest(v_previous_hash || v_data_hash, 'sha256'), 'hex');

  INSERT INTO public.blockchain_transactions (
    transaction_type, actor_id, target_resource_type, target_resource_id,
    data_hash, previous_hash, metadata, block_number, is_verified, signature, merkle_root
  ) VALUES (
    p_transaction_type, p_actor_id, p_target_resource_type, p_target_resource_id,
    v_data_hash, v_previous_hash, p_metadata, v_block_number, true, v_signature, v_merkle_root
  ) RETURNING id INTO v_transaction_id;

  RETURN v_transaction_id;
END;
$function$;

-- Backfill existing transactions missing signature/merkle_root
UPDATE public.blockchain_transactions
SET signature = encode(digest(data_hash || '|' || actor_id::TEXT || '|' || created_at::TEXT, 'sha256'), 'hex'),
    merkle_root = encode(digest(COALESCE(previous_hash, 'GENESIS') || data_hash, 'sha256'), 'hex')
WHERE signature IS NULL OR merkle_root IS NULL;
