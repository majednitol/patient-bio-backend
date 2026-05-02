-- Add type column to hospitals table for categorization
ALTER TABLE public.hospitals 
ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'hospital';

-- Add a comment to describe valid values
COMMENT ON COLUMN public.hospitals.type IS 'Type of healthcare facility: hospital, clinic, diagnostic, pharmacy';