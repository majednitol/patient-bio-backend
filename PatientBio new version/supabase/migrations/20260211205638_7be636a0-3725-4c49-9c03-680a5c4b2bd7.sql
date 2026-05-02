-- Add addenda column to pathologist_reports for version history/amendments
ALTER TABLE public.pathologist_reports
ADD COLUMN addenda JSONB DEFAULT '[]'::jsonb;

-- Create index for faster addenda queries
CREATE INDEX idx_pathologist_reports_addenda ON public.pathologist_reports USING gin(addenda);

-- Add completion_notes to patient_pathologist_shares for Batch 3
ALTER TABLE public.patient_pathologist_shares
ADD COLUMN completion_notes TEXT DEFAULT NULL;