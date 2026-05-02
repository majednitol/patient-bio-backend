
-- Create patient_pathologist_shares table
CREATE TABLE public.patient_pathologist_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL,
  pathologist_id UUID NOT NULL,
  disease_category TEXT,
  notes TEXT,
  is_anonymized BOOLEAN DEFAULT true,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'viewed', 'completed', 'revoked')),
  shared_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_patient_pathologist_shares_patient ON public.patient_pathologist_shares (patient_id, shared_at DESC);
CREATE INDEX idx_patient_pathologist_shares_pathologist ON public.patient_pathologist_shares (pathologist_id, status);

-- Enable RLS
ALTER TABLE public.patient_pathologist_shares ENABLE ROW LEVEL SECURITY;

-- Patients can view their own shares
CREATE POLICY "Patients can view own shares"
ON public.patient_pathologist_shares FOR SELECT
TO authenticated
USING (patient_id = auth.uid());

-- Patients can create shares
CREATE POLICY "Patients can create shares"
ON public.patient_pathologist_shares FOR INSERT
TO authenticated
WITH CHECK (patient_id = auth.uid());

-- Patients can update own shares (e.g. revoke)
CREATE POLICY "Patients can update own shares"
ON public.patient_pathologist_shares FOR UPDATE
TO authenticated
USING (patient_id = auth.uid());

-- Pathologists can view shares assigned to them
CREATE POLICY "Pathologists can view assigned shares"
ON public.patient_pathologist_shares FOR SELECT
TO authenticated
USING (pathologist_id = auth.uid());

-- Pathologists can update assigned shares (e.g. mark viewed/completed)
CREATE POLICY "Pathologists can update assigned shares"
ON public.patient_pathologist_shares FOR UPDATE
TO authenticated
USING (pathologist_id = auth.uid());

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.patient_pathologist_shares;
