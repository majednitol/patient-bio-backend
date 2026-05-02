-- Create prescriptions table for doctors to issue digital prescriptions
CREATE TABLE public.prescriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL,
  doctor_id UUID NOT NULL,
  hospital_id UUID REFERENCES public.hospitals(id) ON DELETE SET NULL,
  diagnosis TEXT,
  medications JSONB NOT NULL DEFAULT '[]',
  instructions TEXT,
  notes TEXT,
  follow_up_date DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX idx_prescriptions_patient ON public.prescriptions(patient_id);
CREATE INDEX idx_prescriptions_doctor ON public.prescriptions(doctor_id);

-- Enable RLS
ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;

-- Doctors can create prescriptions
CREATE POLICY "Doctors can create prescriptions"
ON public.prescriptions FOR INSERT
WITH CHECK (
  auth.uid() = doctor_id AND 
  has_role(auth.uid(), 'doctor')
);

-- Doctors can view prescriptions they created
CREATE POLICY "Doctors can view own prescriptions"
ON public.prescriptions FOR SELECT
USING (auth.uid() = doctor_id);

-- Patients can view their prescriptions
CREATE POLICY "Patients can view their prescriptions"
ON public.prescriptions FOR SELECT
USING (auth.uid() = patient_id);

-- Doctors can update their own prescriptions
CREATE POLICY "Doctors can update own prescriptions"
ON public.prescriptions FOR UPDATE
USING (auth.uid() = doctor_id);

-- Create trigger for updated_at
CREATE TRIGGER update_prescriptions_updated_at
  BEFORE UPDATE ON public.prescriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create a table to track which patients have shared access with which doctors
CREATE TABLE public.doctor_patient_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL,
  patient_id UUID NOT NULL,
  access_token_id UUID REFERENCES public.access_tokens(id) ON DELETE SET NULL,
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_accessed_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  UNIQUE(doctor_id, patient_id)
);

-- Create indexes
CREATE INDEX idx_doctor_patient_access_doctor ON public.doctor_patient_access(doctor_id);
CREATE INDEX idx_doctor_patient_access_patient ON public.doctor_patient_access(patient_id);

-- Enable RLS
ALTER TABLE public.doctor_patient_access ENABLE ROW LEVEL SECURITY;

-- Doctors can view their patient access records
CREATE POLICY "Doctors can view their patient access"
ON public.doctor_patient_access FOR SELECT
USING (auth.uid() = doctor_id);

-- Patients can view who has access to their data
CREATE POLICY "Patients can view their access grants"
ON public.doctor_patient_access FOR SELECT
USING (auth.uid() = patient_id);

-- System can insert access records (via edge function)
CREATE POLICY "Allow insert for authenticated users"
ON public.doctor_patient_access FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Patients can revoke access
CREATE POLICY "Patients can revoke access"
ON public.doctor_patient_access FOR UPDATE
USING (auth.uid() = patient_id);

-- Patients can delete access
CREATE POLICY "Patients can delete access"
ON public.doctor_patient_access FOR DELETE
USING (auth.uid() = patient_id);