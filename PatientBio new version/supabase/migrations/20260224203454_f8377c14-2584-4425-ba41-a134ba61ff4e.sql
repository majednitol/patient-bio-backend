-- Allow doctors to create access records for themselves
CREATE POLICY "Doctors can create patient access"
ON public.doctor_patient_access
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = doctor_id);

-- Allow doctors to reactivate their own access records
CREATE POLICY "Doctors can update their patient access"
ON public.doctor_patient_access
FOR UPDATE
TO authenticated
USING (auth.uid() = doctor_id)
WITH CHECK (auth.uid() = doctor_id);