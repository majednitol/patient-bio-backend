-- Add abnormal result tracking to pathologist_reports
ALTER TABLE public.pathologist_reports 
ADD COLUMN IF NOT EXISTS has_abnormal_values BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS abnormal_flags JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS doctor_notified_at TIMESTAMPTZ DEFAULT NULL;

-- Create a function to check if results need to trigger notification
CREATE OR REPLACE FUNCTION public.should_notify_doctor_abnormal_result(report_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  report_record RECORD;
BEGIN
  SELECT has_abnormal_values, doctor_id, doctor_notified_at, is_shared_with_doctor
  INTO report_record
  FROM pathologist_reports
  WHERE id = report_id;
  
  -- Notify if: has abnormal values AND has referring doctor AND not yet notified AND shared with doctor
  RETURN report_record.has_abnormal_values = true 
    AND report_record.doctor_id IS NOT NULL 
    AND report_record.doctor_notified_at IS NULL
    AND report_record.is_shared_with_doctor = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Add index for quick lookup of reports with abnormal values
CREATE INDEX IF NOT EXISTS idx_pathologist_reports_abnormal 
ON pathologist_reports(pathologist_id, has_abnormal_values) 
WHERE has_abnormal_values = true;

COMMENT ON COLUMN pathologist_reports.has_abnormal_values IS 'True if any test results are outside normal reference ranges';
COMMENT ON COLUMN pathologist_reports.abnormal_flags IS 'JSON array of abnormal parameters [{name, value, unit, reference_range, severity}]';
COMMENT ON COLUMN pathologist_reports.doctor_notified_at IS 'Timestamp when referring doctor was notified of abnormal results';