
-- Add research-grade columns to clinical tables
ALTER TABLE public.patient_clinical_investigations 
  ADD COLUMN IF NOT EXISTS has_abnormal_values BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS loinc_code TEXT;

ALTER TABLE public.patient_comorbidities 
  ADD COLUMN IF NOT EXISTS icd10_mappings JSONB DEFAULT '{}';

ALTER TABLE public.patient_complications_status 
  ADD COLUMN IF NOT EXISTS icd10_mappings JSONB DEFAULT '{}';

ALTER TABLE public.user_profiles 
  ADD COLUMN IF NOT EXISTS clinical_completeness_score INTEGER DEFAULT 0;
