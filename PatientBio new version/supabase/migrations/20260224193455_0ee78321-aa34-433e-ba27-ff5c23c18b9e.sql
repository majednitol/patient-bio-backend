ALTER TABLE public.doctor_profiles
  ADD COLUMN IF NOT EXISTS follow_up_fee numeric,
  ADD COLUMN IF NOT EXISTS follow_up_window_days integer NOT NULL DEFAULT 14;