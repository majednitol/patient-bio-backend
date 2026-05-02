
-- Add tags column to researcher_study_notes
ALTER TABLE public.researcher_study_notes
ADD COLUMN tags text[] NOT NULL DEFAULT '{}';

-- Add index for tag-based filtering
CREATE INDEX idx_researcher_study_notes_tags ON public.researcher_study_notes USING GIN(tags);
