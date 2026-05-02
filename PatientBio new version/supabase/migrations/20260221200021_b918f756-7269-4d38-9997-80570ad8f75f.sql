
-- Fix verify function to use same ordering as repair (with id tiebreaker)
CREATE OR REPLACE FUNCTION public.verify_blockchain_integrity()
RETURNS TABLE(total_transactions bigint, verified_transactions bigint, broken_links bigint, integrity_percentage numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_total BIGINT;
  v_verified BIGINT := 0;
  v_broken BIGINT := 0;
  v_prev_hash TEXT := NULL;
  v_rec RECORD;
BEGIN
  SELECT COUNT(*) INTO v_total FROM public.blockchain_transactions;

  FOR v_rec IN 
    SELECT id, previous_hash, data_hash 
    FROM public.blockchain_transactions 
    ORDER BY created_at ASC, id ASC
  LOOP
    IF v_prev_hash IS NULL THEN
      IF v_rec.previous_hash LIKE 'GENESIS%' OR v_rec.previous_hash IS NULL THEN
        v_verified := v_verified + 1;
      ELSE
        v_broken := v_broken + 1;
      END IF;
    ELSE
      IF v_rec.previous_hash = v_prev_hash THEN
        v_verified := v_verified + 1;
      ELSE
        v_broken := v_broken + 1;
      END IF;
    END IF;
    
    v_prev_hash := v_rec.data_hash;
  END LOOP;

  RETURN QUERY SELECT 
    v_total,
    v_verified,
    v_broken,
    CASE WHEN v_total > 0 
      THEN ROUND((v_verified::NUMERIC / v_total::NUMERIC) * 100, 2)
      ELSE 100.00
    END;
END;
$$;

-- Re-run repair to ensure consistency
SELECT * FROM public.repair_blockchain_chain();
