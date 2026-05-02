-- Security Hardening: Comprehensive RLS policy fixes

-- 1. Fix hospitals table - drop any existing public policy and create authenticated-only
DROP POLICY IF EXISTS "Hospitals are viewable by everyone" ON public.hospitals;
DROP POLICY IF EXISTS "Hospitals viewable by authenticated users only" ON public.hospitals;

CREATE POLICY "Hospitals viewable by authenticated users"
ON public.hospitals
FOR SELECT
TO authenticated
USING (true);

-- 2. Fix token_pricing table - authenticated users only
DROP POLICY IF EXISTS "Token pricing is viewable by everyone" ON public.token_pricing;
DROP POLICY IF EXISTS "Token pricing viewable by authenticated users only" ON public.token_pricing;

CREATE POLICY "Token pricing viewable by authenticated users"
ON public.token_pricing
FOR SELECT
TO authenticated
USING (true);

-- 3. Restrict patient_id_sequences to admin/system only
DROP POLICY IF EXISTS "Authenticated users can read sequences" ON public.patient_id_sequences;

-- Only allow reading via the trigger function (no direct access needed)
-- Keep RLS enabled but remove SELECT for regular users

-- 4. Add published filter to site_content if column exists
-- (Skip if already public content only - info level issue)