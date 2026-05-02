-- Security Hardening: Fix exposed tables

-- 1. Restrict hospitals table - only authenticated users can read
DROP POLICY IF EXISTS "Hospitals are viewable by everyone" ON public.hospitals;

CREATE POLICY "Hospitals viewable by authenticated users only"
ON public.hospitals
FOR SELECT
TO authenticated
USING (true);

-- 2. Restrict token_pricing table - only authenticated users can read
DROP POLICY IF EXISTS "Token pricing is viewable by everyone" ON public.token_pricing;

CREATE POLICY "Token pricing viewable by authenticated users only"
ON public.token_pricing
FOR SELECT
TO authenticated
USING (true);