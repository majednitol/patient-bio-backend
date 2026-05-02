-- Custom report templates for pathologists (beyond built-in templates)
CREATE TABLE public.pathologist_report_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pathologist_id UUID NOT NULL,
  name TEXT NOT NULL,
  category TEXT,
  test_type TEXT,
  template_structure JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS: Pathologists manage their own templates
ALTER TABLE public.pathologist_report_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Pathologists can view own templates"
  ON public.pathologist_report_templates FOR SELECT
  TO authenticated
  USING (pathologist_id = auth.uid());

CREATE POLICY "Pathologists can insert own templates"
  ON public.pathologist_report_templates FOR INSERT
  TO authenticated
  WITH CHECK (pathologist_id = auth.uid());

CREATE POLICY "Pathologists can update own templates"
  ON public.pathologist_report_templates FOR UPDATE
  TO authenticated
  USING (pathologist_id = auth.uid())
  WITH CHECK (pathologist_id = auth.uid());

CREATE POLICY "Pathologists can delete own templates"
  ON public.pathologist_report_templates FOR DELETE
  TO authenticated
  USING (pathologist_id = auth.uid());

-- Index for faster lookups
CREATE INDEX idx_pathologist_templates_pathologist 
  ON public.pathologist_report_templates(pathologist_id);

-- Trigger for updated_at
CREATE TRIGGER update_pathologist_report_templates_updated_at
  BEFORE UPDATE ON public.pathologist_report_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();