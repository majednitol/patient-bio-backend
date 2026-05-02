-- Prescription Templates table for doctors to save common medication combinations
CREATE TABLE public.prescription_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  doctor_id UUID NOT NULL,
  name TEXT NOT NULL,
  diagnosis TEXT,
  medications JSONB NOT NULL DEFAULT '[]',
  instructions TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Doctor Patient Notes table for private notes about patients
CREATE TABLE public.doctor_patient_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  doctor_id UUID NOT NULL,
  patient_id UUID NOT NULL,
  note TEXT NOT NULL,
  is_pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.prescription_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctor_patient_notes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for prescription_templates
CREATE POLICY "Doctors can view their own templates"
ON public.prescription_templates
FOR SELECT
USING (auth.uid() = doctor_id);

CREATE POLICY "Doctors can create their own templates"
ON public.prescription_templates
FOR INSERT
WITH CHECK (auth.uid() = doctor_id);

CREATE POLICY "Doctors can update their own templates"
ON public.prescription_templates
FOR UPDATE
USING (auth.uid() = doctor_id);

CREATE POLICY "Doctors can delete their own templates"
ON public.prescription_templates
FOR DELETE
USING (auth.uid() = doctor_id);

-- RLS Policies for doctor_patient_notes
CREATE POLICY "Doctors can view their own patient notes"
ON public.doctor_patient_notes
FOR SELECT
USING (auth.uid() = doctor_id);

CREATE POLICY "Doctors can create notes for their patients"
ON public.doctor_patient_notes
FOR INSERT
WITH CHECK (auth.uid() = doctor_id);

CREATE POLICY "Doctors can update their own patient notes"
ON public.doctor_patient_notes
FOR UPDATE
USING (auth.uid() = doctor_id);

CREATE POLICY "Doctors can delete their own patient notes"
ON public.doctor_patient_notes
FOR DELETE
USING (auth.uid() = doctor_id);

-- Indexes for performance
CREATE INDEX idx_prescription_templates_doctor ON public.prescription_templates(doctor_id);
CREATE INDEX idx_doctor_patient_notes_doctor ON public.doctor_patient_notes(doctor_id);
CREATE INDEX idx_doctor_patient_notes_patient ON public.doctor_patient_notes(patient_id);
CREATE INDEX idx_doctor_patient_notes_doctor_patient ON public.doctor_patient_notes(doctor_id, patient_id);

-- Update triggers
CREATE TRIGGER update_prescription_templates_updated_at
BEFORE UPDATE ON public.prescription_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_doctor_patient_notes_updated_at
BEFORE UPDATE ON public.doctor_patient_notes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();