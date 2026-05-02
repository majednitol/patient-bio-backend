
-- Add new columns to user_profiles
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS weight text;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS address text;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS occupation text;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS national_id text;

-- Add new columns to health_data
ALTER TABLE public.health_data ADD COLUMN IF NOT EXISTS weight text;
ALTER TABLE public.health_data ADD COLUMN IF NOT EXISTS emergency_contact_relationship text;
