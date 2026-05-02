-- SECURITY HARDENING MIGRATION
-- Fix overly permissive RLS policies and strengthen data access controls

-- 1. Create helper function to check if patient has approved sharing with a specific user
CREATE OR REPLACE FUNCTION public.has_patient_approved_sharing(_patient_id uuid, _requester_id uuid, _requester_type text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.data_access_requests
    WHERE patient_id = _patient_id
      AND requester_id = _requester_id
      AND requester_type = _requester_type
      AND status = 'approved'
  )
$$;

-- 2. Create helper function to check active doctor-patient access
CREATE OR REPLACE FUNCTION public.has_active_doctor_access(_doctor_id uuid, _patient_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.doctor_patient_access
    WHERE doctor_id = _doctor_id
      AND patient_id = _patient_id
      AND is_active = true
  )
$$;

-- 3. Fix access_logs INSERT policy - restrict to own logs only
DROP POLICY IF EXISTS "Authenticated users can log access" ON public.access_logs;
CREATE POLICY "Users can only insert their own access logs"
ON public.access_logs
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 4. Strengthen user_profiles doctor access policy
DROP POLICY IF EXISTS "Doctors can view connected patients profiles" ON public.user_profiles;
CREATE POLICY "Doctors can view actively connected patients profiles"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'doctor') 
  AND public.has_active_doctor_access(auth.uid(), user_id)
);

-- 5. Strengthen hospital staff access to only patients with active admissions/appointments
DROP POLICY IF EXISTS "Hospital staff can view patient profiles" ON public.user_profiles;
CREATE POLICY "Hospital staff can view patients with active relationships"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.hospital_staff hs
    WHERE hs.user_id = auth.uid() AND hs.is_active = true
    AND (
      -- Patient has active admission at this hospital
      EXISTS (
        SELECT 1 FROM public.admissions a
        WHERE a.patient_id = user_profiles.user_id
          AND a.hospital_id = hs.hospital_id
          AND a.status = 'admitted'
      )
      OR
      -- Patient has upcoming appointment at this hospital
      EXISTS (
        SELECT 1 FROM public.appointments apt
        WHERE apt.patient_id = user_profiles.user_id
          AND apt.hospital_id = hs.hospital_id
          AND apt.status IN ('scheduled', 'confirmed')
          AND apt.appointment_date >= CURRENT_DATE
      )
    )
  )
);

-- 6. Add proper health_data access for doctors with active consent
DROP POLICY IF EXISTS "Doctors can view patient health data" ON public.health_data;
CREATE POLICY "Doctors can view health data of actively connected patients"
ON public.health_data
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR (
    public.has_role(auth.uid(), 'doctor')
    AND public.has_active_doctor_access(auth.uid(), user_id)
  )
);

-- 7. Add policy for pathologists to view health data when they have approved shares
DROP POLICY IF EXISTS "Pathologists can view shared patient health data" ON public.health_data;
CREATE POLICY "Pathologists can view shared patient health data"
ON public.health_data
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'pathologist')
  AND EXISTS (
    SELECT 1 FROM public.doctor_pathologist_shares dps
    WHERE dps.patient_id = health_data.user_id
      AND dps.pathologist_id = auth.uid()
      AND dps.status IN ('pending', 'completed')
  )
);

-- 8. Add policy for researchers with approved data access
DROP POLICY IF EXISTS "Researchers can view approved patient health data" ON public.health_data;
CREATE POLICY "Researchers can view approved patient health data"
ON public.health_data
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'researcher')
  AND EXISTS (
    SELECT 1 FROM public.patient_researcher_shares prs
    WHERE prs.patient_id = health_data.user_id
      AND prs.researcher_id = auth.uid()
      AND prs.status = 'approved'
      AND (prs.expires_at IS NULL OR prs.expires_at > now())
  )
);