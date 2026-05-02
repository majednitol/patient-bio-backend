
CREATE OR REPLACE FUNCTION public.compute_audit_merkle_block(
  p_block_start bigint,
  p_block_end bigint
)
  RETURNS text
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_hashes text[] := '{}';
  v_first_prev text;
  v_last_hash text;
  v_count integer := 0;
  v_merkle text;
  v_level text[];
  v_next_level text[];
  v_i integer;
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT event_hash, previous_hash, block_number
    FROM public.audit_trail
    WHERE block_number >= p_block_start AND block_number <= p_block_end
    ORDER BY block_number ASC, created_at ASC, id ASC
  LOOP
    v_hashes := array_append(v_hashes, rec.event_hash);
    IF v_count = 0 THEN
      v_first_prev := rec.previous_hash;
    END IF;
    v_last_hash := rec.event_hash;
    v_count := v_count + 1;
  END LOOP;

  IF v_count = 0 THEN
    RETURN NULL;
  END IF;

  -- Build Merkle tree bottom-up
  v_level := v_hashes;
  WHILE array_length(v_level, 1) > 1 LOOP
    v_next_level := '{}';
    v_i := 1;
    WHILE v_i <= array_length(v_level, 1) LOOP
      IF v_i + 1 <= array_length(v_level, 1) THEN
        v_next_level := array_append(v_next_level,
          encode(digest(v_level[v_i] || v_level[v_i + 1], 'sha256'), 'hex'));
        v_i := v_i + 2;
      ELSE
        v_next_level := array_append(v_next_level, v_level[v_i]);
        v_i := v_i + 1;
      END IF;
    END LOOP;
    v_level := v_next_level;
  END LOOP;

  v_merkle := v_level[1];

  INSERT INTO public.audit_merkle_blocks
    (block_start, block_end, merkle_root, first_previous_hash, last_event_hash, entry_count)
  VALUES (p_block_start, p_block_end, v_merkle, v_first_prev, v_last_hash, v_count)
  ON CONFLICT (block_start, block_end) DO UPDATE SET
    merkle_root = EXCLUDED.merkle_root,
    first_previous_hash = EXCLUDED.first_previous_hash,
    last_event_hash = EXCLUDED.last_event_hash,
    entry_count = EXCLUDED.entry_count,
    computed_at = now();

  RETURN v_merkle;
END;
$function$;
