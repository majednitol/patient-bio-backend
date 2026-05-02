-- Record Tags table for Smart Record Tagging (Phase E)
CREATE TABLE public.record_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  record_id UUID NOT NULL REFERENCES public.health_records(id) ON DELETE CASCADE,
  tag_name TEXT NOT NULL,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(record_id, tag_name, user_id)
);

-- Index for fast lookups
CREATE INDEX idx_record_tags_user_id ON public.record_tags(user_id);
CREATE INDEX idx_record_tags_record_id ON public.record_tags(record_id);

-- Enable RLS
ALTER TABLE public.record_tags ENABLE ROW LEVEL SECURITY;

-- Users can only view tags on their own records
CREATE POLICY "Users can view their own record tags"
  ON public.record_tags
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can create tags on their own records
CREATE POLICY "Users can create tags on their own records"
  ON public.record_tags
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own tags
CREATE POLICY "Users can delete their own tags"
  ON public.record_tags
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
