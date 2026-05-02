-- Add ICD-11 code columns to prescriptions table
ALTER TABLE public.prescriptions
  ADD COLUMN IF NOT EXISTS icd11_code TEXT,
  ADD COLUMN IF NOT EXISTS icd11_chapter_code TEXT,
  ADD COLUMN IF NOT EXISTS icd_standard TEXT DEFAULT NULL;

-- Add index for chapter-based filtering
CREATE INDEX IF NOT EXISTS idx_prescriptions_icd11_chapter ON public.prescriptions (icd11_chapter_code) WHERE icd11_chapter_code IS NOT NULL;

-- Add index for specific code lookups
CREATE INDEX IF NOT EXISTS idx_prescriptions_icd11_code ON public.prescriptions (icd11_code) WHERE icd11_code IS NOT NULL;

-- Also add icd11_code to health_records if not already present (for specific code storage beyond chapter)
ALTER TABLE public.health_records
  ADD COLUMN IF NOT EXISTS icd11_code TEXT,
  ADD COLUMN IF NOT EXISTS icd_standard TEXT DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_health_records_icd11_code ON public.health_records (icd11_code) WHERE icd11_code IS NOT NULL;