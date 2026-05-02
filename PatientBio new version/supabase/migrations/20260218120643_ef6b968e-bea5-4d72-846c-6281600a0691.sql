-- Study Protocol Templates (system-level, seeded)
CREATE TABLE public.study_protocol_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  study_type TEXT NOT NULL, -- 'observational', 'clinical_trial', 'case_control', 'cohort', 'cross_sectional'
  description TEXT,
  icon_name TEXT DEFAULT 'FlaskConical',
  default_disease_categories TEXT[] DEFAULT '{}',
  default_cohort_filters JSONB DEFAULT '{}',
  default_milestones JSONB NOT NULL DEFAULT '[]', -- [{name, description, order, estimated_days}]
  default_consent_scopes TEXT[] DEFAULT '{}',
  estimated_duration_days INTEGER,
  min_sample_size INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.study_protocol_templates ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read templates
CREATE POLICY "Templates are readable by authenticated users"
ON public.study_protocol_templates FOR SELECT
TO authenticated
USING (is_active = true);

-- Researcher Studies (instances created from templates)
CREATE TABLE public.researcher_studies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  researcher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.study_protocol_templates(id),
  title TEXT NOT NULL,
  study_type TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft', -- 'draft', 'recruiting', 'active', 'analysis', 'completed', 'archived'
  disease_categories TEXT[] DEFAULT '{}',
  cohort_filters JSONB DEFAULT '{}',
  consent_scopes TEXT[] DEFAULT '{}',
  target_sample_size INTEGER,
  current_sample_size INTEGER DEFAULT 0,
  start_date DATE,
  expected_end_date DATE,
  actual_end_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.researcher_studies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Researchers can view own studies"
ON public.researcher_studies FOR SELECT
TO authenticated
USING (researcher_id = auth.uid());

CREATE POLICY "Researchers can create own studies"
ON public.researcher_studies FOR INSERT
TO authenticated
WITH CHECK (researcher_id = auth.uid());

CREATE POLICY "Researchers can update own studies"
ON public.researcher_studies FOR UPDATE
TO authenticated
USING (researcher_id = auth.uid());

CREATE POLICY "Researchers can delete own studies"
ON public.researcher_studies FOR DELETE
TO authenticated
USING (researcher_id = auth.uid());

-- Study Milestones (per-study tracking)
CREATE TABLE public.researcher_study_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  study_id UUID NOT NULL REFERENCES public.researcher_studies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  milestone_order INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'skipped'
  due_date DATE,
  completed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.researcher_study_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Researchers can view own study milestones"
ON public.researcher_study_milestones FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM researcher_studies rs
    WHERE rs.id = study_id AND rs.researcher_id = auth.uid()
  )
);

CREATE POLICY "Researchers can insert own study milestones"
ON public.researcher_study_milestones FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM researcher_studies rs
    WHERE rs.id = study_id AND rs.researcher_id = auth.uid()
  )
);

CREATE POLICY "Researchers can update own study milestones"
ON public.researcher_study_milestones FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM researcher_studies rs
    WHERE rs.id = study_id AND rs.researcher_id = auth.uid()
  )
);

CREATE POLICY "Researchers can delete own study milestones"
ON public.researcher_study_milestones FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM researcher_studies rs
    WHERE rs.id = study_id AND rs.researcher_id = auth.uid()
  )
);

