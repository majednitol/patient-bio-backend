-- Create health metrics table for tracking health data over time
CREATE TABLE public.health_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  metric_type TEXT NOT NULL,
  value NUMERIC NOT NULL,
  unit TEXT NOT NULL,
  measured_at TIMESTAMPTZ DEFAULT now(),
  source TEXT DEFAULT 'manual',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for faster queries
CREATE INDEX idx_health_metrics_user_id ON public.health_metrics(user_id);
CREATE INDEX idx_health_metrics_type ON public.health_metrics(metric_type);
CREATE INDEX idx_health_metrics_measured_at ON public.health_metrics(measured_at);

-- Enable RLS
ALTER TABLE public.health_metrics ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own metrics
CREATE POLICY "Users can view own metrics"
ON public.health_metrics
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Policy: Users can insert their own metrics
CREATE POLICY "Users can insert own metrics"
ON public.health_metrics
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own metrics
CREATE POLICY "Users can update own metrics"
ON public.health_metrics
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Policy: Users can delete their own metrics
CREATE POLICY "Users can delete own metrics"
ON public.health_metrics
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Policy: Doctors with active access can view patient metrics
CREATE POLICY "Doctors can view patient metrics with access"
ON public.health_metrics
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'doctor') 
  AND public.has_active_doctor_access(auth.uid(), user_id)
);