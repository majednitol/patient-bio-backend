-- Create admission_transfers table for tracking patient movements between beds/wards
CREATE TABLE public.admission_transfers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admission_id uuid NOT NULL REFERENCES public.admissions(id) ON DELETE CASCADE,
  from_bed_id uuid REFERENCES public.beds(id) ON DELETE SET NULL,
  to_bed_id uuid NOT NULL REFERENCES public.beds(id) ON DELETE SET NULL,
  transferred_by uuid NOT NULL,
  transfer_reason text NOT NULL,
  notes text,
  transferred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.admission_transfers ENABLE ROW LEVEL SECURITY;

-- Create policies for hospital staff to manage transfers
-- Staff can view transfers for their hospital
CREATE POLICY "Hospital staff can view transfers"
ON public.admission_transfers
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.admissions a
    JOIN public.hospital_staff hs ON hs.hospital_id = a.hospital_id
    WHERE a.id = admission_transfers.admission_id
    AND hs.user_id = auth.uid()
    AND hs.is_active = true
  )
);

-- Staff can create transfers for their hospital
CREATE POLICY "Hospital staff can create transfers"
ON public.admission_transfers
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.admissions a
    JOIN public.hospital_staff hs ON hs.hospital_id = a.hospital_id
    WHERE a.id = admission_transfers.admission_id
    AND hs.user_id = auth.uid()
    AND hs.is_active = true
  )
);

-- Create index for faster lookups
CREATE INDEX idx_admission_transfers_admission_id ON public.admission_transfers(admission_id);
CREATE INDEX idx_admission_transfers_transferred_at ON public.admission_transfers(transferred_at DESC);