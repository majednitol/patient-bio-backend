
-- Create backup_schedules table
CREATE TABLE public.backup_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  tables TEXT[] NOT NULL,
  frequency TEXT NOT NULL CHECK (frequency IN ('6h', '12h', 'daily', 'weekly')),
  export_format TEXT NOT NULL DEFAULT 'json' CHECK (export_format IN ('json', 'csv')),
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  retention_days INTEGER NOT NULL DEFAULT 30,
  created_by UUID NOT NULL,
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create backup_runs table
CREATE TABLE public.backup_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID REFERENCES public.backup_schedules(id) ON DELETE SET NULL,
  run_type TEXT NOT NULL CHECK (run_type IN ('scheduled', 'manual', 'retry')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'success', 'failed')),
  tables_exported TEXT[],
  row_counts JSONB,
  checksum_sha256 TEXT,
  error_message TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  duration_ms INTEGER,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.backup_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backup_runs ENABLE ROW LEVEL SECURITY;

-- RLS policies for backup_schedules (admin only)
CREATE POLICY "Admins can view all backup schedules"
  ON public.backup_schedules FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can create backup schedules"
  ON public.backup_schedules FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update backup schedules"
  ON public.backup_schedules FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete backup schedules"
  ON public.backup_schedules FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS policies for backup_runs (admin only)
CREATE POLICY "Admins can view all backup runs"
  ON public.backup_runs FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can create backup runs"
  ON public.backup_runs FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update backup runs"
  ON public.backup_runs FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Indexes for performance
CREATE INDEX idx_backup_schedules_enabled ON public.backup_schedules(is_enabled) WHERE is_enabled = true;
CREATE INDEX idx_backup_schedules_next_run ON public.backup_schedules(next_run_at) WHERE is_enabled = true;
CREATE INDEX idx_backup_runs_schedule ON public.backup_runs(schedule_id);
CREATE INDEX idx_backup_runs_status ON public.backup_runs(status);
CREATE INDEX idx_backup_runs_started ON public.backup_runs(started_at DESC);

-- Trigger for updated_at on backup_schedules
CREATE TRIGGER update_backup_schedules_updated_at
  BEFORE UPDATE ON public.backup_schedules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
