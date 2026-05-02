-- Trusted Devices table for device fingerprint storage
CREATE TABLE public.trusted_devices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  device_fingerprint TEXT NOT NULL,
  device_name TEXT,
  browser TEXT,
  os TEXT,
  last_used_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN DEFAULT true,
  UNIQUE(user_id, device_fingerprint)
);

-- Enable RLS
ALTER TABLE public.trusted_devices ENABLE ROW LEVEL SECURITY;

-- Users can view their own trusted devices
CREATE POLICY "Users can view their own trusted devices"
ON public.trusted_devices FOR SELECT
USING (auth.uid() = user_id);

-- Users can add their own trusted devices
CREATE POLICY "Users can add their own trusted devices"
ON public.trusted_devices FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own trusted devices
CREATE POLICY "Users can update their own trusted devices"
ON public.trusted_devices FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own trusted devices
CREATE POLICY "Users can delete their own trusted devices"
ON public.trusted_devices FOR DELETE
USING (auth.uid() = user_id);

-- Medication Reminders table
CREATE TABLE public.medication_reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  medication_name TEXT NOT NULL,
  dosage TEXT,
  frequency TEXT NOT NULL,
  reminder_times TIME[] NOT NULL,
  days_of_week INTEGER[] DEFAULT ARRAY[0,1,2,3,4,5,6],
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.medication_reminders ENABLE ROW LEVEL SECURITY;

-- Users can manage their own medication reminders
CREATE POLICY "Users can view their own medication reminders"
ON public.medication_reminders FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own medication reminders"
ON public.medication_reminders FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own medication reminders"
ON public.medication_reminders FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own medication reminders"
ON public.medication_reminders FOR DELETE
USING (auth.uid() = user_id);

-- Medication reminder logs to track sent reminders
CREATE TABLE public.medication_reminder_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reminder_id UUID REFERENCES public.medication_reminders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'pending',
  taken_at TIMESTAMP WITH TIME ZONE,
  skipped_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.medication_reminder_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own medication logs"
ON public.medication_reminder_logs FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own medication logs"
ON public.medication_reminder_logs FOR UPDATE
USING (auth.uid() = user_id);

-- Health Insights table to cache AI-generated insights
CREATE TABLE public.health_insights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  insight_type TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  severity TEXT DEFAULT 'info',
  metric_types TEXT[],
  data_summary JSONB,
  is_read BOOLEAN DEFAULT false,
  generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '7 days')
);

-- Enable RLS
ALTER TABLE public.health_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own health insights"
ON public.health_insights FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own health insights"
ON public.health_insights FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own health insights"
ON public.health_insights FOR DELETE
USING (auth.uid() = user_id);

-- System can insert insights (via edge function)
CREATE POLICY "System can insert health insights"
ON public.health_insights FOR INSERT
WITH CHECK (true);

-- Trigger to update medication_reminders updated_at
CREATE TRIGGER update_medication_reminders_updated_at
BEFORE UPDATE ON public.medication_reminders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();