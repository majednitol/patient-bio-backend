-- Saved datasets for researchers
CREATE TABLE public.researcher_saved_datasets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  researcher_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  filter_config JSONB NOT NULL DEFAULT '{}',
  record_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.researcher_saved_datasets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Researchers can view own datasets"
  ON public.researcher_saved_datasets FOR SELECT
  USING (auth.uid() = researcher_id);

CREATE POLICY "Researchers can create own datasets"
  ON public.researcher_saved_datasets FOR INSERT
  WITH CHECK (auth.uid() = researcher_id);

CREATE POLICY "Researchers can update own datasets"
  ON public.researcher_saved_datasets FOR UPDATE
  USING (auth.uid() = researcher_id);

CREATE POLICY "Researchers can delete own datasets"
  ON public.researcher_saved_datasets FOR DELETE
  USING (auth.uid() = researcher_id);

CREATE TRIGGER update_researcher_saved_datasets_updated_at
  BEFORE UPDATE ON public.researcher_saved_datasets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
