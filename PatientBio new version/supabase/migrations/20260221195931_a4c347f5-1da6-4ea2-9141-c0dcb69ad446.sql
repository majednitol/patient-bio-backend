
-- Repair function: walks through all blockchain transactions in chronological order
-- and fixes the previous_hash chain
CREATE OR REPLACE FUNCTION public.repair_blockchain_chain()
RETURNS TABLE(total_records bigint, repaired_records bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_rec RECORD;
  v_prev_hash TEXT := 'GENESIS_0000000000000000000000000000000000000000000000000000000000000000';
  v_new_data_hash TEXT;
  v_hash_input TEXT;
  v_total BIGINT := 0;
  v_repaired BIGINT := 0;
BEGIN
  FOR v_rec IN
    SELECT id, transaction_type, actor_id, target_resource_type, target_resource_id,
           data_hash, previous_hash, metadata, created_at
    FROM public.blockchain_transactions
    ORDER BY created_at ASC, id ASC
    FOR UPDATE
  LOOP
    v_total := v_total + 1;

    -- Recompute hash with correct previous_hash
    v_hash_input := v_rec.transaction_type::TEXT || '|' ||
                    v_rec.actor_id::TEXT || '|' ||
                    COALESCE(v_rec.target_resource_type, 'NULL') || '|' ||
                    COALESCE(v_rec.target_resource_id::TEXT, 'NULL') || '|' ||
                    v_prev_hash || '|' ||
                    v_rec.metadata::TEXT || '|' ||
                    v_rec.created_at::TEXT;

    v_new_data_hash := encode(digest(v_hash_input, 'sha256'), 'hex');

    -- Update if chain is broken
    IF v_rec.previous_hash IS DISTINCT FROM v_prev_hash OR v_rec.data_hash IS DISTINCT FROM v_new_data_hash THEN
      UPDATE public.blockchain_transactions
      SET previous_hash = v_prev_hash,
          data_hash = v_new_data_hash
      WHERE id = v_rec.id;
      v_repaired := v_repaired + 1;
    END IF;

    v_prev_hash := v_new_data_hash;
  END LOOP;

  RETURN QUERY SELECT v_total, v_repaired;
END;
$$;

-- Run the repair
SELECT * FROM public.repair_blockchain_chain();

-- Now fix the record_blockchain_transaction function to use row locking
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
AS $$
DECLARE
  v_previous_hash TEXT;
  v_data_hash TEXT;
  v_hash_input TEXT;
  v_transaction_id UUID;
BEGIN
  -- Use FOR UPDATE to lock the last row and prevent concurrent chain breaks
  SELECT data_hash INTO v_previous_hash
  FROM public.blockchain_transactions
  ORDER BY created_at DESC, id DESC
  LIMIT 1
  FOR UPDATE;

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
    transaction_type, actor_id, target_resource_type, target_resource_id,
    data_hash, previous_hash, metadata
  ) VALUES (
    p_transaction_type, p_actor_id, p_target_resource_type, p_target_resource_id,
    v_data_hash, v_previous_hash, p_metadata
  ) RETURNING id INTO v_transaction_id;

  RETURN v_transaction_id;
END;
$$;
