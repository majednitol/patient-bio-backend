-- Allow users to self-assign doctor role during onboarding
-- This is secure because:
-- 1. User can only assign to themselves (user_id = auth.uid())
-- 2. Only 'doctor' role can be self-assigned
-- 3. Prevents admin role escalation
CREATE POLICY "Users can self-assign doctor role"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id AND 
  role = 'doctor'
);

-- Fix existing doctors who are missing their role
INSERT INTO public.user_roles (user_id, role)
SELECT user_id, 'doctor'::app_role
FROM public.doctor_profiles
ON CONFLICT (user_id, role) DO NOTHING;