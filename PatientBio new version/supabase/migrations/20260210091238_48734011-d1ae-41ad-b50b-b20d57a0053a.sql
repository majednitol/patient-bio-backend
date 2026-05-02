
-- Phase 6a: Add checked_in_at column to appointments for patient check-in system
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMPTZ;

-- Enable realtime for appointments so doctor sees check-in updates live
ALTER PUBLICATION supabase_realtime ADD TABLE public.appointments;
