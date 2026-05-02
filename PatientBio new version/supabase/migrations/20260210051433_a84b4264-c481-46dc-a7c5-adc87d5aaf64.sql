
-- 1. Patients can view their account holder's profile
CREATE POLICY "Patients can view their account holder profiles"
  ON public.user_profiles FOR SELECT
  TO authenticated
  USING (
    user_id IN (
      SELECT account_holder_id FROM public.family_members
      WHERE patient_id = auth.uid()
    )
  );

-- 2. Link request participants can view each other's profiles
CREATE POLICY "Link request participants can view each other profiles"
  ON public.user_profiles FOR SELECT
  TO authenticated
  USING (
    user_id IN (
      SELECT requester_id FROM public.family_link_requests
      WHERE target_patient_id = auth.uid() AND status = 'pending'
    )
    OR
    user_id IN (
      SELECT target_patient_id FROM public.family_link_requests
      WHERE requester_id = auth.uid()
    )
  );
