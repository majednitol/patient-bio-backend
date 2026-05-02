-- Create family_members table for managing patient accounts by family members/guardians
CREATE TABLE public.family_members (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    account_holder_id uuid NOT NULL,
    patient_id uuid NOT NULL,
    relationship text NOT NULL,
    is_primary boolean DEFAULT true,
    can_manage_records boolean DEFAULT true,
    can_share_data boolean DEFAULT true,
    claimed_at timestamp with time zone,
    claimed_by_user_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    UNIQUE (account_holder_id, patient_id)
);

-- Enable RLS
ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check if user is hospital staff
CREATE OR REPLACE FUNCTION public.is_hospital_staff(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.hospital_staff
        WHERE user_id = _user_id AND is_active = true
    )
$$;

-- RLS Policies

-- Users can view their own family relationships (as account holder or patient)
CREATE POLICY "Users can view their family relationships"
ON public.family_members
FOR SELECT
TO authenticated
USING (account_holder_id = auth.uid() OR patient_id = auth.uid());

-- Hospital staff can create family relationships during patient registration
CREATE POLICY "Hospital staff can create family relationships"
ON public.family_members
FOR INSERT
TO authenticated
WITH CHECK (public.is_hospital_staff(auth.uid()));

-- Account holders can update their managed relationships
CREATE POLICY "Account holders can update family relationships"
ON public.family_members
FOR UPDATE
TO authenticated
USING (account_holder_id = auth.uid());

-- Patients can update their own record (for claiming)
CREATE POLICY "Patients can claim their account"
ON public.family_members
FOR UPDATE
TO authenticated
USING (patient_id = auth.uid());

-- Create trigger for updated_at
CREATE TRIGGER update_family_members_updated_at
BEFORE UPDATE ON public.family_members
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();