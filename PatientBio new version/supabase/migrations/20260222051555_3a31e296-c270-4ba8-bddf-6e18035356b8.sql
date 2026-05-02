
-- ============================================
-- Improvement #2: Real-Time Chain Break Alerting
-- ============================================

-- Table for chain break alerts
CREATE TABLE public.chain_break_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_id UUID REFERENCES public.blockchain_transactions(id),
  expected_previous_hash TEXT,
  actual_previous_hash TEXT,
  severity TEXT NOT NULL DEFAULT 'critical',
  details JSONB DEFAULT '{}',
  is_resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.chain_break_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view chain break alerts"
  ON public.chain_break_alerts FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update chain break alerts"
  ON public.chain_break_alerts FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Enable Realtime for chain break alerts
ALTER PUBLICATION supabase_realtime ADD TABLE public.chain_break_alerts;

-- Trigger function to detect chain breaks on INSERT
CREATE OR REPLACE FUNCTION public.detect_chain_break()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_last_hash TEXT;
BEGIN
  -- Get the actual last data_hash before this insert (excluding NEW row)
  SELECT data_hash INTO v_last_hash
  FROM public.blockchain_transactions
  WHERE id != NEW.id
  ORDER BY created_at DESC, id DESC
  LIMIT 1;

  -- If there's no previous transaction, the previous_hash should be GENESIS
  IF v_last_hash IS NULL THEN
    IF NEW.previous_hash NOT LIKE 'GENESIS%' AND NEW.previous_hash IS NOT NULL THEN
      INSERT INTO public.chain_break_alerts (transaction_id, expected_previous_hash, actual_previous_hash, severity, details)
      VALUES (NEW.id, 'GENESIS...', NEW.previous_hash, 'critical',
        jsonb_build_object('transaction_type', NEW.transaction_type, 'actor_id', NEW.actor_id, 'detected_at', now()));
    END IF;
  ELSE
    IF NEW.previous_hash IS DISTINCT FROM v_last_hash THEN
      INSERT INTO public.chain_break_alerts (transaction_id, expected_previous_hash, actual_previous_hash, severity, details)
      VALUES (NEW.id, v_last_hash, NEW.previous_hash, 'critical',
        jsonb_build_object('transaction_type', NEW.transaction_type, 'actor_id', NEW.actor_id, 'detected_at', now()));
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_detect_chain_break
  AFTER INSERT ON public.blockchain_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.detect_chain_break();

-- ============================================
-- Improvement #3: Cross-Chain Consistency Verification
-- ============================================

CREATE OR REPLACE FUNCTION public.verify_cross_chain_consistency()
RETURNS TABLE(
  total_blockchain BIGINT,
  total_audit BIGINT,
  matched BIGINT,
  blockchain_only BIGINT,
  audit_only BIGINT,
  consistency_percentage NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_bc_total BIGINT;
  v_audit_total BIGINT;
  v_matched BIGINT;
BEGIN
  SELECT COUNT(*) INTO v_bc_total FROM public.blockchain_transactions;
  SELECT COUNT(*) INTO v_audit_total FROM public.audit_trail;

  -- Match on target_resource_id = entity_id AND actor_id = user_id within a 5-second window
  SELECT COUNT(*) INTO v_matched
  FROM public.blockchain_transactions bt
  INNER JOIN public.audit_trail at2
    ON bt.target_resource_id::TEXT = at2.entity_id::TEXT
    AND bt.actor_id = at2.user_id
    AND ABS(EXTRACT(EPOCH FROM (bt.created_at - at2.created_at))) < 5;

  RETURN QUERY SELECT
    v_bc_total,
    v_audit_total,
    v_matched,
    v_bc_total - v_matched,
    v_audit_total - v_matched,
    CASE WHEN (v_bc_total + v_audit_total) > 0
      THEN ROUND((v_matched * 2.0 / (v_bc_total + v_audit_total)) * 100, 2)
      ELSE 100.00
    END;
END;
$$;

-- ============================================
-- Improvement #4: Batch Transaction Recording
-- ============================================

CREATE OR REPLACE FUNCTION public.record_blockchain_transaction_batch(p_transactions JSONB)
RETURNS TABLE(transaction_ids UUID[])
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_previous_hash TEXT;
  v_data_hash TEXT;
  v_hash_input TEXT;
  v_tx JSONB;
  v_ids UUID[] := '{}';
  v_new_id UUID;
BEGIN
  -- Lock once for the entire batch
  SELECT data_hash INTO v_previous_hash
  FROM public.blockchain_transactions
  ORDER BY created_at DESC, id DESC
  LIMIT 1
  FOR UPDATE;

  IF v_previous_hash IS NULL THEN
    v_previous_hash := 'GENESIS_0000000000000000000000000000000000000000000000000000000000000000';
  END IF;

  FOR v_tx IN SELECT * FROM jsonb_array_elements(p_transactions)
  LOOP
    v_hash_input := (v_tx->>'transaction_type') || '|' ||
                    (v_tx->>'actor_id') || '|' ||
                    COALESCE(v_tx->>'target_resource_type', 'NULL') || '|' ||
                    COALESCE(v_tx->>'target_resource_id', 'NULL') || '|' ||
                    v_previous_hash || '|' ||
                    COALESCE(v_tx->'metadata', '{}')::TEXT || '|' ||
                    now()::TEXT;

    v_data_hash := encode(digest(v_hash_input, 'sha256'), 'hex');

    INSERT INTO public.blockchain_transactions (
      transaction_type, actor_id, target_resource_type, target_resource_id,
      data_hash, previous_hash, metadata
    ) VALUES (
      (v_tx->>'transaction_type')::blockchain_transaction_type,
      (v_tx->>'actor_id')::UUID,
      v_tx->>'target_resource_type',
      CASE WHEN v_tx->>'target_resource_id' IS NOT NULL THEN (v_tx->>'target_resource_id')::UUID ELSE NULL END,
      v_data_hash,
      v_previous_hash,
      COALESCE(v_tx->'metadata', '{}')
    ) RETURNING id INTO v_new_id;

    v_ids := array_append(v_ids, v_new_id);
    v_previous_hash := v_data_hash;
  END LOOP;

  RETURN QUERY SELECT v_ids;
END;
$$;
