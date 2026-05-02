
-- Add stakeholder-specific columns to access_tokens
ALTER TABLE public.access_tokens 
  ADD COLUMN IF NOT EXISTS recipient_type text DEFAULT 'other',
  ADD COLUMN IF NOT EXISTS recipient_jurisdiction text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS require_verification boolean DEFAULT false;

-- Add verified recipient columns to access_logs
ALTER TABLE public.access_logs
  ADD COLUMN IF NOT EXISTS verified_recipient_name text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS verified_recipient_org text DEFAULT NULL;
