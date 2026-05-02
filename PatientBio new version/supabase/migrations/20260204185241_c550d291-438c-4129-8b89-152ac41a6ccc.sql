-- Create enum for data request status
CREATE TYPE data_request_status AS ENUM ('pending', 'approved', 'rejected');

-- Create data_access_requests table for managing incoming data requests
CREATE TABLE public.data_access_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL,
  requester_id UUID NOT NULL,
  requester_type TEXT NOT NULL CHECK (requester_type IN ('doctor', 'pathologist', 'pharmacy', 'lab')),
  disease_category TEXT,
  reason TEXT,
  status data_request_status DEFAULT 'pending',
  requested_at TIMESTAMPTZ DEFAULT now(),
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create notifications table for system notifications
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('access_request', 'data_viewed', 'prescription_added', 'request_approved', 'request_rejected', 'report_shared')),
  title TEXT NOT NULL,
  message TEXT,
  is_read BOOLEAN DEFAULT false,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE public.data_access_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for data_access_requests
-- Patients can view requests made to them
CREATE POLICY "Patients can view their requests"
  ON public.data_access_requests FOR SELECT
  USING (auth.uid() = patient_id);

-- Patients can approve/reject requests
CREATE POLICY "Patients can update their requests"
  ON public.data_access_requests FOR UPDATE
  USING (auth.uid() = patient_id);

-- Requesters can create requests
CREATE POLICY "Users can create requests"
  ON public.data_access_requests FOR INSERT
  WITH CHECK (auth.uid() = requester_id);

-- Requesters can view their own requests
CREATE POLICY "Requesters can view own requests"
  ON public.data_access_requests FOR SELECT
  USING (auth.uid() = requester_id);

-- RLS Policies for notifications
-- Users can view their own notifications
CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

-- Users can update (mark as read) their own notifications
CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own notifications
CREATE POLICY "Users can delete own notifications"
  ON public.notifications FOR DELETE
  USING (auth.uid() = user_id);

-- Service role can insert notifications (for triggers/functions)
CREATE POLICY "Service can insert notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX idx_data_access_requests_patient_id ON public.data_access_requests(patient_id);
CREATE INDEX idx_data_access_requests_requester_id ON public.data_access_requests(requester_id);
CREATE INDEX idx_data_access_requests_status ON public.data_access_requests(status);
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_is_read ON public.notifications(is_read);