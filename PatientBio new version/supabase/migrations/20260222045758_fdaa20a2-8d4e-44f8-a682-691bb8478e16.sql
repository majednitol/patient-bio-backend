
CREATE OR REPLACE FUNCTION public.verify_audit_parallel(
  p_block_size integer DEFAULT 100
)
  RETURNS TABLE(
    total_blocks integer,
    valid_blocks integer,
    invalid_blocks integer,
    inter_block_valid boolean,
    broken_block_ranges text[],
    broken_inter_links text[],
    overall_valid boolean
  )
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_max_block bigint;
  v_start bigint;
  v_end bigint;
  v_total integer := 0;
  v_valid integer := 0;
  v_invalid integer := 0;
  v_broken_ranges text[] := '{}';
  v_broken_links text[] := '{}';
  v_current_merkle text;
  v_stored_merkle text;
  v_stored_first_prev text;
  v_stored_last_hash text;
  v_prev_last_hash text;
  v_inter_valid boolean := true;
BEGIN
  SELECT COALESCE(MAX(block_number), 0) INTO v_max_block FROM public.audit_trail;

  IF v_max_block = 0 THEN
    RETURN QUERY SELECT 0, 0, 0, true, '{}'::text[], '{}'::text[], true;
    RETURN;
  END IF;

  v_start := 1;
  v_prev_last_hash := NULL;

  WHILE v_start <= v_max_block LOOP
    v_end := LEAST(v_start + p_block_size - 1, v_max_block);
    v_total := v_total + 1;

    -- Compute fresh Merkle root (also upserts into audit_merkle_blocks)
    v_current_merkle := public.compute_audit_merkle_block(v_start, v_end);

    -- Read back stored checkpoint
    SELECT merkle_root, first_previous_hash, last_event_hash
      INTO v_stored_merkle, v_stored_first_prev, v_stored_last_hash
    FROM public.audit_merkle_blocks
    WHERE block_start = v_start AND block_end = v_end;

    IF v_current_merkle IS NOT NULL THEN
      v_valid := v_valid + 1;

      -- Check inter-block link
      IF v_prev_last_hash IS NOT NULL AND v_stored_first_prev IS DISTINCT FROM v_prev_last_hash THEN
        v_inter_valid := false;
        v_broken_links := array_append(v_broken_links,
          'Block ' || v_start || '-' || v_end || ': expected prev=' || LEFT(v_prev_last_hash, 16) || '...');
      END IF;

      v_prev_last_hash := v_stored_last_hash;
    ELSE
      v_invalid := v_invalid + 1;
      v_broken_ranges := array_append(v_broken_ranges, v_start || '-' || v_end);
    END IF;

    v_start := v_end + 1;
  END LOOP;

  RETURN QUERY SELECT
    v_total,
    v_valid,
    v_invalid,
    v_inter_valid,
    v_broken_ranges,
    v_broken_links,
    (v_invalid = 0 AND v_inter_valid);
END;
$function$;
