
-- Create contribution_access_log table for tracking researcher access to contributions
CREATE TABLE public.contribution_access_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contribution_id uuid NOT NULL REFERENCES public.anonymous_health_contributions(id) ON DELETE CASCADE,
  researcher_id uuid NOT NULL,
  query_context text,
  accessed_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.contribution_access_log ENABLE ROW LEVEL SECURITY;

-- Patients can read access logs for their own contributions
CREATE POLICY "Patients can view their contribution access logs"
  ON public.contribution_access_log
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.anonymous_health_contributions c
      WHERE c.id = contribution_id AND c.patient_id = auth.uid()
    )
  );

-- Researchers can insert access log entries
CREATE POLICY "Researchers can log contribution access"
  ON public.contribution_access_log
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'researcher')
  );

-- Enable realtime for live usage counter updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.contribution_access_log;
