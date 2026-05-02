-- Create enum for verification status
CREATE TYPE public.verification_status AS ENUM ('pending', 'approved', 'rejected', 'expired');

-- Create enum for provider type
CREATE TYPE public.provider_type AS ENUM ('doctor', 'pathologist', 'hospital_admin', 'researcher');

-- Create provider verifications table
CREATE TABLE public.provider_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider_type provider_type NOT NULL,
  license_number TEXT,
  issuing_authority TEXT,
  issuing_country TEXT,
  license_expiry_date DATE,
  document_url TEXT,
  additional_documents TEXT[],
  status verification_status DEFAULT 'pending',
  submitted_at TIMESTAMPTZ DEFAULT now(),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX idx_provider_verifications_user_id ON public.provider_verifications(user_id);
CREATE INDEX idx_provider_verifications_status ON public.provider_verifications(status);
CREATE INDEX idx_provider_verifications_provider_type ON public.provider_verifications(provider_type);

-- Enable RLS
ALTER TABLE public.provider_verifications ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own verifications
CREATE POLICY "Users can view own verifications"
ON public.provider_verifications
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Policy: Users can insert their own verifications
CREATE POLICY "Users can submit verifications"
ON public.provider_verifications
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own pending verifications
CREATE POLICY "Users can update pending verifications"
ON public.provider_verifications
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id AND status = 'pending')
WITH CHECK (auth.uid() = user_id AND status = 'pending');

-- Policy: Admins can view all verifications
CREATE POLICY "Admins can view all verifications"
ON public.provider_verifications
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Policy: Admins can update verifications (for review)
CREATE POLICY "Admins can update verifications"
ON public.provider_verifications
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Create storage bucket for verification documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'provider-verifications',
  'provider-verifications',
  false,
  10485760, -- 10MB
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for verification documents
CREATE POLICY "Users can upload own verification documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'provider-verifications' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can view own verification documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'provider-verifications' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Admins can view all verification documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'provider-verifications' 
  AND public.has_role(auth.uid(), 'admin')
);

-- Trigger to update updated_at
CREATE TRIGGER update_provider_verifications_updated_at
BEFORE UPDATE ON public.provider_verifications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to update provider profile verified status when verification is approved
CREATE OR REPLACE FUNCTION public.update_provider_verified_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    -- Update doctor profile if provider type is doctor
    IF NEW.provider_type = 'doctor' THEN
      UPDATE public.doctor_profiles
      SET is_verified = true, updated_at = now()
      WHERE user_id = NEW.user_id;
    END IF;
    
    -- Update pathologist profile if provider type is pathologist
    IF NEW.provider_type = 'pathologist' THEN
      UPDATE public.pathologist_profiles
      SET is_verified = true, updated_at = now()
      WHERE user_id = NEW.user_id;
    END IF;
    
    -- Update researcher profile if provider type is researcher
    IF NEW.provider_type = 'researcher' THEN
      UPDATE public.researcher_profiles
      SET is_verified = true, updated_at = now()
      WHERE user_id = NEW.user_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger to auto-update verified status on approval
CREATE TRIGGER update_verified_on_approval
AFTER UPDATE ON public.provider_verifications
FOR EACH ROW
EXECUTE FUNCTION public.update_provider_verified_status();