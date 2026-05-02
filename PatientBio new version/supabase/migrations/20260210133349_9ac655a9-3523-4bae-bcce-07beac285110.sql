
-- Medication prices reference table
CREATE TABLE public.medication_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medication_name TEXT NOT NULL,
  avg_price NUMERIC NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'per strip',
  category TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_medication_prices_name ON public.medication_prices (lower(medication_name));

ALTER TABLE public.medication_prices ENABLE ROW LEVEL SECURITY;

-- Everyone can read medication prices (reference data)
CREATE POLICY "Anyone can read medication prices"
  ON public.medication_prices FOR SELECT
  USING (true);

-- Only admins can manage prices
CREATE POLICY "Admins can manage medication prices"
  ON public.medication_prices FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Add spending alert threshold to user_profiles
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS spending_alert_threshold NUMERIC DEFAULT NULL;

-- Seed some common medication prices for demonstration
INSERT INTO public.medication_prices (medication_name, avg_price, unit, category) VALUES
  ('Paracetamol 500mg', 15, 'per strip', 'Analgesic'),
  ('Amoxicillin 500mg', 45, 'per strip', 'Antibiotic'),
  ('Azithromycin 500mg', 72, 'per strip', 'Antibiotic'),
  ('Metformin 500mg', 25, 'per strip', 'Antidiabetic'),
  ('Amlodipine 5mg', 30, 'per strip', 'Antihypertensive'),
  ('Omeprazole 20mg', 35, 'per strip', 'Antacid'),
  ('Cetirizine 10mg', 18, 'per strip', 'Antihistamine'),
  ('Ibuprofen 400mg', 20, 'per strip', 'NSAID'),
  ('Atorvastatin 10mg', 55, 'per strip', 'Statin'),
  ('Pantoprazole 40mg', 42, 'per strip', 'Antacid'),
  ('Ciprofloxacin 500mg', 38, 'per strip', 'Antibiotic'),
  ('Montelukast 10mg', 65, 'per strip', 'Antiasthmatic'),
  ('Losartan 50mg', 40, 'per strip', 'Antihypertensive'),
  ('Metoprolol 50mg', 28, 'per strip', 'Beta Blocker'),
  ('Doxycycline 100mg', 50, 'per strip', 'Antibiotic');
