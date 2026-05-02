
-- Platform settings table for system-wide configuration
CREATE TABLE public.platform_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read settings (to display logo)
CREATE POLICY "Authenticated users can read platform settings"
ON public.platform_settings FOR SELECT
TO authenticated
USING (true);

-- Only admins can modify settings
CREATE POLICY "Admins can insert platform settings"
ON public.platform_settings FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update platform settings"
ON public.platform_settings FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete platform settings"
ON public.platform_settings FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
