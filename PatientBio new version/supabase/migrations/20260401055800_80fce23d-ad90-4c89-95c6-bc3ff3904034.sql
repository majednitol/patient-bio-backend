
-- Add ICD-11 chapter code column to health_records
ALTER TABLE public.health_records ADD COLUMN IF NOT EXISTS icd11_chapter_code text;

-- Index for filtering by ICD-11 chapter
CREATE INDEX IF NOT EXISTS idx_health_records_icd11_chapter ON public.health_records (icd11_chapter_code);

-- Backfill existing records using only valid enum values
UPDATE public.health_records SET icd11_chapter_code = CASE disease_category::text
  WHEN 'cancer' THEN '2'
  WHEN 'covid19' THEN '1'
  WHEN 'diabetes' THEN '5A'
  WHEN 'heart_disease' THEN 'BA'
  WHEN 'general' THEN 'MA'
  ELSE NULL
END
WHERE disease_category IS NOT NULL AND icd11_chapter_code IS NULL;
