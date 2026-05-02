-- ============================================
-- Global Health Passport ID System
-- ============================================

-- 1. Create sequence tracking table for atomic ID generation
CREATE TABLE IF NOT EXISTS public.patient_id_sequences (
  year_month TEXT PRIMARY KEY,
  last_sequence INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on sequence table (only system can modify)
ALTER TABLE public.patient_id_sequences ENABLE ROW LEVEL SECURITY;

-- Only allow authenticated users to read (for debugging), no direct writes
CREATE POLICY "Allow read access for authenticated users"
ON public.patient_id_sequences FOR SELECT
TO authenticated
USING (true);

-- 2. Add patient_passport_id column to user_profiles
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS patient_passport_id TEXT UNIQUE;

-- 3. Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_patient_passport_id 
ON public.user_profiles(patient_passport_id);

-- 4. Luhn check digit calculation function
CREATE OR REPLACE FUNCTION public.calculate_luhn_check_digit(input_str TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $$
DECLARE
  digits TEXT;
  sum_val INTEGER := 0;
  digit INTEGER;
  i INTEGER;
  len INTEGER;
  double_digit INTEGER;
BEGIN
  -- Extract only numeric characters
  digits := regexp_replace(input_str, '[^0-9]', '', 'g');
  len := length(digits);
  
  -- Luhn algorithm (from right to left, double every second digit)
  FOR i IN REVERSE len..1 LOOP
    digit := CAST(substring(digits FROM i FOR 1) AS INTEGER);
    IF (len - i) % 2 = 1 THEN
      double_digit := digit * 2;
      IF double_digit > 9 THEN
        double_digit := double_digit - 9;
      END IF;
      sum_val := sum_val + double_digit;
    ELSE
      sum_val := sum_val + digit;
    END IF;
  END LOOP;
  
  -- Return check digit that makes sum divisible by 10
  RETURN (10 - (sum_val % 10)) % 10;
END;
$$;

-- 5. Generate unique Patient Passport ID function
CREATE OR REPLACE FUNCTION public.generate_patient_passport_id()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_year_month TEXT;
  v_sequence INTEGER;
  v_base_id TEXT;
  v_check_digit INTEGER;
  v_passport_id TEXT;
BEGIN
  -- Get current year-month in YYYYMM format
  v_year_month := to_char(CURRENT_DATE, 'YYYYMM');
  
  -- Atomically get and increment the sequence
  INSERT INTO patient_id_sequences (year_month, last_sequence, updated_at)
  VALUES (v_year_month, 1, now())
  ON CONFLICT (year_month) DO UPDATE
  SET last_sequence = patient_id_sequences.last_sequence + 1,
      updated_at = now()
  RETURNING last_sequence INTO v_sequence;
  
  -- Format: PB-YYYYMM-XXXXXX (base for checksum)
  v_base_id := v_year_month || LPAD(v_sequence::TEXT, 6, '0');
  
  -- Calculate Luhn check digit
  v_check_digit := calculate_luhn_check_digit(v_base_id);
  
  -- Final format: PB-YYYYMM-XXXXXX-C
  v_passport_id := 'PB-' || v_year_month || '-' || LPAD(v_sequence::TEXT, 6, '0') || '-' || v_check_digit::TEXT;
  
  RETURN v_passport_id;
END;
$$;

-- 6. Trigger function to auto-generate Passport ID on profile insert
CREATE OR REPLACE FUNCTION public.set_patient_passport_id_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only generate if not already set
  IF NEW.patient_passport_id IS NULL THEN
    NEW.patient_passport_id := generate_patient_passport_id();
  END IF;
  RETURN NEW;
END;
$$;

-- 7. Create trigger on user_profiles
DROP TRIGGER IF EXISTS trigger_set_patient_passport_id ON public.user_profiles;
CREATE TRIGGER trigger_set_patient_passport_id
BEFORE INSERT ON public.user_profiles
FOR EACH ROW
EXECUTE FUNCTION public.set_patient_passport_id_trigger();

-- 8. Backfill existing users with Passport IDs (ordered by created_at)
-- This ensures historical sequence order is maintained
DO $$
DECLARE
  rec RECORD;
  v_passport_id TEXT;
BEGIN
  FOR rec IN 
    SELECT id, created_at 
    FROM user_profiles 
    WHERE patient_passport_id IS NULL 
    ORDER BY created_at ASC
  LOOP
    v_passport_id := generate_patient_passport_id();
    UPDATE user_profiles SET patient_passport_id = v_passport_id WHERE id = rec.id;
  END LOOP;
END;
$$;