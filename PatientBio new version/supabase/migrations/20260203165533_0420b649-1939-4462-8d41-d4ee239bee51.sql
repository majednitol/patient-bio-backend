-- Create appointment reminder preferences table
CREATE TABLE public.appointment_reminder_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  email_enabled BOOLEAN NOT NULL DEFAULT true,
  sms_enabled BOOLEAN NOT NULL DEFAULT false,
  reminder_hours INTEGER[] NOT NULL DEFAULT '{24}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT unique_user_reminder_prefs UNIQUE (user_id)
);

-- Create scheduled reminders table to track sent reminders
CREATE TABLE public.appointment_reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  reminder_type TEXT NOT NULL CHECK (reminder_type IN ('email', 'sms')),
  hours_before INTEGER NOT NULL,
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.appointment_reminder_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointment_reminders ENABLE ROW LEVEL SECURITY;

-- RLS policies for reminder preferences (users manage their own)
CREATE POLICY "Users can view their own reminder preferences"
  ON public.appointment_reminder_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own reminder preferences"
  ON public.appointment_reminder_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reminder preferences"
  ON public.appointment_reminder_preferences FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS policies for appointment reminders (patients see their own, doctors see for their appointments)
CREATE POLICY "Users can view reminders for their appointments"
  ON public.appointment_reminders FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.appointments a
      WHERE a.id = appointment_id
      AND (a.patient_id = auth.uid() OR a.doctor_id = auth.uid())
    )
  );

-- Create indexes for performance
CREATE INDEX idx_appointment_reminders_appointment ON public.appointment_reminders(appointment_id);
CREATE INDEX idx_appointment_reminders_scheduled ON public.appointment_reminders(scheduled_for) WHERE status = 'pending';
CREATE INDEX idx_reminder_preferences_user ON public.appointment_reminder_preferences(user_id);

-- Trigger to update updated_at
CREATE TRIGGER update_reminder_preferences_updated_at
  BEFORE UPDATE ON public.appointment_reminder_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();