
-- 1. Add snooze columns to medication_reminder_logs
ALTER TABLE public.medication_reminder_logs 
ADD COLUMN snoozed_until TIMESTAMP WITH TIME ZONE,
ADD COLUMN snooze_count INTEGER DEFAULT 0;

-- 2. Add caregiver contact columns to medication_reminders
ALTER TABLE public.medication_reminders
ADD COLUMN caregiver_name TEXT,
ADD COLUMN caregiver_phone TEXT,
ADD COLUMN caregiver_email TEXT,
ADD COLUMN caregiver_alert_after_minutes INTEGER DEFAULT 120;

-- 3. Create medication_streaks table for tracking streaks
CREATE TABLE public.medication_streaks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_perfect_date DATE,
  total_perfect_days INTEGER DEFAULT 0,
  milestones_achieved INTEGER[] DEFAULT '{}',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Unique per user
CREATE UNIQUE INDEX idx_medication_streaks_user ON public.medication_streaks(user_id);

-- Enable RLS
ALTER TABLE public.medication_streaks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own streaks"
ON public.medication_streaks FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own streaks"
ON public.medication_streaks FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own streaks"
ON public.medication_streaks FOR UPDATE
USING (auth.uid() = user_id);

-- 4. Update notifications type check to include medication_reminder and caregiver_alert
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check 
CHECK (type = ANY (ARRAY[
  'access_request', 'data_viewed', 'prescription_added', 
  'request_approved', 'request_rejected', 'report_shared',
  'hospital_admission', 'hospital_discharge', 'hospital_appointment',
  'hospital_doctor_application', 'medication_reminder', 'caregiver_alert'
]));
