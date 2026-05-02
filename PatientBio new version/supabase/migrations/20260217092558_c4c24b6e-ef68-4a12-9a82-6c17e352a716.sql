-- Create a secure view that excludes emergency_pin_hash
CREATE OR REPLACE VIEW public.emergency_tokens_safe AS
SELECT 
  id, patient_id, emergency_token, access_level, 
  expires_at, created_at, accessed_at, access_count, 
  is_active, created_by, responder_identifier,
  -- Expose whether a PIN is set, but not the hash itself
  (emergency_pin_hash IS NOT NULL) AS has_pin
FROM public.emergency_access_tokens;

-- Grant access to authenticated users
GRANT SELECT ON public.emergency_tokens_safe TO authenticated;

-- For emergency_pin_attempts: add a restrictive policy so no client can access it
-- (it's service-role only, used by edge functions)
CREATE POLICY "No direct client access to pin attempts"
ON public.emergency_pin_attempts
FOR ALL
TO authenticated
USING (false);
