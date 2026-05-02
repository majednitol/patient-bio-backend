
-- Page views tracking table for live website analytics
CREATE TABLE public.page_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  path TEXT NOT NULL,
  referrer TEXT,
  user_agent TEXT,
  device_type TEXT DEFAULT 'desktop',
  country_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for analytics queries
CREATE INDEX idx_page_views_created_at ON public.page_views (created_at DESC);
CREATE INDEX idx_page_views_session_path ON public.page_views (session_id, path);
CREATE INDEX idx_page_views_path ON public.page_views (path);

-- Enable RLS
ALTER TABLE public.page_views ENABLE ROW LEVEL SECURITY;

-- Anyone can insert page views (public tracking)
CREATE POLICY "Anyone can insert page views"
  ON public.page_views FOR INSERT
  WITH CHECK (true);

-- Only admins can read page views
CREATE POLICY "Admins can read page views"
  ON public.page_views FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));
