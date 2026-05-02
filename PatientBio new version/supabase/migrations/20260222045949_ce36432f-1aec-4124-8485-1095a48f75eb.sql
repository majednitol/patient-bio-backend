
CREATE TABLE IF NOT EXISTS public.audit_merkle_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  block_start bigint NOT NULL,
  block_end bigint NOT NULL,
  merkle_root text NOT NULL,
  first_previous_hash text NOT NULL,
  last_event_hash text NOT NULL,
  entry_count integer NOT NULL,
  computed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(block_start, block_end)
);

ALTER TABLE public.audit_merkle_blocks ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'audit_merkle_blocks' AND policyname = 'Admins can read merkle blocks'
  ) THEN
    CREATE POLICY "Admins can read merkle blocks"
      ON public.audit_merkle_blocks FOR SELECT
      USING (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_audit_merkle_blocks_range ON public.audit_merkle_blocks (block_start, block_end);
