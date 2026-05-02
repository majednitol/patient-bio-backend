
-- Doctor Favorite Medications table
CREATE TABLE public.doctor_favorite_medications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  doctor_id UUID NOT NULL,
  medication_name TEXT NOT NULL,
  default_dosage TEXT,
  default_frequency TEXT,
  default_duration TEXT,
  default_instructions TEXT,
  usage_count INTEGER NOT NULL DEFAULT 1,
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(doctor_id, medication_name)
);

-- Enable RLS
ALTER TABLE public.doctor_favorite_medications ENABLE ROW LEVEL SECURITY;

-- Doctors can manage their own favorites
CREATE POLICY "Doctors can view their own favorites"
  ON public.doctor_favorite_medications FOR SELECT
  USING (auth.uid() = doctor_id);

CREATE POLICY "Doctors can insert their own favorites"
  ON public.doctor_favorite_medications FOR INSERT
  WITH CHECK (auth.uid() = doctor_id);

CREATE POLICY "Doctors can update their own favorites"
  ON public.doctor_favorite_medications FOR UPDATE
  USING (auth.uid() = doctor_id);

CREATE POLICY "Doctors can delete their own favorites"
  ON public.doctor_favorite_medications FOR DELETE
  USING (auth.uid() = doctor_id);

-- Updated_at trigger
CREATE TRIGGER update_doctor_favorite_medications_updated_at
  BEFORE UPDATE ON public.doctor_favorite_medications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
