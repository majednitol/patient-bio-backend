-- Add sample tracking columns to hospital_lab_orders
ALTER TABLE public.hospital_lab_orders 
ADD COLUMN IF NOT EXISTS sample_barcode TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS processing_started_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS quality_checked_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS received_at TIMESTAMPTZ;

-- Create sample_tracking_events table for detailed audit trail
CREATE TABLE IF NOT EXISTS public.sample_tracking_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.hospital_lab_orders(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('ordered', 'sample_collected', 'received', 'processing_started', 'qc_passed', 'completed', 'cancelled')),
  notes TEXT,
  performed_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sample_tracking_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sample_tracking_events
-- Hospital staff can view events for their hospital's orders
CREATE POLICY "Hospital staff can view tracking events for their orders"
ON public.sample_tracking_events
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.hospital_lab_orders o
    JOIN public.hospital_staff hs ON hs.hospital_id = o.hospital_id
    WHERE o.id = order_id AND hs.user_id = auth.uid() AND hs.is_active = true
  )
);

-- Pathologists can view and insert events for orders assigned to them
CREATE POLICY "Pathologists can view tracking events for their orders"
ON public.sample_tracking_events
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.hospital_lab_orders o
    WHERE o.id = order_id AND o.pathologist_id = auth.uid()
  )
);

CREATE POLICY "Pathologists can insert tracking events for their orders"
ON public.sample_tracking_events
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.hospital_lab_orders o
    WHERE o.id = order_id AND o.pathologist_id = auth.uid()
  )
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_sample_tracking_events_order_id ON public.sample_tracking_events(order_id);
CREATE INDEX IF NOT EXISTS idx_hospital_lab_orders_sample_barcode ON public.hospital_lab_orders(sample_barcode);

-- Create function to generate sample barcode
CREATE OR REPLACE FUNCTION public.generate_sample_barcode()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_date TEXT;
  v_sequence INTEGER;
  v_barcode TEXT;
BEGIN
  v_date := to_char(CURRENT_DATE, 'YYYYMMDD');
  
  -- Get next sequence number for today
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(sample_barcode FROM 'LAB-[0-9]{8}-([0-9]+)$') AS INTEGER)
  ), 0) + 1
  INTO v_sequence
  FROM hospital_lab_orders
  WHERE sample_barcode LIKE 'LAB-' || v_date || '-%';
  
  v_barcode := 'LAB-' || v_date || '-' || LPAD(v_sequence::TEXT, 4, '0');
  
  RETURN v_barcode;
END;
$$;