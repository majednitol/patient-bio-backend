-- Fix the security definer view by setting it to SECURITY INVOKER
ALTER VIEW public.emergency_tokens_safe SET (security_invoker = true);