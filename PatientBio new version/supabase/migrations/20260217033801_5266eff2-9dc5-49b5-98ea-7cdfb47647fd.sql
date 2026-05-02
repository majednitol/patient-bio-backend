
-- Create consultation_feedback table
CREATE TABLE public.consultation_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL UNIQUE REFERENCES public.appointments(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL,
  doctor_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  tags TEXT[] DEFAULT '{}',
  comment TEXT,
  is_anonymous BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for doctor analytics queries
CREATE INDEX idx_consultation_feedback_doctor ON public.consultation_feedback (doctor_id, created_at DESC);
CREATE INDEX idx_consultation_feedback_patient ON public.consultation_feedback (patient_id);

-- Enable RLS
ALTER TABLE public.consultation_feedback ENABLE ROW LEVEL SECURITY;

-- Patients can insert their own feedback
CREATE POLICY "Patients can insert own feedback"
ON public.consultation_feedback
FOR INSERT
WITH CHECK (auth.uid() = patient_id);

-- Patients can read their own feedback
CREATE POLICY "Patients can read own feedback"
ON public.consultation_feedback
FOR SELECT
USING (auth.uid() = patient_id);

-- Doctors can read feedback about them
CREATE POLICY "Doctors can read their feedback"
ON public.consultation_feedback
FOR SELECT
USING (auth.uid() = doctor_id);
