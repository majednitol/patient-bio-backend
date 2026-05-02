
-- Create visit_summaries table for post-visit patient summaries
CREATE TABLE public.visit_summaries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL,
  doctor_id UUID NOT NULL,
  summary_text TEXT NOT NULL,
  diagnosis TEXT,
  medications_summary TEXT,
  follow_up_instructions TEXT,
  is_approved BOOLEAN NOT NULL DEFAULT false,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT visit_summaries_appointment_unique UNIQUE (appointment_id)
);

-- Enable RLS
ALTER TABLE public.visit_summaries ENABLE ROW LEVEL SECURITY;

-- Doctors can insert/update/view summaries they created
CREATE POLICY "Doctors can manage their visit summaries"
  ON public.visit_summaries
  FOR ALL
  USING (auth.uid() = doctor_id)
  WITH CHECK (auth.uid() = doctor_id);

-- Patients can view approved summaries for their visits
CREATE POLICY "Patients can view their approved summaries"
  ON public.visit_summaries
  FOR SELECT
  USING (auth.uid() = patient_id AND is_approved = true);

-- Index for quick lookups
CREATE INDEX idx_visit_summaries_patient ON public.visit_summaries(patient_id, created_at DESC);
CREATE INDEX idx_visit_summaries_appointment ON public.visit_summaries(appointment_id);

-- Trigger for updated_at
CREATE TRIGGER update_visit_summaries_updated_at
  BEFORE UPDATE ON public.visit_summaries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
