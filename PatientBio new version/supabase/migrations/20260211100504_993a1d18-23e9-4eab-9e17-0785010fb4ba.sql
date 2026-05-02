
-- Staff Shifts table for weekly shift planning
CREATE TABLE public.staff_shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES public.hospital_staff(id) ON DELETE CASCADE,
  shift_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  shift_type TEXT NOT NULL DEFAULT 'regular' CHECK (shift_type IN ('morning', 'afternoon', 'night', 'regular', 'on_call')),
  notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(staff_id, shift_date, start_time)
);

-- Indexes for performance
CREATE INDEX idx_staff_shifts_hospital_date ON public.staff_shifts(hospital_id, shift_date);
CREATE INDEX idx_staff_shifts_staff_date ON public.staff_shifts(staff_id, shift_date);

-- Enable RLS
ALTER TABLE public.staff_shifts ENABLE ROW LEVEL SECURITY;

-- RLS: Hospital staff can view shifts for their hospital
CREATE POLICY "Hospital staff can view shifts"
  ON public.staff_shifts FOR SELECT
  USING (public.is_hospital_staff(auth.uid(), hospital_id));

-- RLS: Hospital admins can insert shifts
CREATE POLICY "Hospital admins can insert shifts"
  ON public.staff_shifts FOR INSERT
  WITH CHECK (public.is_hospital_admin(auth.uid(), hospital_id));

-- RLS: Hospital admins can update shifts
CREATE POLICY "Hospital admins can update shifts"
  ON public.staff_shifts FOR UPDATE
  USING (public.is_hospital_admin(auth.uid(), hospital_id));

-- RLS: Hospital admins can delete shifts
CREATE POLICY "Hospital admins can delete shifts"
  ON public.staff_shifts FOR DELETE
  USING (public.is_hospital_admin(auth.uid(), hospital_id));

-- Updated_at trigger
CREATE TRIGGER update_staff_shifts_updated_at
  BEFORE UPDATE ON public.staff_shifts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
