
-- 1. Appointment intake forms table
CREATE TABLE public.appointment_intake (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL,
  chief_complaint TEXT,
  symptom_duration TEXT,
  symptom_severity TEXT CHECK (symptom_severity IN ('mild', 'moderate', 'severe', NULL)),
  self_medications TEXT,
  additional_notes TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.appointment_intake ENABLE ROW LEVEL SECURITY;

-- Patients can manage their own intake forms
CREATE POLICY "Patients can view own intake" ON public.appointment_intake
  FOR SELECT USING (auth.uid() = patient_id);

CREATE POLICY "Patients can insert own intake" ON public.appointment_intake
  FOR INSERT WITH CHECK (auth.uid() = patient_id);

CREATE POLICY "Patients can update own intake" ON public.appointment_intake
  FOR UPDATE USING (auth.uid() = patient_id);

-- Doctors can view intake for their appointments
CREATE POLICY "Doctors can view intake for their appointments" ON public.appointment_intake
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.appointments
      WHERE appointments.id = appointment_intake.appointment_id
      AND appointments.doctor_id = auth.uid()
    )
  );

CREATE TRIGGER update_appointment_intake_updated_at
  BEFORE UPDATE ON public.appointment_intake
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Unique constraint: one intake per appointment
ALTER TABLE public.appointment_intake ADD CONSTRAINT unique_appointment_intake UNIQUE (appointment_id);

-- 2. Add consultation timing columns to appointments
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS consultation_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS consultation_ended_at TIMESTAMPTZ;
