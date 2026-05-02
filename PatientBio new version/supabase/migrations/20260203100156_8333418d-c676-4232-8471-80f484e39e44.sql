-- Extend app_role enum to include hospital_admin and doctor roles
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'hospital_admin';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'doctor';

-- Create hospitals table for multi-tenant support
CREATE TABLE public.hospitals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  registration_number TEXT UNIQUE,
  address TEXT,
  city TEXT,
  state TEXT,
  country TEXT DEFAULT 'India',
  phone TEXT,
  email TEXT,
  website TEXT,
  logo_url TEXT,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create hospital_staff table to link users to hospitals with roles
CREATE TABLE public.hospital_staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'doctor' CHECK (role IN ('admin', 'doctor', 'receptionist', 'nurse')),
  department TEXT,
  employee_id TEXT,
  is_active BOOLEAN DEFAULT true,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(hospital_id, user_id)
);

-- Create doctor_profiles table for doctor-specific information
CREATE TABLE public.doctor_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  license_number TEXT,
  specialty TEXT,
  qualification TEXT,
  experience_years INTEGER,
  consultation_fee DECIMAL(10,2),
  bio TEXT,
  avatar_url TEXT,
  phone TEXT,
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create doctor_applications table for self-registration requests
CREATE TABLE public.doctor_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  license_number TEXT,
  specialty TEXT,
  qualification TEXT,
  experience_years INTEGER,
  phone TEXT,
  cover_letter TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(hospital_id, user_id)
);

-- Enable RLS on all tables
ALTER TABLE public.hospitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hospital_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctor_applications ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user is hospital admin
CREATE OR REPLACE FUNCTION public.is_hospital_admin(_user_id UUID, _hospital_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.hospital_staff
    WHERE user_id = _user_id 
    AND hospital_id = _hospital_id 
    AND role = 'admin'
    AND is_active = true
  )
$$;

-- Helper function to check if user belongs to hospital
CREATE OR REPLACE FUNCTION public.is_hospital_staff(_user_id UUID, _hospital_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.hospital_staff
    WHERE user_id = _user_id 
    AND hospital_id = _hospital_id 
    AND is_active = true
  )
$$;

-- RLS Policies for hospitals
CREATE POLICY "Anyone can view active hospitals"
  ON public.hospitals FOR SELECT
  USING (is_active = true);

CREATE POLICY "Authenticated users can create hospitals"
  ON public.hospitals FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Hospital admins can update their hospital"
  ON public.hospitals FOR UPDATE
  USING (is_hospital_admin(auth.uid(), id));

-- RLS Policies for hospital_staff
CREATE POLICY "Staff can view their hospital colleagues"
  ON public.hospital_staff FOR SELECT
  USING (is_hospital_staff(auth.uid(), hospital_id) OR user_id = auth.uid());

CREATE POLICY "Hospital admins can manage staff"
  ON public.hospital_staff FOR INSERT
  WITH CHECK (is_hospital_admin(auth.uid(), hospital_id));

CREATE POLICY "Hospital admins can update staff"
  ON public.hospital_staff FOR UPDATE
  USING (is_hospital_admin(auth.uid(), hospital_id));

CREATE POLICY "Hospital admins can remove staff"
  ON public.hospital_staff FOR DELETE
  USING (is_hospital_admin(auth.uid(), hospital_id));

-- RLS Policies for doctor_profiles
CREATE POLICY "Anyone can view verified doctor profiles"
  ON public.doctor_profiles FOR SELECT
  USING (is_verified = true OR user_id = auth.uid());

CREATE POLICY "Users can create own doctor profile"
  ON public.doctor_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own doctor profile"
  ON public.doctor_profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for doctor_applications
CREATE POLICY "Applicants can view own applications"
  ON public.doctor_applications FOR SELECT
  USING (user_id = auth.uid() OR is_hospital_admin(auth.uid(), hospital_id));

CREATE POLICY "Users can apply to hospitals"
  ON public.doctor_applications FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Hospital admins can update applications"
  ON public.doctor_applications FOR UPDATE
  USING (is_hospital_admin(auth.uid(), hospital_id));

-- Trigger to update updated_at columns
CREATE TRIGGER update_hospitals_updated_at
  BEFORE UPDATE ON public.hospitals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_hospital_staff_updated_at
  BEFORE UPDATE ON public.hospital_staff
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_doctor_profiles_updated_at
  BEFORE UPDATE ON public.doctor_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_doctor_applications_updated_at
  BEFORE UPDATE ON public.doctor_applications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();