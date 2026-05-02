-- Add researcher role to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'researcher';

-- Create researcher_profiles table
CREATE TABLE public.researcher_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  institution_name TEXT,
  institution_type TEXT, -- university, hospital, private_lab, government
  department TEXT,
  research_focus TEXT,
  license_number TEXT,
  avatar_url TEXT,
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create doctor_researcher_shares table for doctor-referred data
CREATE TABLE public.doctor_researcher_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL,
  researcher_id UUID NOT NULL,
  patient_id UUID NOT NULL,
  prescription_id UUID REFERENCES public.prescriptions(id) ON DELETE SET NULL,
  disease_category TEXT,
  research_purpose TEXT,
  notes TEXT,
  status TEXT DEFAULT 'pending', -- pending, viewed, completed, rejected
  is_anonymized BOOLEAN DEFAULT true,
  shared_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.researcher_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctor_researcher_shares ENABLE ROW LEVEL SECURITY;

-- RLS Policies for researcher_profiles
CREATE POLICY "Researchers can view own profile"
  ON public.researcher_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Researchers can insert own profile"
  ON public.researcher_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Researchers can update own profile"
  ON public.researcher_profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for doctor_researcher_shares
CREATE POLICY "Doctors can view shares they created"
  ON public.doctor_researcher_shares FOR SELECT
  USING (auth.uid() = doctor_id);

CREATE POLICY "Doctors can insert shares"
  ON public.doctor_researcher_shares FOR INSERT
  WITH CHECK (auth.uid() = doctor_id);

CREATE POLICY "Doctors can update shares they created"
  ON public.doctor_researcher_shares FOR UPDATE
  USING (auth.uid() = doctor_id);

CREATE POLICY "Researchers can view shares assigned to them"
  ON public.doctor_researcher_shares FOR SELECT
  USING (auth.uid() = researcher_id);

CREATE POLICY "Researchers can update shares assigned to them"
  ON public.doctor_researcher_shares FOR UPDATE
  USING (auth.uid() = researcher_id);

-- Create updated_at trigger
CREATE TRIGGER update_researcher_profiles_updated_at
  BEFORE UPDATE ON public.researcher_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_researcher_profiles_user_id ON public.researcher_profiles(user_id);
CREATE INDEX idx_doctor_researcher_shares_doctor_id ON public.doctor_researcher_shares(doctor_id);
CREATE INDEX idx_doctor_researcher_shares_researcher_id ON public.doctor_researcher_shares(researcher_id);
CREATE INDEX idx_doctor_researcher_shares_status ON public.doctor_researcher_shares(status);