
CREATE OR REPLACE FUNCTION public.repair_audit_trail_chain()
 RETURNS TABLE(total_records bigint, repaired_records bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_rec RECORD;
  v_prev_hash TEXT := 'GENESIS_0000000000000000000000000000000000000000000000000000000000000000';
  v_new_event_hash TEXT;
  v_total BIGINT := 0;
  v_repaired BIGINT := 0;
BEGIN
  FOR v_rec IN
    SELECT id, event_type, entity_type, entity_id, user_id, action, details,
           previous_hash, event_hash, created_at
    FROM public.audit_trail
    ORDER BY created_at ASC, id ASC
    FOR UPDATE
  LOOP
    v_total := v_total + 1;

    -- Recompute event_hash using the correct previous_hash
    v_new_event_hash := public.compute_audit_hash(
      v_rec.event_type,
      v_rec.entity_type,
      v_rec.entity_id,
      v_rec.user_id,
      v_rec.action,
      v_rec.details,
      v_prev_hash,
      v_rec.created_at
    );

    -- Update if chain is broken
    IF v_rec.previous_hash IS DISTINCT FROM v_prev_hash OR v_rec.event_hash IS DISTINCT FROM v_new_event_hash THEN
      UPDATE public.audit_trail
      SET previous_hash = v_prev_hash,
          event_hash = v_new_event_hash
      WHERE audit_trail.id = v_rec.id;
      v_repaired := v_repaired + 1;
    END IF;

    v_prev_hash := v_new_event_hash;
  END LOOP;

  RETURN QUERY SELECT v_total, v_repaired;
END;
$$;
