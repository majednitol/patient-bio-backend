-- Create table for storing WebAuthn biometric credentials
CREATE TABLE public.user_biometric_credentials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  credential_id TEXT NOT NULL UNIQUE,
  public_key TEXT NOT NULL,
  counter BIGINT NOT NULL DEFAULT 0,
  device_name TEXT,
  transports TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_used_at TIMESTAMP WITH TIME ZONE
);

-- Create index for faster lookups
CREATE INDEX idx_biometric_credentials_user_id ON public.user_biometric_credentials(user_id);
CREATE INDEX idx_biometric_credentials_credential_id ON public.user_biometric_credentials(credential_id);

-- Enable Row Level Security
ALTER TABLE public.user_biometric_credentials ENABLE ROW LEVEL SECURITY;

-- Users can only view their own credentials
CREATE POLICY "Users can view their own biometric credentials"
  ON public.user_biometric_credentials
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can register new credentials for themselves
CREATE POLICY "Users can register their own biometric credentials"
  ON public.user_biometric_credentials
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own credentials (e.g., counter, last_used_at)
CREATE POLICY "Users can update their own biometric credentials"
  ON public.user_biometric_credentials
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own credentials
CREATE POLICY "Users can delete their own biometric credentials"
  ON public.user_biometric_credentials
  FOR DELETE
  USING (auth.uid() = user_id);