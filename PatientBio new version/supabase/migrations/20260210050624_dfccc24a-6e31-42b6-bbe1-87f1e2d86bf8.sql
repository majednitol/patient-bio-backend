
-- 1. Add expires_at column to family_link_requests
ALTER TABLE public.family_link_requests
  ADD COLUMN IF NOT EXISTS expires_at timestamptz DEFAULT (now() + interval '30 days');

-- 2. DELETE policy: requester can cancel their own pending requests
CREATE POLICY "Requester can cancel pending requests"
  ON public.family_link_requests FOR DELETE
  TO authenticated
  USING (requester_id = auth.uid() AND status = 'pending');

-- 3. DELETE policy: either party can remove a family_members link
CREATE POLICY "Account holder can remove family member"
  ON public.family_members FOR DELETE
  TO authenticated
  USING (account_holder_id = auth.uid());

CREATE POLICY "Patient can revoke family access"
  ON public.family_members FOR DELETE
  TO authenticated
  USING (patient_id = auth.uid());
