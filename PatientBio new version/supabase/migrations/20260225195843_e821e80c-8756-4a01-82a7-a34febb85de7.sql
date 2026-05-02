
-- 1. Add primary_domain to researcher_profiles
ALTER TABLE public.researcher_profiles
  ADD COLUMN IF NOT EXISTS primary_domain text DEFAULT NULL;

-- 2. Add research_domains to researcher_studies
ALTER TABLE public.researcher_studies
  ADD COLUMN IF NOT EXISTS research_domains text[] DEFAULT '{}'::text[];

-- 3. Create study_collaborators table
CREATE TABLE public.study_collaborators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  study_id uuid NOT NULL REFERENCES public.researcher_studies(id) ON DELETE CASCADE,
  researcher_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'co_investigator',
  invited_by uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  invited_at timestamptz DEFAULT now(),
  accepted_at timestamptz,
  UNIQUE(study_id, researcher_id)
);

ALTER TABLE public.study_collaborators ENABLE ROW LEVEL SECURITY;

-- Study owner can manage collaborators
CREATE POLICY "Study owner can manage collaborators"
  ON public.study_collaborators FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.researcher_studies
      WHERE id = study_collaborators.study_id
      AND researcher_id = auth.uid()
    )
  );

-- Collaborators can view their invitations
CREATE POLICY "Collaborators can view their invitations"
  ON public.study_collaborators FOR SELECT
  USING (researcher_id = auth.uid());

-- Collaborators can accept/decline their own invitations
CREATE POLICY "Collaborators can update their invitations"
  ON public.study_collaborators FOR UPDATE
  USING (researcher_id = auth.uid())
  WITH CHECK (researcher_id = auth.uid());

-- 4. Create data_use_agreements table
CREATE TABLE public.data_use_agreements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  study_id uuid NOT NULL REFERENCES public.researcher_studies(id) ON DELETE CASCADE,
  researcher_id uuid NOT NULL,
  institution_name text NOT NULL,
  purpose text NOT NULL,
  data_scope jsonb NOT NULL DEFAULT '{}',
  retention_period_days integer NOT NULL DEFAULT 365,
  status text NOT NULL DEFAULT 'draft',
  submitted_at timestamptz,
  approved_at timestamptz,
  approved_by uuid,
  expiry_date timestamptz,
  agreement_hash text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.data_use_agreements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Researchers manage own DUAs"
  ON public.data_use_agreements FOR ALL
  USING (researcher_id = auth.uid());

-- Add updated_at trigger for DUAs
CREATE TRIGGER update_data_use_agreements_updated_at
  BEFORE UPDATE ON public.data_use_agreements
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
