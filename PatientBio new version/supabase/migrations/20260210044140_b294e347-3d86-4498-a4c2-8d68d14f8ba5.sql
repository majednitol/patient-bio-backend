
-- Allow patients to insert guest profiles for family members
CREATE POLICY "Users can insert guest family member profiles"
ON public.user_profiles FOR INSERT
TO authenticated
WITH CHECK (is_guest_patient = true);

-- Allow patients to create family relationships for themselves
CREATE POLICY "Users can create family relationships"
ON public.family_members FOR INSERT
TO authenticated
WITH CHECK (account_holder_id = auth.uid());

-- Allow account holders to view family member profiles
CREATE POLICY "Account holders can view family member profiles"
ON public.user_profiles FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.family_members
    WHERE family_members.account_holder_id = auth.uid()
    AND family_members.patient_id = user_profiles.user_id
  )
);
