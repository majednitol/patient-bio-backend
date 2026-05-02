ALTER TABLE public.patient_researcher_shares
ADD COLUMN IF NOT EXISTS include_clinical_records boolean DEFAULT false;