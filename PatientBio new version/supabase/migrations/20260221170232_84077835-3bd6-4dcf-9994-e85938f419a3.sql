
-- Create doctor-patient messaging table
CREATE TABLE public.doctor_patient_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  doctor_id UUID NOT NULL,
  patient_id UUID NOT NULL,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('doctor', 'patient')),
  message_text TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes for fast lookups
CREATE INDEX idx_dpm_doctor_id ON public.doctor_patient_messages (doctor_id);
CREATE INDEX idx_dpm_patient_id ON public.doctor_patient_messages (patient_id);
CREATE INDEX idx_dpm_doctor_patient ON public.doctor_patient_messages (doctor_id, patient_id, created_at DESC);
CREATE INDEX idx_dpm_unread ON public.doctor_patient_messages (doctor_id, is_read) WHERE is_read = false;

-- Enable RLS
ALTER TABLE public.doctor_patient_messages ENABLE ROW LEVEL SECURITY;

-- Doctors can see messages where they are the doctor
CREATE POLICY "Doctors can view their messages"
  ON public.doctor_patient_messages FOR SELECT
  USING (auth.uid() = doctor_id);

-- Patients can see messages where they are the patient
CREATE POLICY "Patients can view their messages"
  ON public.doctor_patient_messages FOR SELECT
  USING (auth.uid() = patient_id);

-- Doctors can send messages as doctor role
CREATE POLICY "Doctors can send messages"
  ON public.doctor_patient_messages FOR INSERT
  WITH CHECK (auth.uid() = doctor_id AND sender_role = 'doctor');

-- Patients can send messages as patient role
CREATE POLICY "Patients can send messages"
  ON public.doctor_patient_messages FOR INSERT
  WITH CHECK (auth.uid() = patient_id AND sender_role = 'patient');

-- Doctors can mark messages as read (messages sent by patients)
CREATE POLICY "Doctors can update read status"
  ON public.doctor_patient_messages FOR UPDATE
  USING (auth.uid() = doctor_id AND sender_role = 'patient')
  WITH CHECK (auth.uid() = doctor_id AND sender_role = 'patient');

-- Patients can mark messages as read (messages sent by doctors)
CREATE POLICY "Patients can update read status"
  ON public.doctor_patient_messages FOR UPDATE
  USING (auth.uid() = patient_id AND sender_role = 'doctor')
  WITH CHECK (auth.uid() = patient_id AND sender_role = 'doctor');

-- Trigger for updated_at
CREATE TRIGGER update_doctor_patient_messages_updated_at
  BEFORE UPDATE ON public.doctor_patient_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.doctor_patient_messages;
