
-- Fix: explicitly set SECURITY INVOKER on the view to satisfy linter
ALTER VIEW public.doctor_rating_stats SET (security_invoker = on);
