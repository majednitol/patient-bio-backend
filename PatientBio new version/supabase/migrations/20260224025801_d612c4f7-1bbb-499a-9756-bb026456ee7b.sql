
-- Research Collaboration: Threads
CREATE TABLE public.researcher_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  study_id UUID REFERENCES public.researcher_studies(id) ON DELETE CASCADE NOT NULL,
  created_by UUID NOT NULL,
  title TEXT NOT NULL,
  linked_share_id UUID,
  linked_milestone_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Research Collaboration: Thread Messages
CREATE TABLE public.researcher_thread_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID REFERENCES public.researcher_threads(id) ON DELETE CASCADE NOT NULL,
  author_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.researcher_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.researcher_thread_messages ENABLE ROW LEVEL SECURITY;

-- RLS: Researchers can manage their own threads
CREATE POLICY "Researchers can view threads for their studies"
  ON public.researcher_threads FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'researcher'));

CREATE POLICY "Researchers can create threads"
  ON public.researcher_threads FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by AND public.has_role(auth.uid(), 'researcher'));

CREATE POLICY "Researchers can update own threads"
  ON public.researcher_threads FOR UPDATE TO authenticated
  USING (auth.uid() = created_by);

CREATE POLICY "Researchers can delete own threads"
  ON public.researcher_threads FOR DELETE TO authenticated
  USING (auth.uid() = created_by);

-- RLS: Thread messages
CREATE POLICY "Researchers can view thread messages"
  ON public.researcher_thread_messages FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'researcher'));

CREATE POLICY "Researchers can create messages"
  ON public.researcher_thread_messages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = author_id AND public.has_role(auth.uid(), 'researcher'));

CREATE POLICY "Researchers can delete own messages"
  ON public.researcher_thread_messages FOR DELETE TO authenticated
  USING (auth.uid() = author_id);

-- Timestamps trigger
CREATE TRIGGER update_researcher_threads_updated_at
  BEFORE UPDATE ON public.researcher_threads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.researcher_thread_messages;
