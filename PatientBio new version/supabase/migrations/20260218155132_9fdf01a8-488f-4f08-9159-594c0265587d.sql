
-- Allow admins to read access_tokens for the Shared Data monitor
CREATE POLICY "Admins can view all access tokens"
ON public.access_tokens
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to read doctor_pathologist_shares for the Shared Data monitor
CREATE POLICY "Admins can view all pathologist shares"
ON public.doctor_pathologist_shares
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to read doctor_researcher_shares for the Shared Data monitor
CREATE POLICY "Admins can view all researcher shares"
ON public.doctor_researcher_shares
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