-- Triggers for updated_at
CREATE TRIGGER update_study_protocol_templates_updated_at
BEFORE UPDATE ON public.study_protocol_templates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_researcher_studies_updated_at
BEFORE UPDATE ON public.researcher_studies
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_researcher_study_milestones_updated_at
BEFORE UPDATE ON public.researcher_study_milestones
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed system templates
INSERT INTO public.study_protocol_templates (name, study_type, description, icon_name, default_disease_categories, default_milestones, estimated_duration_days, min_sample_size, default_consent_scopes) VALUES
(
  'Observational Study',
  'observational',
  'Observe and collect data without intervening. Ideal for understanding disease patterns and outcomes in natural settings.',
  'Eye',
  '{}',
  '[{"name":"Protocol Design","description":"Define study objectives, endpoints, and data collection methods","order":1,"estimated_days":14},{"name":"Ethics Approval","description":"Submit and obtain IRB/ethics committee approval","order":2,"estimated_days":30},{"name":"Patient Recruitment","description":"Recruit and consent eligible patients","order":3,"estimated_days":60},{"name":"Data Collection","description":"Collect observational data per protocol","order":4,"estimated_days":90},{"name":"Data Analysis","description":"Analyze collected data and generate findings","order":5,"estimated_days":30},{"name":"Report & Publication","description":"Write up findings and submit for peer review","order":6,"estimated_days":45}]',
  270,
  30,
  '{"prescriptions","lab_results","vitals","diagnoses"}'
),
(
  'Clinical Trial',
  'clinical_trial',
  'Controlled experimental study to evaluate treatment efficacy. Requires rigorous protocol adherence and regulatory compliance.',
  'FlaskConical',
  '{}',
  '[{"name":"Protocol Development","description":"Design trial protocol with primary/secondary endpoints","order":1,"estimated_days":21},{"name":"Regulatory Submission","description":"Submit to regulatory bodies and IRB for approval","order":2,"estimated_days":45},{"name":"Site Preparation","description":"Prepare research sites, train staff, set up data systems","order":3,"estimated_days":30},{"name":"Patient Screening","description":"Screen and enroll eligible patients with informed consent","order":4,"estimated_days":60},{"name":"Intervention Phase","description":"Administer treatment/placebo per randomization","order":5,"estimated_days":120},{"name":"Follow-up","description":"Monitor patients for outcomes and adverse events","order":6,"estimated_days":60},{"name":"Data Lock & Analysis","description":"Lock database, unblind, and perform statistical analysis","order":7,"estimated_days":30},{"name":"Publication","description":"Prepare manuscripts and submit to journals","order":8,"estimated_days":45}]',
  411,
  50,
  '{"prescriptions","lab_results","vitals","diagnoses","medications"}'
),
(
  'Case-Control Study',
  'case_control',
  'Compare patients with a condition (cases) to those without (controls) to identify risk factors. Cost-effective for rare diseases.',
  'GitCompareArrows',
  '{}',
  '[{"name":"Study Design","description":"Define case/control criteria and matching variables","order":1,"estimated_days":14},{"name":"Ethics Approval","description":"Obtain ethics committee approval","order":2,"estimated_days":21},{"name":"Case Identification","description":"Identify and recruit case patients","order":3,"estimated_days":45},{"name":"Control Matching","description":"Select and recruit matched control patients","order":4,"estimated_days":30},{"name":"Data Extraction","description":"Extract and compare exposure histories","order":5,"estimated_days":30},{"name":"Statistical Analysis","description":"Calculate odds ratios and perform regression analysis","order":6,"estimated_days":21},{"name":"Report","description":"Document findings and submit for review","order":7,"estimated_days":30}]',
  191,
  40,
  '{"prescriptions","lab_results","diagnoses"}'
),
(
  'Cohort Study',
  'cohort',
  'Follow a group of patients over time to track disease development and outcomes. Excellent for establishing causality.',
  'Users',
  '{}',
  '[{"name":"Cohort Definition","description":"Define inclusion/exclusion criteria and follow-up schedule","order":1,"estimated_days":14},{"name":"Ethics & Consent","description":"Obtain approvals and develop consent framework","order":2,"estimated_days":21},{"name":"Baseline Assessment","description":"Recruit cohort and collect baseline measurements","order":3,"estimated_days":45},{"name":"Follow-up Period","description":"Track cohort with periodic data collection","order":4,"estimated_days":180},{"name":"Outcome Assessment","description":"Evaluate outcomes and measure endpoints","order":5,"estimated_days":30},{"name":"Analysis & Reporting","description":"Analyze longitudinal data and publish findings","order":6,"estimated_days":45}]',
  335,
  100,
  '{"prescriptions","lab_results","vitals","diagnoses","medications"}'
),
(
  'Cross-Sectional Survey',
  'cross_sectional',
  'Snapshot analysis of a population at a single point in time. Quick and cost-effective for prevalence studies.',
  'BarChart3',
  '{}',
  '[{"name":"Survey Design","description":"Design questionnaire and data collection instruments","order":1,"estimated_days":14},{"name":"Ethics Approval","description":"Obtain rapid ethics review","order":2,"estimated_days":14},{"name":"Sampling","description":"Define sampling strategy and recruit participants","order":3,"estimated_days":21},{"name":"Data Collection","description":"Administer surveys and collect data","order":4,"estimated_days":30},{"name":"Analysis","description":"Perform descriptive and inferential statistics","order":5,"estimated_days":14},{"name":"Report","description":"Summarize findings and publish","order":6,"estimated_days":21}]',
  114,
  200,
  '{"vitals","diagnoses"}'
);