-- Create patient_researcher_shares table for patient-initiated research data sharing
CREATE TABLE public.patient_researcher_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL,
  researcher_id UUID NOT NULL,
  access_token_id UUID REFERENCES public.access_tokens(id),
  disease_category TEXT,
  research_purpose TEXT,
  is_anonymized BOOLEAN DEFAULT true,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'viewed', 'completed', 'revoked')),
  shared_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.patient_researcher_shares ENABLE ROW LEVEL SECURITY;

-- Patients can create shares
CREATE POLICY "Patients can create research shares"
ON public.patient_researcher_shares
FOR INSERT
WITH CHECK (auth.uid() = patient_id);

-- Patients can view their shares
CREATE POLICY "Patients can view own shares"
ON public.patient_researcher_shares
FOR SELECT
USING (auth.uid() = patient_id);

-- Patients can update (revoke) their shares
CREATE POLICY "Patients can update own shares"
ON public.patient_researcher_shares
FOR UPDATE
USING (auth.uid() = patient_id);

-- Patients can delete their shares
CREATE POLICY "Patients can delete own shares"
ON public.patient_researcher_shares
FOR DELETE
USING (auth.uid() = patient_id);

-- Researchers can view shares assigned to them
CREATE POLICY "Researchers can view assigned shares"
ON public.patient_researcher_shares
FOR SELECT
USING (auth.uid() = researcher_id);

-- Researchers can update status of shares assigned to them
CREATE POLICY "Researchers can update assigned shares"
ON public.patient_researcher_shares
FOR UPDATE
USING (auth.uid() = researcher_id);

-- Create updated_at trigger
CREATE TRIGGER update_patient_researcher_shares_updated_at
BEFORE UPDATE ON public.patient_researcher_shares
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();