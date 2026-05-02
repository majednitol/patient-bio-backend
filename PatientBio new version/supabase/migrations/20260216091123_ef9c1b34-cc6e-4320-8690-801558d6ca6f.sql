
-- 1. Rate limiting table for emergency PIN attempts
CREATE TABLE IF NOT EXISTS public.emergency_pin_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_id UUID NOT NULL REFERENCES public.emergency_access_tokens(id) ON DELETE CASCADE,
  failed_attempts INTEGER NOT NULL DEFAULT 0,
  last_attempt_at TIMESTAMPTZ DEFAULT now(),
  locked_until TIMESTAMPTZ,
  UNIQUE(token_id)
);

ALTER TABLE public.emergency_pin_attempts ENABLE ROW LEVEL SECURITY;

-- No client-side access needed - only service role from edge function
-- No RLS policies = deny all client access by default

-- 2. Fix doctor_patient_access INSERT policy: only patients can grant access
DROP POLICY IF EXISTS "Allow insert for authenticated users" ON public.doctor_patient_access;

CREATE POLICY "Patients can grant doctor access"
ON public.doctor_patient_access FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = patient_id);

-- 3. Fix prescriptions INSERT policy: doctors must have active access to the patient
DROP POLICY IF EXISTS "Doctors can create prescriptions" ON public.prescriptions;

CREATE POLICY "Doctors can create prescriptions for their patients"
ON public.prescriptions FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = doctor_id AND 
  public.has_role(auth.uid(), 'doctor') AND
  public.has_active_doctor_access(auth.uid(), patient_id)
);
