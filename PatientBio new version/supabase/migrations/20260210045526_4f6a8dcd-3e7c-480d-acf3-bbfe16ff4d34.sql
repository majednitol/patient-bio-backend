
-- Create family_link_requests table
CREATE TABLE public.family_link_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL,
  target_patient_id uuid NOT NULL,
  relationship text NOT NULL,
  can_manage_records boolean NOT NULL DEFAULT true,
  can_share_data boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  responded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.family_link_requests ENABLE ROW LEVEL SECURITY;

-- Requesters can insert their own requests
CREATE POLICY "Requesters can create link requests"
ON public.family_link_requests
FOR INSERT
TO authenticated
WITH CHECK (requester_id = auth.uid());

-- Requesters can see their own requests
CREATE POLICY "Requesters can view their requests"
ON public.family_link_requests
FOR SELECT
TO authenticated
USING (requester_id = auth.uid());

-- Target patients can see requests aimed at them
CREATE POLICY "Targets can view incoming requests"
ON public.family_link_requests
FOR SELECT
TO authenticated
USING (target_patient_id = auth.uid());

-- Target patients can update (approve/reject) requests aimed at them
CREATE POLICY "Targets can respond to requests"
ON public.family_link_requests
FOR UPDATE
TO authenticated
USING (target_patient_id = auth.uid())
WITH CHECK (target_patient_id = auth.uid());
