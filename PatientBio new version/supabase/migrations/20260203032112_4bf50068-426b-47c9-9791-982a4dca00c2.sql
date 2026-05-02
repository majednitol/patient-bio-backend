-- Add notification_email_enabled column to user_profiles
ALTER TABLE public.user_profiles 
ADD COLUMN notification_email_enabled boolean NOT NULL DEFAULT true;

-- Create access_notifications table to track sent notifications
CREATE TABLE public.access_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  token_id uuid REFERENCES public.access_tokens(id) ON DELETE CASCADE,
  notification_type text NOT NULL DEFAULT 'link_accessed',
  sent_at timestamp with time zone NOT NULL DEFAULT now(),
  email_sent_to text,
  access_count_at_notification integer,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on access_notifications
ALTER TABLE public.access_notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
CREATE POLICY "Users can view own notifications"
ON public.access_notifications
FOR SELECT
USING (auth.uid() = user_id);

-- Users can delete their own notifications
CREATE POLICY "Users can delete own notifications"
ON public.access_notifications
FOR DELETE
USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_access_notifications_user_id ON public.access_notifications(user_id);
CREATE INDEX idx_access_notifications_token_id ON public.access_notifications(token_id);