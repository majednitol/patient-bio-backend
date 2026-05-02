
-- 1. Insurance Plans reference table
CREATE TABLE public.insurance_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_name TEXT NOT NULL,
  provider_name TEXT NOT NULL,
  coverage_type TEXT NOT NULL DEFAULT 'basic',
  coverage_percentage NUMERIC NOT NULL DEFAULT 0 CHECK (coverage_percentage >= 0 AND coverage_percentage <= 100),
  max_annual_limit NUMERIC DEFAULT NULL,
  covers_consultation BOOLEAN DEFAULT true,
  covers_medication BOOLEAN DEFAULT true,
  covers_lab_tests BOOLEAN DEFAULT true,
  covers_hospitalization BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.insurance_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read insurance plans" ON public.insurance_plans FOR SELECT USING (true);
CREATE POLICY "Admins can manage insurance plans" ON public.insurance_plans FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Add patient_insurance_plan_id to user_profiles
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS insurance_plan_id UUID REFERENCES public.insurance_plans(id) DEFAULT NULL;

-- Seed some common plans
INSERT INTO public.insurance_plans (plan_name, provider_name, coverage_type, coverage_percentage, max_annual_limit) VALUES
  ('Basic Health Cover', 'National Health Insurance', 'basic', 50, 100000),
  ('Premium Health Plan', 'MediShield Plus', 'premium', 80, 500000),
  ('Corporate Group Plan', 'Corporate Health Corp', 'corporate', 70, 300000),
  ('Senior Citizen Plan', 'Elder Care Insurance', 'senior', 60, 200000);

-- 2. Consent Templates table
CREATE TABLE public.consent_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  consent_type TEXT NOT NULL DEFAULT 'data_sharing',
  granted_to_type TEXT DEFAULT NULL,
  scope TEXT[] NOT NULL DEFAULT '{}',
  purpose TEXT NOT NULL,
  expiry_days INTEGER DEFAULT NULL,
  icon_name TEXT DEFAULT 'Shield',
  is_active BOOLEAN DEFAULT true,
  created_by UUID DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.consent_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read active templates" ON public.consent_templates FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage templates" ON public.consent_templates FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Seed default templates
INSERT INTO public.consent_templates (name, description, consent_type, granted_to_type, scope, purpose, expiry_days, icon_name) VALUES
  ('Full Doctor Access', 'Complete health records access for your primary doctor', 'data_sharing', 'doctor', ARRAY['profile','health_data','health_records','lab_results'], 'Full access for primary care doctor', NULL, 'Stethoscope'),
  ('Lab Results Only (30 days)', 'Share lab results with a pathologist for one month', 'data_sharing', 'pathologist', ARRAY['lab_results'], 'Temporary lab results access for pathologist review', 30, 'FlaskConical'),
  ('Emergency Access', 'Critical health info for emergency responders', 'emergency_access', 'emergency_services', ARRAY['profile','health_data'], 'Emergency access to critical health information', 365, 'Shield'),
  ('Hospital Visit (90 days)', 'Full records for a hospital admission', 'data_sharing', 'hospital', ARRAY['profile','health_data','health_records','lab_results'], 'Hospital admission and treatment access', 90, 'Clock'),
  ('Surgery Prep (30 days)', 'Pre-surgery records access for surgical team', 'data_sharing', 'doctor', ARRAY['profile','health_data','health_records','lab_results'], 'Pre-operative assessment and surgery planning', 30, 'HeartPulse'),
  ('Second Opinion (7 days)', 'Share diagnosis records for a second medical opinion', 'data_sharing', 'doctor', ARRAY['health_records'], 'Second opinion consultation on diagnosis', 7, 'MessageSquare'),
  ('Research Participation', 'Anonymized data sharing for medical research', 'research_participation', 'researcher', ARRAY['health_data','health_records'], 'Contributing to medical research studies', NULL, 'Microscope');

-- 3. Sync Conflicts table
CREATE TABLE public.sync_conflicts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID DEFAULT NULL,
  local_data JSONB NOT NULL DEFAULT '{}',
  remote_data JSONB NOT NULL DEFAULT '{}',
  source_system TEXT DEFAULT NULL,
  conflict_fields TEXT[] NOT NULL DEFAULT '{}',
  resolution TEXT DEFAULT NULL CHECK (resolution IN ('keep_local', 'keep_remote', 'manual_merge', NULL)),
  resolved_at TIMESTAMPTZ DEFAULT NULL,
  resolved_by UUID DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.sync_conflicts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own sync conflicts" ON public.sync_conflicts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own sync conflicts" ON public.sync_conflicts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "System can insert sync conflicts" ON public.sync_conflicts FOR INSERT WITH CHECK (true);

-- 4. Patient Merge History table
CREATE TABLE public.patient_merge_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  merge_candidate_id UUID DEFAULT NULL,
  kept_patient_id UUID NOT NULL,
  merged_patient_id UUID NOT NULL,
  merged_by UUID NOT NULL,
  snapshot_before JSONB NOT NULL DEFAULT '{}',
  records_moved JSONB NOT NULL DEFAULT '{}',
  is_undone BOOLEAN DEFAULT false,
  undone_at TIMESTAMPTZ DEFAULT NULL,
  undone_by UUID DEFAULT NULL,
  undo_deadline TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.patient_merge_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Hospital staff can view merge history" ON public.patient_merge_history FOR SELECT USING (public.is_hospital_staff(auth.uid()));
CREATE POLICY "Hospital staff can insert merge history" ON public.patient_merge_history FOR INSERT WITH CHECK (public.is_hospital_staff(auth.uid()));
CREATE POLICY "Hospital staff can update merge history" ON public.patient_merge_history FOR UPDATE USING (public.is_hospital_staff(auth.uid()));

CREATE INDEX idx_merge_history_kept ON public.patient_merge_history(kept_patient_id);
CREATE INDEX idx_merge_history_merged ON public.patient_merge_history(merged_patient_id);
CREATE INDEX idx_sync_conflicts_user ON public.sync_conflicts(user_id, created_at DESC);
