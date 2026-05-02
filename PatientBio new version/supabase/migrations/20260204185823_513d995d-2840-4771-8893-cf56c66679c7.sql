-- Add pathologist role to app_role enum
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'pathologist';

-- Create pathologist_profiles table
CREATE TABLE public.pathologist_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  license_number TEXT,
  specialization_area TEXT,
  total_experience INTEGER,
  phone TEXT,
  email TEXT,
  avatar_url TEXT,
  lab_name TEXT,
  lab_address TEXT,
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create doctor_pathologist_shares table for data sharing between doctors and pathologists
CREATE TABLE public.doctor_pathologist_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL,
  pathologist_id UUID NOT NULL,
  patient_id UUID NOT NULL,
  disease_category TEXT,
  prescription_id UUID REFERENCES prescriptions(id) ON DELETE SET NULL,
  notes TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'viewed', 'completed')),
  shared_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Create pathologist_reports table for reports created by pathologists
CREATE TABLE public.pathologist_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pathologist_id UUID NOT NULL,
  patient_id UUID NOT NULL,
  doctor_id UUID,
  report_type TEXT CHECK (report_type IN ('blood_work', 'imaging', 'pathology', 'microbiology', 'cardiology', 'other')),
  report_name TEXT NOT NULL,
  findings TEXT,
  file_url TEXT,
  disease_category TEXT,
  is_shared_with_doctor BOOLEAN DEFAULT false,
  is_shared_with_patient BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pathologist_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctor_pathologist_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pathologist_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies for pathologist_profiles
CREATE POLICY "Users can view own pathologist profile"
  ON public.pathologist_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own pathologist profile"
  ON public.pathologist_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own pathologist profile"
  ON public.pathologist_profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view verified pathologist profiles"
  ON public.pathologist_profiles FOR SELECT
  USING (is_verified = true);

-- RLS Policies for doctor_pathologist_shares
CREATE POLICY "Doctors can create shares to pathologists"
  ON public.doctor_pathologist_shares FOR INSERT
  WITH CHECK (auth.uid() = doctor_id);

CREATE POLICY "Doctors can view their shares"
  ON public.doctor_pathologist_shares FOR SELECT
  USING (auth.uid() = doctor_id);

CREATE POLICY "Pathologists can view shares to them"
  ON public.doctor_pathologist_shares FOR SELECT
  USING (auth.uid() = pathologist_id);

CREATE POLICY "Pathologists can update shares to them"
  ON public.doctor_pathologist_shares FOR UPDATE
  USING (auth.uid() = pathologist_id);

-- RLS Policies for pathologist_reports
CREATE POLICY "Pathologists can create reports"
  ON public.pathologist_reports FOR INSERT
  WITH CHECK (auth.uid() = pathologist_id);

CREATE POLICY "Pathologists can view own reports"
  ON public.pathologist_reports FOR SELECT
  USING (auth.uid() = pathologist_id);

CREATE POLICY "Pathologists can update own reports"
  ON public.pathologist_reports FOR UPDATE
  USING (auth.uid() = pathologist_id);

CREATE POLICY "Pathologists can delete own reports"
  ON public.pathologist_reports FOR DELETE
  USING (auth.uid() = pathologist_id);

CREATE POLICY "Doctors can view shared reports"
  ON public.pathologist_reports FOR SELECT
  USING (auth.uid() = doctor_id AND is_shared_with_doctor = true);

CREATE POLICY "Patients can view their shared reports"
  ON public.pathologist_reports FOR SELECT
  USING (auth.uid() = patient_id AND is_shared_with_patient = true);

-- Add updated_at triggers
CREATE TRIGGER update_pathologist_profiles_updated_at
  BEFORE UPDATE ON public.pathologist_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pathologist_reports_updated_at
  BEFORE UPDATE ON public.pathologist_reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add indexes
CREATE INDEX idx_pathologist_profiles_user_id ON public.pathologist_profiles(user_id);
CREATE INDEX idx_doctor_pathologist_shares_doctor_id ON public.doctor_pathologist_shares(doctor_id);
CREATE INDEX idx_doctor_pathologist_shares_pathologist_id ON public.doctor_pathologist_shares(pathologist_id);
CREATE INDEX idx_pathologist_reports_pathologist_id ON public.pathologist_reports(pathologist_id);
CREATE INDEX idx_pathologist_reports_patient_id ON public.pathologist_reports(patient_id);