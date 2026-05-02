-- Allow doctors to create appointments for their connected patients
CREATE POLICY "Doctors can create appointments for connected patients"
ON public.appointments
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = doctor_id
  AND public.has_active_doctor_access(auth.uid(), patient_id)
);
