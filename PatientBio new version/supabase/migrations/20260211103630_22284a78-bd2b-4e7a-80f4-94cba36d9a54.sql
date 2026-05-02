
-- Inter-Department Referral Tracking
CREATE TABLE public.department_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id),
  patient_id UUID NOT NULL,
  from_department_id UUID NOT NULL REFERENCES public.hospital_departments(id),
  to_department_id UUID NOT NULL REFERENCES public.hospital_departments(id),
  referred_by UUID NOT NULL, -- staff user_id
  accepted_by UUID, -- staff user_id who accepted
  status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested', 'accepted', 'in_progress', 'completed', 'cancelled')),
  reason TEXT NOT NULL,
  clinical_notes TEXT,
  urgency TEXT NOT NULL DEFAULT 'routine' CHECK (urgency IN ('routine', 'urgent', 'emergency')),
  response_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_dept_referrals_hospital ON public.department_referrals(hospital_id);
CREATE INDEX idx_dept_referrals_from ON public.department_referrals(from_department_id, status);
CREATE INDEX idx_dept_referrals_to ON public.department_referrals(to_department_id, status);
CREATE INDEX idx_dept_referrals_patient ON public.department_referrals(patient_id);

-- Enable RLS
ALTER TABLE public.department_referrals ENABLE ROW LEVEL SECURITY;

-- RLS: Hospital staff can view referrals for their hospital
CREATE POLICY "Hospital staff can view department referrals"
ON public.department_referrals FOR SELECT
TO authenticated
USING (public.is_hospital_staff(auth.uid(), hospital_id));

-- RLS: Hospital staff can create referrals
CREATE POLICY "Hospital staff can create department referrals"
ON public.department_referrals FOR INSERT
TO authenticated
WITH CHECK (public.is_hospital_staff(auth.uid(), hospital_id));

-- RLS: Hospital staff can update referrals for their hospital
CREATE POLICY "Hospital staff can update department referrals"
ON public.department_referrals FOR UPDATE
TO authenticated
USING (public.is_hospital_staff(auth.uid(), hospital_id));

-- Timestamp trigger
CREATE TRIGGER update_department_referrals_updated_at
BEFORE UPDATE ON public.department_referrals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.department_referrals;
