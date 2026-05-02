-- Drop the existing INSERT policy
DROP POLICY IF EXISTS "Hospital admins can manage staff" ON public.hospital_staff;

-- Create new INSERT policy that allows hospital creators to add themselves
CREATE POLICY "Hospital admins or creators can add staff"
ON public.hospital_staff FOR INSERT
WITH CHECK (
  is_hospital_admin(auth.uid(), hospital_id) 
  OR (
    user_id = auth.uid() 
    AND EXISTS (
      SELECT 1 FROM public.hospitals 
      WHERE id = hospital_id AND created_by = auth.uid()
    )
  )
);