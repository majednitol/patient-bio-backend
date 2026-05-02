
-- Create appointment waitlist table
CREATE TABLE public.appointment_waitlist (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL,
  doctor_id UUID NOT NULL,
  preferred_date DATE NOT NULL,
  preferred_time_start TIME,
  preferred_time_end TIME,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'notified', 'booked', 'expired', 'cancelled')),
  notified_at TIMESTAMPTZ,
  available_appointment_id UUID REFERENCES public.appointments(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for efficient lookups on cancellation
CREATE INDEX idx_waitlist_doctor_date ON public.appointment_waitlist (doctor_id, preferred_date, status);
CREATE INDEX idx_waitlist_patient ON public.appointment_waitlist (patient_id, status);

-- Enable RLS
ALTER TABLE public.appointment_waitlist ENABLE ROW LEVEL SECURITY;

-- Patients can view and manage their own waitlist entries
CREATE POLICY "Patients can view own waitlist entries"
  ON public.appointment_waitlist FOR SELECT
  USING (auth.uid() = patient_id);

CREATE POLICY "Patients can insert own waitlist entries"
  ON public.appointment_waitlist FOR INSERT
  WITH CHECK (auth.uid() = patient_id);

CREATE POLICY "Patients can update own waitlist entries"
  ON public.appointment_waitlist FOR UPDATE
  USING (auth.uid() = patient_id);

CREATE POLICY "Patients can delete own waitlist entries"
  ON public.appointment_waitlist FOR DELETE
  USING (auth.uid() = patient_id);

-- Doctors can view waitlist entries for their appointments
CREATE POLICY "Doctors can view their waitlist entries"
  ON public.appointment_waitlist FOR SELECT
  USING (auth.uid() = doctor_id);

-- Add waitlist_available to notification types
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check CHECK (
  type IN (
    'access', 'share', 'record', 'appointment', 'prescription', 'system',
    'data_request', 'broadcast_request', 'family_link', 'referral',
    'doctor_share', 'pathologist_share', 'researcher_share',
    'lab_order', 'lab_result', 'abnormal_result',
    'admission', 'discharge', 'transfer', 'medication_due',
    'appointment_booked', 'appointment_confirmed', 'appointment_cancelled',
    'appointment_completed', 'appointment_rescheduled', 'appointment_reminder',
    'provider_verification', 'staff_invitation', 'data_viewed',
    'waitlist_available'
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_appointment_waitlist_updated_at
  BEFORE UPDATE ON public.appointment_waitlist
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
