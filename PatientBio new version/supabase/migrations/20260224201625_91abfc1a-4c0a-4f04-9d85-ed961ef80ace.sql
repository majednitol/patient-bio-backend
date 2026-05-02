
-- Gap 5: Add appointment_type to appointments
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS appointment_type text DEFAULT 'new_consultation';

-- Gap 7: Add appointment settings columns to doctor_settings
ALTER TABLE public.doctor_settings
  ADD COLUMN IF NOT EXISTS auto_confirm_appointments boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS buffer_minutes integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_appointments_per_day integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS min_advance_booking_hours integer DEFAULT 0;
