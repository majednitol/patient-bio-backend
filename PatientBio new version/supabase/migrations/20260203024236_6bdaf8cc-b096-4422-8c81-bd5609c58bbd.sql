-- Table for time-limited access tokens
CREATE TABLE public.access_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  accessed_at TIMESTAMP WITH TIME ZONE,
  access_count INTEGER DEFAULT 0,
  is_revoked BOOLEAN DEFAULT false,
  label TEXT -- Optional label like "For Dr. Smith"
);

-- Enable RLS
ALTER TABLE public.access_tokens ENABLE ROW LEVEL SECURITY;

-- Users can manage their own tokens
CREATE POLICY "Users can view own tokens"
ON public.access_tokens FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own tokens"
ON public.access_tokens FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tokens"
ON public.access_tokens FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tokens"
ON public.access_tokens FOR DELETE
USING (auth.uid() = user_id);

-- Table for doctor/provider connections
CREATE TABLE public.doctor_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  doctor_name TEXT NOT NULL,
  specialty TEXT,
  hospital_clinic TEXT,
  phone TEXT,
  email TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.doctor_connections ENABLE ROW LEVEL SECURITY;

-- Users can manage their own doctor connections
CREATE POLICY "Users can view own doctors"
ON public.doctor_connections FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can add own doctors"
ON public.doctor_connections FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own doctors"
ON public.doctor_connections FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own doctors"
ON public.doctor_connections FOR DELETE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_doctor_connections_updated_at
BEFORE UPDATE ON public.doctor_connections
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();