-- =============================================================================
-- FHIR SUBSCRIPTIONS TABLE
-- Manages webhook subscriptions for real-time data change notifications
-- =============================================================================

CREATE TABLE public.fhir_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  subscriber_name TEXT NOT NULL, -- Name of the subscribing system
  endpoint_url TEXT NOT NULL, -- Webhook URL to receive notifications
  topic TEXT NOT NULL CHECK (topic IN ('Patient', 'Observation', 'Condition', 'MedicationStatement', 'AllergyIntolerance', 'DocumentReference', '*')),
  filter_criteria JSONB DEFAULT '{}'::jsonb, -- Additional filtering (e.g., specific disease category)
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'error', 'expired')),
  secret TEXT, -- HMAC secret for signature verification
  headers JSONB DEFAULT '{}'::jsonb, -- Custom headers to include in webhook calls
  retry_policy JSONB DEFAULT '{"max_retries": 3, "retry_delay_seconds": 60}'::jsonb,
  last_triggered_at TIMESTAMPTZ,
  last_error TEXT,
  error_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ -- Optional expiration
);

-- Indexes
CREATE INDEX idx_fhir_subscriptions_user_id ON public.fhir_subscriptions(user_id);
CREATE INDEX idx_fhir_subscriptions_status ON public.fhir_subscriptions(status) WHERE status = 'active';
CREATE INDEX idx_fhir_subscriptions_topic ON public.fhir_subscriptions(topic);

-- Enable RLS
ALTER TABLE public.fhir_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can manage their own subscriptions
CREATE POLICY "Users can view own subscriptions"
ON public.fhir_subscriptions FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can create own subscriptions"
ON public.fhir_subscriptions FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own subscriptions"
ON public.fhir_subscriptions FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can delete own subscriptions"
ON public.fhir_subscriptions FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Trigger for updated_at
CREATE TRIGGER update_fhir_subscriptions_updated_at
BEFORE UPDATE ON public.fhir_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================================================
-- FHIR SUBSCRIPTION NOTIFICATIONS LOG
-- Tracks webhook delivery attempts for debugging
-- =============================================================================

CREATE TABLE public.fhir_subscription_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES public.fhir_subscriptions(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- 'create', 'update', 'delete'
  resource_type TEXT NOT NULL,
  resource_id UUID NOT NULL,
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'retrying')),
  response_status INTEGER, -- HTTP status code from webhook
  response_body TEXT,
  attempt_count INTEGER DEFAULT 0,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_fhir_notifications_subscription ON public.fhir_subscription_notifications(subscription_id);
CREATE INDEX idx_fhir_notifications_status ON public.fhir_subscription_notifications(status) WHERE status IN ('pending', 'retrying');
CREATE INDEX idx_fhir_notifications_created ON public.fhir_subscription_notifications(created_at DESC);

-- Enable RLS
ALTER TABLE public.fhir_subscription_notifications ENABLE ROW LEVEL SECURITY;

-- Users can view notifications for their subscriptions
CREATE POLICY "Users can view own subscription notifications"
ON public.fhir_subscription_notifications FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.fhir_subscriptions
    WHERE fhir_subscriptions.id = fhir_subscription_notifications.subscription_id
    AND fhir_subscriptions.user_id = auth.uid()
  )
);

-- =============================================================================
-- SMART ON FHIR LAUNCH SESSIONS
-- Tracks EHR launch contexts for SMART on FHIR integration
-- =============================================================================

CREATE TABLE public.smart_launch_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID, -- May be null initially until auth completes
  launch_token TEXT UNIQUE NOT NULL, -- The launch parameter from EHR
  state TEXT UNIQUE NOT NULL, -- OAuth state parameter
  ehr_url TEXT NOT NULL, -- Base URL of the launching EHR
  client_id TEXT NOT NULL, -- SMART client ID
  scope TEXT[] NOT NULL, -- Requested FHIR scopes
  patient_context TEXT, -- Patient ID from EHR context
  encounter_context TEXT, -- Encounter ID from EHR context
  fhir_user TEXT, -- FHIR user reference (e.g., Practitioner/123)
  access_token_encrypted TEXT, -- Encrypted access token from EHR
  refresh_token_encrypted TEXT, -- Encrypted refresh token
  token_expires_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'authorized', 'completed', 'expired', 'error')),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '1 hour')
);

-- Indexes
CREATE INDEX idx_smart_launch_user ON public.smart_launch_sessions(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_smart_launch_state ON public.smart_launch_sessions(state);
CREATE INDEX idx_smart_launch_token ON public.smart_launch_sessions(launch_token);
CREATE INDEX idx_smart_launch_status ON public.smart_launch_sessions(status) WHERE status IN ('pending', 'authorized');

-- Enable RLS
ALTER TABLE public.smart_launch_sessions ENABLE ROW LEVEL SECURITY;

-- Users can view their own sessions
CREATE POLICY "Users can view own SMART sessions"
ON public.smart_launch_sessions FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- System can insert/update sessions (handled via service role in edge functions)
CREATE POLICY "System can manage SMART sessions"
ON public.smart_launch_sessions FOR ALL
TO authenticated
USING (user_id = auth.uid() OR user_id IS NULL);

-- Trigger for updated_at
CREATE TRIGGER update_smart_launch_sessions_updated_at
BEFORE UPDATE ON public.smart_launch_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================================================
-- HL7V2 IMPORT LOGS
-- Tracks HL7v2 message imports
-- =============================================================================

CREATE TABLE public.hl7v2_import_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  message_type TEXT NOT NULL, -- ADT^A01, ORU^R01, etc.
  message_control_id TEXT, -- MSH-10
  sending_application TEXT, -- MSH-3
  sending_facility TEXT, -- MSH-4
  message_datetime TIMESTAMPTZ, -- MSH-7
  raw_message TEXT, -- Original HL7v2 message
  parsed_segments JSONB, -- Parsed segment data
  imported_resources JSONB, -- Resources created from this message
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'partial')),
  error_message TEXT,
  warnings TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_hl7v2_import_user ON public.hl7v2_import_logs(user_id);
CREATE INDEX idx_hl7v2_import_status ON public.hl7v2_import_logs(status);
CREATE INDEX idx_hl7v2_import_type ON public.hl7v2_import_logs(message_type);

-- Enable RLS
ALTER TABLE public.hl7v2_import_logs ENABLE ROW LEVEL SECURITY;

-- Users can view their own import logs
CREATE POLICY "Users can view own HL7v2 imports"
ON public.hl7v2_import_logs FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can create own HL7v2 imports"
ON public.hl7v2_import_logs FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());