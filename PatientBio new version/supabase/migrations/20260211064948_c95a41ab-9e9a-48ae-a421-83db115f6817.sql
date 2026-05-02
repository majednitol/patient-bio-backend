
-- Create doctor_staff table
CREATE TABLE public.doctor_staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL,
  staff_user_id UUID,
  full_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  role TEXT NOT NULL CHECK (role IN ('nurse', 'receptionist', 'assistant')),
  is_active BOOLEAN DEFAULT true,
  invite_status TEXT DEFAULT 'pending' CHECK (invite_status IN ('pending', 'accepted', 'manual')),
  invite_token UUID DEFAULT gen_random_uuid(),
  permissions JSONB DEFAULT '{"view_patients": true, "manage_appointments": true, "record_vitals": true, "view_prescriptions": true, "create_prescriptions": false, "write_diagnoses": false, "access_health_records": false, "manage_staff": false}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.doctor_staff ENABLE ROW LEVEL SECURITY;

-- Doctors can do everything with their own staff
CREATE POLICY "Doctors can view their own staff"
  ON public.doctor_staff FOR SELECT
  TO authenticated
  USING (doctor_id = auth.uid());

CREATE POLICY "Doctors can insert their own staff"
  ON public.doctor_staff FOR INSERT
  TO authenticated
  WITH CHECK (doctor_id = auth.uid());

CREATE POLICY "Doctors can update their own staff"
  ON public.doctor_staff FOR UPDATE
  TO authenticated
  USING (doctor_id = auth.uid());

CREATE POLICY "Doctors can delete their own staff"
  ON public.doctor_staff FOR DELETE
  TO authenticated
  USING (doctor_id = auth.uid());

-- Staff users can read their own record
CREATE POLICY "Staff can view their own record"
  ON public.doctor_staff FOR SELECT
  TO authenticated
  USING (staff_user_id = auth.uid());

-- Index for performance
CREATE INDEX idx_doctor_staff_doctor_id ON public.doctor_staff (doctor_id);
CREATE INDEX idx_doctor_staff_staff_user_id ON public.doctor_staff (staff_user_id) WHERE staff_user_id IS NOT NULL;
CREATE INDEX idx_doctor_staff_invite_token ON public.doctor_staff (invite_token);

-- Updated_at trigger
CREATE TRIGGER update_doctor_staff_updated_at
  BEFORE UPDATE ON public.doctor_staff
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
