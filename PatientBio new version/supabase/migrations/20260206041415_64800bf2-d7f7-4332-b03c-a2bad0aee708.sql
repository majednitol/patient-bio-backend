-- Create hospital_departments table
CREATE TABLE public.hospital_departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  head_staff_id UUID REFERENCES public.hospital_staff(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(hospital_id, name)
);

-- Add department_id to hospital_staff (keep existing department text for backward compatibility)
ALTER TABLE public.hospital_staff 
ADD COLUMN department_id UUID REFERENCES public.hospital_departments(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.hospital_departments ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Staff can view departments for their hospital
CREATE POLICY "Hospital staff can view their departments"
ON public.hospital_departments
FOR SELECT
USING (
  public.is_hospital_staff(auth.uid(), hospital_id)
);

-- Only admins can insert departments
CREATE POLICY "Hospital admins can create departments"
ON public.hospital_departments
FOR INSERT
WITH CHECK (
  public.is_hospital_admin(auth.uid(), hospital_id)
);

-- Only admins can update departments
CREATE POLICY "Hospital admins can update departments"
ON public.hospital_departments
FOR UPDATE
USING (
  public.is_hospital_admin(auth.uid(), hospital_id)
);

-- Only admins can delete departments
CREATE POLICY "Hospital admins can delete departments"
ON public.hospital_departments
FOR DELETE
USING (
  public.is_hospital_admin(auth.uid(), hospital_id)
);

-- Trigger for updated_at
CREATE TRIGGER update_hospital_departments_updated_at
BEFORE UPDATE ON public.hospital_departments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();