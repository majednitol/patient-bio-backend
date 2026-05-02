
-- Version history table for study notes
CREATE TABLE public.researcher_study_note_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  note_id UUID NOT NULL REFERENCES public.researcher_study_notes(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL DEFAULT 1,
  title TEXT NOT NULL,
  content TEXT,
  methodology TEXT,
  findings TEXT,
  tags TEXT[] DEFAULT '{}',
  publication_status TEXT,
  changed_by UUID NOT NULL,
  change_summary TEXT,
  snapshot JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX idx_study_note_versions_note_id ON public.researcher_study_note_versions(note_id, version_number DESC);

-- Enable RLS
ALTER TABLE public.researcher_study_note_versions ENABLE ROW LEVEL SECURITY;

-- Researchers can view versions of their own notes
CREATE POLICY "Researchers can view own note versions"
  ON public.researcher_study_note_versions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.researcher_study_notes n
      WHERE n.id = note_id AND n.researcher_id = auth.uid()
    )
  );

-- Only system (trigger) inserts versions, but allow researchers to insert for their own notes
CREATE POLICY "Researchers can insert own note versions"
  ON public.researcher_study_note_versions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.researcher_study_notes n
      WHERE n.id = note_id AND n.researcher_id = auth.uid()
    )
  );

-- Trigger function to auto-capture version on update
CREATE OR REPLACE FUNCTION public.capture_study_note_version()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  v_version INTEGER;
BEGIN
  -- Get next version number
  SELECT COALESCE(MAX(version_number), 0) + 1
  INTO v_version
  FROM public.researcher_study_note_versions
  WHERE note_id = OLD.id;

  -- Save the OLD state as a version
  INSERT INTO public.researcher_study_note_versions (
    note_id, version_number, title, content, methodology, findings,
    tags, publication_status, changed_by, snapshot
  ) VALUES (
    OLD.id, v_version, OLD.title, OLD.content, OLD.methodology, OLD.findings,
    OLD.tags, OLD.publication_status, auth.uid(),
    jsonb_build_object(
      'title', OLD.title,
      'content', OLD.content,
      'methodology', OLD.methodology,
      'findings', OLD.findings,
      'tags', OLD.tags,
      'publication_status', OLD.publication_status,
      'updated_at', OLD.updated_at
    )
  );

  RETURN NEW;
END;
$$;

-- Attach trigger
CREATE TRIGGER trg_capture_study_note_version
  BEFORE UPDATE ON public.researcher_study_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.capture_study_note_version();
