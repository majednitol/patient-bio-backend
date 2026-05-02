-- Create staff_invitations table for tracking pending staff invitations
CREATE TABLE public.staff_invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  role TEXT NOT NULL DEFAULT 'receptionist',
  department TEXT,
  employee_id TEXT,
  invited_by UUID NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '24 hours'),
  accepted_at TIMESTAMP WITH TIME ZONE,
  accepted_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add indexes for common lookups
CREATE INDEX idx_staff_invitations_hospital ON public.staff_invitations(hospital_id);
CREATE INDEX idx_staff_invitations_email ON public.staff_invitations(email);
CREATE INDEX idx_staff_invitations_token ON public.staff_invitations(token);

-- Enable RLS
ALTER TABLE public.staff_invitations ENABLE ROW LEVEL SECURITY;

-- Hospital admins can view invitations for their hospital
CREATE POLICY "Hospital admins can view staff invitations"
ON public.staff_invitations FOR SELECT
USING (
  is_hospital_admin(auth.uid(), hospital_id)
  OR lower(email) = lower(auth.jwt()->>'email')
);

-- Hospital admins can create invitations
CREATE POLICY "Hospital admins can create staff invitations"
ON public.staff_invitations FOR INSERT
WITH CHECK (
  is_hospital_admin(auth.uid(), hospital_id)
);

-- Hospital admins can update invitations (resend, cancel)
CREATE POLICY "Hospital admins can update staff invitations"
ON public.staff_invitations FOR UPDATE
USING (
  is_hospital_admin(auth.uid(), hospital_id)
  OR lower(email) = lower(auth.jwt()->>'email')
);

-- Hospital admins can delete invitations
CREATE POLICY "Hospital admins can delete staff invitations"
ON public.staff_invitations FOR DELETE
USING (
  is_hospital_admin(auth.uid(), hospital_id)
);

-- Trigger for updated_at
CREATE TRIGGER update_staff_invitations_updated_at
BEFORE UPDATE ON public.staff_invitations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to check if user exists by email (for staff lookup)
CREATE OR REPLACE FUNCTION public.get_user_id_by_email(p_email TEXT)
RETURNS UUID
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT id FROM auth.users WHERE lower(email) = lower(p_email) LIMIT 1;
$$;