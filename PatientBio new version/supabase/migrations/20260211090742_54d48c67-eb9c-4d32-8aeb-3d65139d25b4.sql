ALTER TABLE public.pathologist_reports
ADD COLUMN patient_viewed_at TIMESTAMPTZ DEFAULT NULL;