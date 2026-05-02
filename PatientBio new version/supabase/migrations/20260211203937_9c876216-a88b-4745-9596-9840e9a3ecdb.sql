-- Add lab_hours and certifications to pathologist_profiles
ALTER TABLE public.pathologist_profiles
  ADD COLUMN IF NOT EXISTS lab_hours JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS certifications TEXT DEFAULT NULL;