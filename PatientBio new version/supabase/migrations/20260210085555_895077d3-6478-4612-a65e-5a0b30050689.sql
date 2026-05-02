
-- Patient vitals tracking
CREATE TABLE public.patient_vitals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL,
  doctor_id UUID NOT NULL,
  appointment_id UUID REFERENCES public.appointments(id),
  hospital_id UUID REFERENCES public.hospitals(id),
  bp_systolic INTEGER,
  bp_diastolic INTEGER,
  heart_rate INTEGER,
  temperature DECIMAL(4,1),
  spo2 INTEGER,
  weight DECIMAL(5,1),
  notes TEXT,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.patient_vitals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Doctors can insert vitals" ON public.patient_vitals
  FOR INSERT WITH CHECK (auth.uid() = doctor_id);

CREATE POLICY "Doctors can view vitals they recorded" ON public.patient_vitals
  FOR SELECT USING (auth.uid() = doctor_id);

CREATE POLICY "Patients can view their own vitals" ON public.patient_vitals
  FOR SELECT USING (auth.uid() = patient_id);

CREATE INDEX idx_patient_vitals_patient ON public.patient_vitals(patient_id, recorded_at DESC);
CREATE INDEX idx_patient_vitals_doctor ON public.patient_vitals(doctor_id);
