
-- Create admin_data_distributions table
CREATE TABLE public.admin_data_distributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL,
  recipient_type TEXT NOT NULL CHECK (recipient_type IN ('researcher', 'pharmacy')),
  recipient_id UUID NOT NULL,
  disease_categories TEXT[] DEFAULT '{}',
  date_range_start DATE,
  date_range_end DATE,
  purpose TEXT NOT NULL,
  record_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'completed',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_data_distributions ENABLE ROW LEVEL SECURITY;

-- Only admins can view distributions
CREATE POLICY "Admins can view all distributions"
ON public.admin_data_distributions
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can create distributions
CREATE POLICY "Admins can create distributions"
ON public.admin_data_distributions
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Index for efficient querying
CREATE INDEX idx_admin_distributions_created_at ON public.admin_data_distributions (created_at DESC);
CREATE INDEX idx_admin_distributions_recipient ON public.admin_data_distributions (recipient_type, recipient_id);
