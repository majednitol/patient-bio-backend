-- Add new social link columns to team_members table
ALTER TABLE public.team_members
ADD COLUMN github_url text,
ADD COLUMN website_url text,
ADD COLUMN phone text;