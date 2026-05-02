-- Add doctor_viewed_at column to track when a doctor views a shared report
ALTER TABLE public.pathologist_reports
ADD COLUMN doctor_viewed_at TIMESTAMPTZ DEFAULT NULL;