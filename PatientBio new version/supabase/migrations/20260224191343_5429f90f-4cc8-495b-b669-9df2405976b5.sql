ALTER TABLE public.doctor_profiles
  ADD COLUMN practice_type text NOT NULL DEFAULT 'private',
  ADD COLUMN diseases_treated text[];