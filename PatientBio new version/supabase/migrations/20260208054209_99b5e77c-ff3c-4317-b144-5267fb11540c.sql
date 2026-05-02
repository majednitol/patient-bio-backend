-- Create ICD-10 codes reference table for international diagnosis coding
CREATE TABLE public.icd10_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  category TEXT,
  chapter TEXT,
  is_billable BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add index for fast lookup
CREATE INDEX idx_icd10_codes_code ON public.icd10_codes(code);
CREATE INDEX idx_icd10_codes_category ON public.icd10_codes(category);

-- Enable RLS (public read access for reference data)
ALTER TABLE public.icd10_codes ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read ICD-10 codes (reference data)
CREATE POLICY "ICD-10 codes are publicly readable"
ON public.icd10_codes
FOR SELECT
USING (true);

-- Insert common ICD-10 codes for MVP
INSERT INTO public.icd10_codes (code, description, category, chapter) VALUES
-- Diabetes
('E10', 'Type 1 diabetes mellitus', 'Diabetes', 'Endocrine'),
('E11', 'Type 2 diabetes mellitus', 'Diabetes', 'Endocrine'),
('E11.9', 'Type 2 diabetes mellitus without complications', 'Diabetes', 'Endocrine'),
-- Hypertension
('I10', 'Essential (primary) hypertension', 'Hypertension', 'Circulatory'),
('I11', 'Hypertensive heart disease', 'Hypertension', 'Circulatory'),
('I12', 'Hypertensive chronic kidney disease', 'Hypertension', 'Circulatory'),
-- Heart Disease
('I20', 'Angina pectoris', 'Heart Disease', 'Circulatory'),
('I21', 'Acute myocardial infarction', 'Heart Disease', 'Circulatory'),
('I25', 'Chronic ischemic heart disease', 'Heart Disease', 'Circulatory'),
('I50', 'Heart failure', 'Heart Disease', 'Circulatory'),
-- Respiratory
('J06', 'Acute upper respiratory infections', 'Respiratory', 'Respiratory'),
('J18', 'Pneumonia, unspecified organism', 'Respiratory', 'Respiratory'),
('J44', 'Chronic obstructive pulmonary disease', 'Respiratory', 'Respiratory'),
('J45', 'Asthma', 'Respiratory', 'Respiratory'),
-- Cancer
('C34', 'Malignant neoplasm of bronchus and lung', 'Cancer', 'Neoplasms'),
('C50', 'Malignant neoplasm of breast', 'Cancer', 'Neoplasms'),
('C61', 'Malignant neoplasm of prostate', 'Cancer', 'Neoplasms'),
('C18', 'Malignant neoplasm of colon', 'Cancer', 'Neoplasms'),
-- Mental Health
('F32', 'Major depressive disorder, single episode', 'Mental Health', 'Mental'),
('F33', 'Major depressive disorder, recurrent', 'Mental Health', 'Mental'),
('F41', 'Other anxiety disorders', 'Mental Health', 'Mental'),
('F41.1', 'Generalized anxiety disorder', 'Mental Health', 'Mental'),
-- COVID-19
('U07.1', 'COVID-19, virus identified', 'COVID-19', 'Special Codes'),
('U07.2', 'COVID-19, virus not identified', 'COVID-19', 'Special Codes'),
-- Common conditions
('K21', 'Gastro-esophageal reflux disease', 'Digestive', 'Digestive'),
('M54', 'Dorsalgia (back pain)', 'Musculoskeletal', 'Musculoskeletal'),
('N18', 'Chronic kidney disease', 'Kidney', 'Genitourinary'),
('G43', 'Migraine', 'Neurological', 'Nervous System'),
('L40', 'Psoriasis', 'Dermatological', 'Skin');

-- Create bulk export jobs table for async FHIR bulk data exports
CREATE TABLE public.bulk_export_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'expired')),
  export_type TEXT NOT NULL DEFAULT 'fhir' CHECK (export_type IN ('fhir', 'ccda', 'ndjson')),
  resource_types TEXT[] DEFAULT ARRAY['Patient', 'Observation', 'Condition', 'MedicationStatement', 'AllergyIntolerance', 'DocumentReference'],
  include_options JSONB DEFAULT '{}',
  output_url TEXT,
  error_message TEXT,
  total_resources INTEGER DEFAULT 0,
  processed_resources INTEGER DEFAULT 0,
  file_size_bytes BIGINT,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for user's jobs lookup
CREATE INDEX idx_bulk_export_jobs_user ON public.bulk_export_jobs(user_id, created_at DESC);
CREATE INDEX idx_bulk_export_jobs_status ON public.bulk_export_jobs(status);

-- Enable RLS
ALTER TABLE public.bulk_export_jobs ENABLE ROW LEVEL SECURITY;

-- Users can only view their own export jobs
CREATE POLICY "Users can view their own export jobs"
ON public.bulk_export_jobs
FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own export jobs
CREATE POLICY "Users can create their own export jobs"
ON public.bulk_export_jobs
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own export jobs
CREATE POLICY "Users can update their own export jobs"
ON public.bulk_export_jobs
FOR UPDATE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_bulk_export_jobs_updated_at
BEFORE UPDATE ON public.bulk_export_jobs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();