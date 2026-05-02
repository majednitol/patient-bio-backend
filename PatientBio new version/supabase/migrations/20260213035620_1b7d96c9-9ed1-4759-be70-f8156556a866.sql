
-- 1. Fix doctor_profiles: replace public SELECT with authenticated-only
DROP POLICY IF EXISTS "Anyone can view verified doctor profiles" ON public.doctor_profiles;
CREATE POLICY "Authenticated users can view verified doctors"
  ON public.doctor_profiles FOR SELECT TO authenticated
  USING (is_verified = true OR user_id = auth.uid());

-- 2. Fix pathologist_profiles: replace public SELECT with authenticated-only
DROP POLICY IF EXISTS "Anyone can view verified pathologist profiles" ON public.pathologist_profiles;
CREATE POLICY "Authenticated users can view verified pathologists"
  ON public.pathologist_profiles FOR SELECT TO authenticated
  USING (is_verified = true OR user_id = auth.uid());

-- 3. Fix hospitals: remove public policy, keep authenticated one
DROP POLICY IF EXISTS "Anyone can view active hospitals" ON public.hospitals;

-- 4. Fix medication_prices: replace public SELECT with authenticated
DROP POLICY IF EXISTS "Anyone can read medication prices" ON public.medication_prices;
CREATE POLICY "Authenticated users can read medication prices"
  ON public.medication_prices FOR SELECT TO authenticated
  USING (true);

-- 5. Fix insurance_plans: replace public SELECT with authenticated
DROP POLICY IF EXISTS "Anyone can read insurance plans" ON public.insurance_plans;
CREATE POLICY "Authenticated users can read insurance plans"
  ON public.insurance_plans FOR SELECT TO authenticated
  USING (true);

-- 6. Fix token_pricing: replace public SELECT with authenticated (keep existing authenticated policy)
DROP POLICY IF EXISTS "Anyone can view active pricing" ON public.token_pricing;
