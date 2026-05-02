
-- 1. Add quality_score column to anonymous_health_contributions
ALTER TABLE public.anonymous_health_contributions
ADD COLUMN quality_score integer DEFAULT NULL;

-- 2. Recreate anonymous_pool_view to include quality_score
DROP VIEW IF EXISTS public.anonymous_pool_view;
CREATE VIEW public.anonymous_pool_view WITH (security_invoker = false) AS
SELECT
  id,
  contribution_hash,
  anonymized_data,
  data_categories,
  disease_categories,
  age_range,
  gender,
  source_jurisdiction,
  govt_approval_status,
  contributed_at,
  quality_score
FROM public.anonymous_health_contributions
WHERE is_active = true
  AND govt_approval_status IN ('not_required', 'approved');

-- 3. Create researcher_thank_you_messages table
CREATE TABLE public.researcher_thank_you_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contribution_id uuid NOT NULL REFERENCES public.anonymous_health_contributions(id) ON DELETE CASCADE,
  researcher_id uuid NOT NULL,
  message_template text NOT NULL,
  custom_text text CHECK (char_length(custom_text) <= 200),
  study_area text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.researcher_thank_you_messages ENABLE ROW LEVEL SECURITY;

-- Patients can read messages for their own contributions
CREATE POLICY "Patients read own contribution messages"
ON public.researcher_thank_you_messages
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.anonymous_health_contributions c
    WHERE c.id = contribution_id AND c.patient_id = auth.uid()
  )
);

-- Researchers can insert messages
CREATE POLICY "Researchers can send thank you messages"
ON public.researcher_thank_you_messages
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'researcher')
  AND researcher_id = auth.uid()
);

-- 4. Create contribution_schedules table
CREATE TABLE public.contribution_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  categories text[] NOT NULL,
  jurisdiction text NOT NULL DEFAULT 'BD',
  cadence text NOT NULL CHECK (cadence IN ('weekly', 'monthly', 'quarterly')),
  next_run_at timestamptz NOT NULL,
  is_paused boolean NOT NULL DEFAULT false,
  last_contribution_id uuid REFERENCES public.anonymous_health_contributions(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.contribution_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Patients manage own schedules"
ON public.contribution_schedules
FOR ALL
TO authenticated
USING (patient_id = auth.uid())
WITH CHECK (patient_id = auth.uid());

CREATE TRIGGER update_contribution_schedules_updated_at
BEFORE UPDATE ON public.contribution_schedules
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
