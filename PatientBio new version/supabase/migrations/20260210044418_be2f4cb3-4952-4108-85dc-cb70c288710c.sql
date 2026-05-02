
-- Drop the foreign key constraint on user_profiles.user_id so guest patients
-- (who don't have auth accounts) can have profiles
ALTER TABLE public.user_profiles DROP CONSTRAINT IF EXISTS user_profiles_user_id_fkey;
