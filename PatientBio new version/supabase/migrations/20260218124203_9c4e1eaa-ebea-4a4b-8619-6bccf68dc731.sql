
-- Table: anonymous_health_contributions
CREATE TABLE public.anonymous_health_contributions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL,
  contribution_hash TEXT NOT NULL,
  anonymized_data JSONB NOT NULL DEFAULT '{}',
  data_categories TEXT[] NOT NULL DEFAULT '{}',
  disease_categories TEXT[] NOT NULL DEFAULT '{}',
  age_range TEXT,
  gender TEXT,
  source_jurisdiction public.jurisdiction_code NOT NULL DEFAULT 'IN',
  requires_govt_approval BOOLEAN NOT NULL DEFAULT false,
  govt_approval_status TEXT NOT NULL DEFAULT 'not_required' CHECK (govt_approval_status IN ('not_required', 'pending', 'approved', 'rejected')),
  govt_reference_number TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  contributed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique constraint on contribution_hash to prevent duplicates
CREATE UNIQUE INDEX idx_anon_contributions_hash ON public.anonymous_health_contributions (contribution_hash);
CREATE INDEX idx_anon_contributions_patient ON public.anonymous_health_contributions (patient_id);
CREATE INDEX idx_anon_contributions_disease ON public.anonymous_health_contributions USING GIN (disease_categories);
CREATE INDEX idx_anon_contributions_active ON public.anonymous_health_contributions (is_active, govt_approval_status);

-- Enable RLS
ALTER TABLE public.anonymous_health_contributions ENABLE ROW LEVEL SECURITY;

-- Patients: CRUD own contributions
CREATE POLICY "Patients can view own contributions"
ON public.anonymous_health_contributions FOR SELECT
USING (auth.uid() = patient_id);

CREATE POLICY "Patients can insert own contributions"
ON public.anonymous_health_contributions FOR INSERT
WITH CHECK (auth.uid() = patient_id);

CREATE POLICY "Patients can update own contributions"
ON public.anonymous_health_contributions FOR UPDATE
USING (auth.uid() = patient_id);

-- Security-definer view for researchers (hides patient_id)
CREATE OR REPLACE VIEW public.anonymous_pool_view
WITH (security_invoker = false)
AS
SELECT 
  id, contribution_hash, anonymized_data, data_categories,
  disease_categories, age_range, gender, source_jurisdiction,
  govt_approval_status, contributed_at
FROM public.anonymous_health_contributions
WHERE is_active = true
  AND govt_approval_status IN ('not_required', 'approved');

-- Grant researchers SELECT on the view
GRANT SELECT ON public.anonymous_pool_view TO authenticated;

-- Table: global_pool_analytics_cache
CREATE TABLE public.global_pool_analytics_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  metric_type TEXT NOT NULL,
  metric_data JSONB NOT NULL DEFAULT '{}',
  sample_size INTEGER NOT NULL DEFAULT 0,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.global_pool_analytics_cache ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read cache
CREATE POLICY "Authenticated users can read analytics cache"
ON public.global_pool_analytics_cache FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Trigger for updated_at
CREATE TRIGGER update_anon_contributions_updated_at
BEFORE UPDATE ON public.anonymous_health_contributions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
