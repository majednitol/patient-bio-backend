
-- Patient merge candidates table for duplicate detection
CREATE TABLE public.patient_merge_candidates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id_a UUID NOT NULL,
  patient_id_b UUID NOT NULL,
  confidence_score NUMERIC NOT NULL,
  match_factors JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending',
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  hospital_id UUID REFERENCES public.hospitals(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique constraint to prevent duplicate pairs
CREATE UNIQUE INDEX idx_merge_candidates_pair ON public.patient_merge_candidates (
  LEAST(patient_id_a, patient_id_b), GREATEST(patient_id_a, patient_id_b)
);

CREATE INDEX idx_merge_candidates_status ON public.patient_merge_candidates (status, hospital_id);

ALTER TABLE public.patient_merge_candidates ENABLE ROW LEVEL SECURITY;

-- Hospital admins can read candidates for their hospital
CREATE POLICY "Hospital admins can read merge candidates"
  ON public.patient_merge_candidates FOR SELECT
  USING (
    public.is_hospital_admin(auth.uid(), hospital_id)
    OR public.is_hospital_staff(auth.uid(), hospital_id)
  );

-- Hospital admins can update (review/dismiss/merge)
CREATE POLICY "Hospital admins can update merge candidates"
  ON public.patient_merge_candidates FOR UPDATE
  USING (public.is_hospital_admin(auth.uid(), hospital_id));

-- Service role inserts via edge function (no INSERT policy needed for anon)
CREATE POLICY "Hospital admins can insert merge candidates"
  ON public.patient_merge_candidates FOR INSERT
  WITH CHECK (
    public.is_hospital_admin(auth.uid(), hospital_id)
    OR public.is_hospital_staff(auth.uid(), hospital_id)
  );
