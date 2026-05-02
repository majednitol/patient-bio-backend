
-- Researcher API Keys table
CREATE TABLE public.researcher_api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  researcher_id uuid NOT NULL,
  key_hash text NOT NULL,
  key_prefix text NOT NULL,
  label text NOT NULL,
  scopes text[] NOT NULL DEFAULT ARRAY['pool:read'],
  last_used_at timestamptz,
  expires_at timestamptz NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.researcher_api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Researchers manage own API keys"
  ON public.researcher_api_keys FOR ALL
  TO authenticated
  USING (auth.uid() = researcher_id)
  WITH CHECK (auth.uid() = researcher_id);

-- Researcher Webhooks table
CREATE TABLE public.researcher_webhooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  researcher_id uuid NOT NULL,
  label text NOT NULL,
  url text NOT NULL,
  secret text NOT NULL,
  events text[] NOT NULL DEFAULT ARRAY['new_share'],
  filter_criteria jsonb DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  last_triggered_at timestamptz,
  failure_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.researcher_webhooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Researchers manage own webhooks"
  ON public.researcher_webhooks FOR ALL
  TO authenticated
  USING (auth.uid() = researcher_id)
  WITH CHECK (auth.uid() = researcher_id);

-- Webhook delivery log
CREATE TABLE public.researcher_webhook_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id uuid NOT NULL REFERENCES public.researcher_webhooks(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  response_status integer,
  response_body text,
  delivered_at timestamptz NOT NULL DEFAULT now(),
  success boolean NOT NULL DEFAULT false
);

ALTER TABLE public.researcher_webhook_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Researchers view own webhook logs"
  ON public.researcher_webhook_logs FOR SELECT
  TO authenticated
  USING (
    webhook_id IN (
      SELECT id FROM public.researcher_webhooks WHERE researcher_id = auth.uid()
    )
  );

-- Updated_at triggers
CREATE TRIGGER update_researcher_api_keys_updated_at
  BEFORE UPDATE ON public.researcher_api_keys
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_researcher_webhooks_updated_at
  BEFORE UPDATE ON public.researcher_webhooks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
