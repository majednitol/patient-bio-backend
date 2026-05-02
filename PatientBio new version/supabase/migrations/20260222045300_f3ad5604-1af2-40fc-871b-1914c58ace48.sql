
-- Table to store the last verified checkpoint
CREATE TABLE public.audit_verification_checkpoints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  verified_up_to_block bigint NOT NULL,
  last_event_hash text NOT NULL,
  total_verified bigint NOT NULL DEFAULT 0,
  broken_found bigint NOT NULL DEFAULT 0,
  verified_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_verification_checkpoints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read checkpoints"
  ON public.audit_verification_checkpoints FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Index for fast latest-checkpoint lookup
CREATE INDEX idx_audit_checkpoints_verified_at ON public.audit_verification_checkpoints (verified_at DESC);

-- Incremental verification function
CREATE OR REPLACE FUNCTION public.verify_audit_trail_incremental()
  RETURNS TABLE(
    total_new_entries bigint,
    verified_entries bigint,
    broken_chain_count bigint,
    integrity_percentage numeric,
    checkpoint_block bigint,
    is_incremental boolean
  )
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_start_block BIGINT := 0;
  v_prev_hash TEXT := 'GENESIS_0000000000000000000000000000000000000000000000000000000000000000';
  v_max_block BIGINT;
  rec RECORD;
  v_total BIGINT := 0;
  v_verified BIGINT := 0;
  v_broken BIGINT := 0;
  v_last_hash TEXT;
  v_incremental BOOLEAN := false;
BEGIN
  -- Get latest checkpoint
  SELECT verified_up_to_block, last_event_hash
    INTO v_start_block, v_prev_hash
  FROM public.audit_verification_checkpoints
  ORDER BY verified_at DESC
  LIMIT 1;

  IF v_start_block IS NOT NULL THEN
    v_incremental := true;
  ELSE
    v_start_block := 0;
    v_prev_hash := 'GENESIS_0000000000000000000000000000000000000000000000000000000000000000';
  END IF;

  v_last_hash := v_prev_hash;

  -- Verify only entries after checkpoint
  FOR rec IN
    SELECT a.id, a.event_type, a.entity_type, a.entity_id, a.user_id,
           a.action, a.details, a.previous_hash, a.event_hash, a.created_at, a.block_number
    FROM public.audit_trail a
    WHERE a.block_number > v_start_block
    ORDER BY a.created_at ASC, a.id ASC
  LOOP
    v_total := v_total + 1;

    -- Compute expected hash
    IF rec.previous_hash = v_prev_hash AND rec.event_hash = public.compute_audit_hash(
        rec.event_type, rec.entity_type, rec.entity_id, rec.user_id,
        rec.action, rec.details, rec.previous_hash, rec.created_at
    ) THEN
      v_verified := v_verified + 1;
    ELSE
      v_broken := v_broken + 1;
    END IF;

    v_prev_hash := rec.event_hash;
    v_max_block := rec.block_number;
  END LOOP;

  v_last_hash := v_prev_hash;

  -- Save checkpoint if we verified anything and no breaks
  IF v_total > 0 AND v_broken = 0 AND v_max_block IS NOT NULL THEN
    INSERT INTO public.audit_verification_checkpoints
      (verified_up_to_block, last_event_hash, total_verified, broken_found)
    VALUES (v_max_block, v_last_hash, v_total, 0);
  END IF;

  RETURN QUERY SELECT
    v_total,
    v_verified,
    v_broken,
    CASE WHEN v_total > 0
      THEN ROUND((v_verified::NUMERIC / v_total::NUMERIC) * 100, 2)
      ELSE 100.00
    END,
    COALESCE(v_max_block, v_start_block),
    v_incremental;
END;
$function$;
