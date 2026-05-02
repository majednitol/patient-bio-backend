
-- Auto-approve rules for data access requests
CREATE TABLE public.data_request_auto_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL,
  rule_name TEXT NOT NULL,
  requester_type TEXT NOT NULL CHECK (requester_type IN ('doctor', 'pathologist', 'researcher', 'pharmacy', 'lab', 'any')),
  require_anonymized BOOLEAN NOT NULL DEFAULT true,
  require_connected_provider BOOLEAN NOT NULL DEFAULT false,
  disease_categories TEXT[] DEFAULT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.data_request_auto_rules ENABLE ROW LEVEL SECURITY;

-- Patients can manage their own rules
CREATE POLICY "Patients can view own auto rules"
ON public.data_request_auto_rules FOR SELECT
TO authenticated
USING (auth.uid() = patient_id);

CREATE POLICY "Patients can create own auto rules"
ON public.data_request_auto_rules FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = patient_id);

CREATE POLICY "Patients can update own auto rules"
ON public.data_request_auto_rules FOR UPDATE
TO authenticated
USING (auth.uid() = patient_id);

CREATE POLICY "Patients can delete own auto rules"
ON public.data_request_auto_rules FOR DELETE
TO authenticated
USING (auth.uid() = patient_id);

-- Index for efficient lookups
CREATE INDEX idx_auto_rules_patient ON public.data_request_auto_rules (patient_id, is_active);

-- Trigger for updated_at
CREATE TRIGGER update_auto_rules_updated_at
BEFORE UPDATE ON public.data_request_auto_rules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
