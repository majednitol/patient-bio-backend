
-- Add OCR tracking columns to health_records
ALTER TABLE public.health_records
  ADD COLUMN IF NOT EXISTS ocr_status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS ocr_extracted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ocr_confidence NUMERIC,
  ADD COLUMN IF NOT EXISTS ocr_field_confidences JSONB,
  ADD COLUMN IF NOT EXISTS ocr_extracted_text TEXT,
  ADD COLUMN IF NOT EXISTS ocr_clinical_data JSONB,
  ADD COLUMN IF NOT EXISTS ocr_abnormal_flags JSONB;

-- Index for batch OCR queries
CREATE INDEX IF NOT EXISTS idx_health_records_ocr_status ON public.health_records (ocr_status) WHERE ocr_status = 'pending';
