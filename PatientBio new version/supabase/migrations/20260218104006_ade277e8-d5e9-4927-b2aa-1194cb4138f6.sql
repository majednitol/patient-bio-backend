
-- 1. Add is_shared and publication_status columns to researcher_study_notes
ALTER TABLE public.researcher_study_notes 
ADD COLUMN is_shared BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.researcher_study_notes 
ADD COLUMN publication_status TEXT NOT NULL DEFAULT 'draft'
CHECK (publication_status IN ('draft', 'submitted', 'under_review', 'accepted', 'published'));

-- 2. Create researcher_note_comments table
CREATE TABLE public.researcher_note_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id UUID NOT NULL REFERENCES public.researcher_study_notes(id) ON DELETE CASCADE,
  researcher_id UUID NOT NULL,
  comment_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.researcher_note_comments ENABLE ROW LEVEL SECURITY;

-- Comment owner can manage their own comments
CREATE POLICY "Researchers can insert own comments"
ON public.researcher_note_comments FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = researcher_id);

CREATE POLICY "Researchers can delete own comments"
ON public.researcher_note_comments FOR DELETE
TO authenticated
USING (auth.uid() = researcher_id);

-- Can view comments on notes they own or shared notes
CREATE POLICY "Researchers can view comments on accessible notes"
ON public.researcher_note_comments FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.researcher_study_notes n
    WHERE n.id = note_id
    AND (n.researcher_id = auth.uid() OR n.is_shared = true)
  )
);

-- 3. Create researcher_scheduled_reports table
CREATE TABLE public.researcher_scheduled_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  researcher_id UUID NOT NULL,
  frequency TEXT NOT NULL DEFAULT 'weekly' CHECK (frequency IN ('weekly', 'monthly')),
  report_config JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_generated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.researcher_scheduled_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Researchers can manage own scheduled reports"
ON public.researcher_scheduled_reports FOR ALL
TO authenticated
USING (auth.uid() = researcher_id)
WITH CHECK (auth.uid() = researcher_id);

CREATE TRIGGER update_researcher_scheduled_reports_updated_at
BEFORE UPDATE ON public.researcher_scheduled_reports
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Update RLS for shared notes visibility
CREATE POLICY "Researchers can view shared notes"
ON public.researcher_study_notes FOR SELECT
TO authenticated
USING (researcher_id = auth.uid() OR is_shared = true);
