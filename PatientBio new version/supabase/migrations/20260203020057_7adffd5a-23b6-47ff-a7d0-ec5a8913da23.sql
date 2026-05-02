-- Create user_profiles table
CREATE TABLE public.user_profiles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    display_name text,
    avatar_url text,
    date_of_birth date,
    gender text,
    location text,
    phone text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
ON public.user_profiles FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
ON public.user_profiles FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
ON public.user_profiles FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Create health_data table
CREATE TABLE public.health_data (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    height text,
    blood_group text,
    previous_diseases text,
    current_medications text,
    bad_habits text,
    chronic_diseases text,
    health_allergies text,
    birth_defects text,
    emergency_contact_name text,
    emergency_contact_phone text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.health_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own health data"
ON public.health_data FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own health data"
ON public.health_data FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own health data"
ON public.health_data FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_health_data_updated_at
    BEFORE UPDATE ON public.health_data
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Create enums for health_records
CREATE TYPE public.record_category AS ENUM (
    'prescription', 
    'lab_result', 
    'imaging', 
    'vaccination', 
    'other'
);

CREATE TYPE public.disease_category AS ENUM (
    'general',
    'cancer',
    'covid19',
    'diabetes',
    'heart_disease',
    'other'
);

-- Create health_records table
CREATE TABLE public.health_records (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title text NOT NULL,
    description text,
    category public.record_category DEFAULT 'other',
    disease_category public.disease_category DEFAULT 'general',
    file_url text NOT NULL,
    file_type text,
    file_size integer,
    uploaded_at timestamptz DEFAULT now(),
    record_date date,
    provider_name text,
    notes text
);

ALTER TABLE public.health_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own records"
ON public.health_records FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own records"
ON public.health_records FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own records"
ON public.health_records FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own records"
ON public.health_records FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- Create storage bucket for health records
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'health-records', 
    'health-records', 
    false,
    10485760, -- 10MB limit
    ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']
);

-- Storage RLS policies - users can only access their own folder
CREATE POLICY "Users can view own health records files"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'health-records' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload own health records files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'health-records' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update own health records files"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'health-records' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own health records files"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'health-records' AND auth.uid()::text = (storage.foldername(name))[1]);