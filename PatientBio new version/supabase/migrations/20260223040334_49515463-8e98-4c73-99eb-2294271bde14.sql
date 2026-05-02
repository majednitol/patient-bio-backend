
-- Add rejection columns to hospital_lab_orders
ALTER TABLE public.hospital_lab_orders
  ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT NULL,
  ADD COLUMN IF NOT EXISTS rejected_by UUID NULL REFERENCES auth.users(id);
