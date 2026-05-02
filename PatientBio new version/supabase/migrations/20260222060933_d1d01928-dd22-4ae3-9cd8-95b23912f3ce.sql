
-- Create db_growth_snapshots table
CREATE TABLE public.db_growth_snapshots (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  table_name text NOT NULL,
  row_count bigint NOT NULL,
  captured_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.db_growth_snapshots ENABLE ROW LEVEL SECURITY;

-- Admin read access
CREATE POLICY "Admins can read db growth snapshots"
ON public.db_growth_snapshots
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Admin insert access (for RPC)
CREATE POLICY "Admins can insert db growth snapshots"
ON public.db_growth_snapshots
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Index for efficient queries
CREATE INDEX idx_db_growth_snapshots_captured_at ON public.db_growth_snapshots (captured_at DESC);
CREATE INDEX idx_db_growth_snapshots_table_name ON public.db_growth_snapshots (table_name);

-- RPC to capture current counts
CREATE OR REPLACE FUNCTION public.capture_db_growth_snapshot()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_tables text[] := ARRAY['user_profiles', 'health_records', 'appointments', 'prescriptions', 'access_logs', 'audit_trail', 'blockchain_transactions', 'consent_records'];
  v_table text;
  v_count bigint;
BEGIN
  FOREACH v_table IN ARRAY v_tables LOOP
    EXECUTE format('SELECT COUNT(*) FROM public.%I', v_table) INTO v_count;
    INSERT INTO public.db_growth_snapshots (table_name, row_count) VALUES (v_table, v_count);
  END LOOP;
END;
$$;
