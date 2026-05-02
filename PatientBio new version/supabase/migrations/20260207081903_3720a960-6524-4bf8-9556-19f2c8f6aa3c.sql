-- Create patient digest preferences table for weekly summary emails
CREATE TABLE public.patient_digest_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  weekly_digest_enabled BOOLEAN NOT NULL DEFAULT true,
  preferred_day INT NOT NULL DEFAULT 1, -- 1=Monday, 7=Sunday
  preferred_hour INT NOT NULL DEFAULT 9, -- Hour in 24h format (0-23)
  timezone TEXT NOT NULL DEFAULT 'UTC',
  last_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id),
  CONSTRAINT valid_day CHECK (preferred_day >= 1 AND preferred_day <= 7),
  CONSTRAINT valid_hour CHECK (preferred_hour >= 0 AND preferred_hour <= 23)
);

-- Enable RLS
ALTER TABLE public.patient_digest_preferences ENABLE ROW LEVEL SECURITY;

-- Patients can view and manage their own preferences
CREATE POLICY "Users can view their own digest preferences"
ON public.patient_digest_preferences
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own digest preferences"
ON public.patient_digest_preferences
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own digest preferences"
ON public.patient_digest_preferences
FOR UPDATE
USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_patient_digest_preferences_updated_at
BEFORE UPDATE ON public.patient_digest_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();