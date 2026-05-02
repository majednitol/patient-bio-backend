-- Create access_logs table for detailed access tracking
CREATE TABLE public.access_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  access_token_id UUID REFERENCES public.access_tokens(id) ON DELETE SET NULL,
  accessor_id UUID,
  accessor_type TEXT NOT NULL DEFAULT 'anonymous',
  accessor_name TEXT,
  accessor_email TEXT,
  access_reason TEXT,
  ip_address INET,
  user_agent TEXT,
  country TEXT,
  city TEXT,
  accessed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.access_logs ENABLE ROW LEVEL SECURITY;

-- Patients can view their own access logs
CREATE POLICY "Users can view their own access logs"
ON public.access_logs
FOR SELECT
USING (auth.uid() = user_id);

-- Allow inserts from authenticated users (for providers accessing data)
CREATE POLICY "Authenticated users can log access"
ON public.access_logs
FOR INSERT
WITH CHECK (true);

-- Create index for efficient querying
CREATE INDEX idx_access_logs_user_id ON public.access_logs(user_id);
CREATE INDEX idx_access_logs_accessed_at ON public.access_logs(accessed_at DESC);
CREATE INDEX idx_access_logs_access_token_id ON public.access_logs(access_token_id);

-- Add comment for documentation
COMMENT ON TABLE public.access_logs IS 'Tracks all access events to patient health data including IP, location, and accessor details';
