ALTER TABLE public.researcher_study_notes 
  ADD COLUMN IF NOT EXISTS data_references jsonb DEFAULT '[]'::jsonb;