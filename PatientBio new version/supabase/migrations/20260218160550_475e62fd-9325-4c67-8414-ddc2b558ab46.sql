
-- Allow admins to read health_records for Disease Analytics
CREATE POLICY "Admins can view all health records"
ON public.health_records
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to read prescriptions for Disease Analytics
CREATE POLICY "Admins can view all prescriptions"
ON public.prescriptions
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
