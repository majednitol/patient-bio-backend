
-- Patient Queue table for real-time queue management
CREATE TABLE public.patient_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  appointment_id UUID NOT NULL UNIQUE REFERENCES public.appointments(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL,
  doctor_id UUID NOT NULL,
  hospital_id UUID,
  queue_position INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'in_consultation', 'completed', 'skipped')),
  checked_in_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  called_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal', 'urgent', 'emergency')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.patient_queue ENABLE ROW LEVEL SECURITY;

-- Doctors can see their own queue
CREATE POLICY "Doctors can view their queue"
  ON public.patient_queue FOR SELECT
  USING (auth.uid() = doctor_id);

-- Patients can see their own queue entry
CREATE POLICY "Patients can view their own queue entry"
  ON public.patient_queue FOR SELECT
  USING (auth.uid() = patient_id);

-- Doctors can insert into their queue
CREATE POLICY "Doctors can insert into their queue"
  ON public.patient_queue FOR INSERT
  WITH CHECK (auth.uid() = doctor_id);

-- System/patient check-in inserts
CREATE POLICY "Patients can join queue"
  ON public.patient_queue FOR INSERT
  WITH CHECK (auth.uid() = patient_id);

-- Doctors can update their queue
CREATE POLICY "Doctors can update their queue"
  ON public.patient_queue FOR UPDATE
  USING (auth.uid() = doctor_id);

-- Doctors can delete from their queue
CREATE POLICY "Doctors can delete from their queue"
  ON public.patient_queue FOR DELETE
  USING (auth.uid() = doctor_id);

-- Enable realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.patient_queue;

-- Index for fast doctor queue lookups
CREATE INDEX idx_patient_queue_doctor_status ON public.patient_queue(doctor_id, status);
