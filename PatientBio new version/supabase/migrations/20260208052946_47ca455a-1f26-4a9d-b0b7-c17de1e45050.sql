-- Create researcher_study_notes table for tracking research findings
CREATE TABLE public.researcher_study_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  researcher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  study_title TEXT NOT NULL,
  methodology TEXT,
  findings TEXT,
  sample_size INTEGER,
  is_published BOOLEAN DEFAULT false,
  publication_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.researcher_study_notes ENABLE ROW LEVEL SECURITY;

-- RLS: Researchers manage their own study notes
CREATE POLICY "Researchers can manage own study notes"
  ON public.researcher_study_notes FOR ALL
  TO authenticated
  USING (researcher_id = auth.uid())
  WITH CHECK (researcher_id = auth.uid());

-- Index for faster lookups
CREATE INDEX idx_researcher_study_notes_researcher 
  ON public.researcher_study_notes(researcher_id);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_researcher_study_notes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_researcher_study_notes_updated_at
BEFORE UPDATE ON public.researcher_study_notes
FOR EACH ROW
EXECUTE FUNCTION public.update_researcher_study_notes_updated_at();