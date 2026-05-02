ALTER TABLE public.doctor_profiles
  ADD COLUMN IF NOT EXISTS languages_spoken text[];