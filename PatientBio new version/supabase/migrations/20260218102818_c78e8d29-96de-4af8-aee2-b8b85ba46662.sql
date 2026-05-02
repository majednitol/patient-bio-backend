
-- 1. Add share_id column to researcher_study_notes
ALTER TABLE public.researcher_study_notes 
ADD COLUMN share_id UUID REFERENCES public.patient_researcher_shares(id) ON DELETE SET NULL;

CREATE INDEX idx_researcher_study_notes_share_id ON public.researcher_study_notes(share_id);

-- 2. Create researcher_saved_cohorts table
CREATE TABLE public.researcher_saved_cohorts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  researcher_id UUID NOT NULL,
  name TEXT NOT NULL,
  filters JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.researcher_saved_cohorts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Researchers can view own saved cohorts"
ON public.researcher_saved_cohorts FOR SELECT
TO authenticated
USING (auth.uid() = researcher_id);

CREATE POLICY "Researchers can create own saved cohorts"
ON public.researcher_saved_cohorts FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = researcher_id);

CREATE POLICY "Researchers can update own saved cohorts"
ON public.researcher_saved_cohorts FOR UPDATE
TO authenticated
USING (auth.uid() = researcher_id);

CREATE POLICY "Researchers can delete own saved cohorts"
ON public.researcher_saved_cohorts FOR DELETE
TO authenticated
USING (auth.uid() = researcher_id);

CREATE TRIGGER update_researcher_saved_cohorts_updated_at
BEFORE UPDATE ON public.researcher_saved_cohorts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
