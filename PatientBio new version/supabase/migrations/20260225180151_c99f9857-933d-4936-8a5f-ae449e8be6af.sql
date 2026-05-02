
CREATE TABLE public.patient_favorite_doctors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(patient_id, doctor_id)
);

ALTER TABLE public.patient_favorite_doctors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Patients manage own favorites"
  ON public.patient_favorite_doctors
  FOR ALL
  USING (auth.uid() = patient_id)
  WITH CHECK (auth.uid() = patient_id);
