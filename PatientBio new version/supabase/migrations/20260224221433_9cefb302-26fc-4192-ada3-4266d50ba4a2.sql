
-- Add aliases column
ALTER TABLE public.icd10_codes ADD COLUMN IF NOT EXISTS aliases text[] DEFAULT '{}';

-- Create GIN index for fast alias lookups
CREATE INDEX IF NOT EXISTS idx_icd10_aliases ON public.icd10_codes USING GIN (aliases);

-- Create index on description for faster ILIKE searches
CREATE INDEX IF NOT EXISTS idx_icd10_description ON public.icd10_codes USING btree (lower(description) text_pattern_ops);

-- Create index on code for faster lookups
CREATE INDEX IF NOT EXISTS idx_icd10_code ON public.icd10_codes USING btree (code text_pattern_ops);
