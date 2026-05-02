
CREATE TABLE public.researcher_saved_charts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  researcher_id UUID NOT NULL,
  name TEXT NOT NULL,
  chart_type TEXT NOT NULL,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.researcher_saved_charts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Researchers can view own charts" ON public.researcher_saved_charts
  FOR SELECT USING (auth.uid() = researcher_id);

CREATE POLICY "Researchers can insert own charts" ON public.researcher_saved_charts
  FOR INSERT WITH CHECK (auth.uid() = researcher_id);

CREATE POLICY "Researchers can delete own charts" ON public.researcher_saved_charts
  FOR DELETE USING (auth.uid() = researcher_id);
