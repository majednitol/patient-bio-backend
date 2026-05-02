-- Create enum types for lab orders
CREATE TYPE lab_order_urgency AS ENUM ('routine', 'urgent', 'stat');
CREATE TYPE lab_order_status AS ENUM ('pending_consent', 'ordered', 'sample_collected', 'processing', 'completed', 'cancelled');
CREATE TYPE lab_consent_status AS ENUM ('pending', 'approved', 'rejected');

-- Create hospital_lab_orders table
CREATE TABLE public.hospital_lab_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  admission_id UUID REFERENCES public.admissions(id) ON DELETE SET NULL,
  patient_id UUID NOT NULL,
  pathologist_id UUID NOT NULL,
  ordered_by UUID NOT NULL,
  is_internal_lab BOOLEAN NOT NULL DEFAULT false,
  consent_status lab_consent_status NOT NULL DEFAULT 'pending',
  data_access_request_id UUID REFERENCES public.data_access_requests(id) ON DELETE SET NULL,
  tests JSONB NOT NULL DEFAULT '[]'::jsonb,
  clinical_notes TEXT,
  urgency lab_order_urgency NOT NULL DEFAULT 'routine',
  status lab_order_status NOT NULL DEFAULT 'pending_consent',
  sample_collected_at TIMESTAMPTZ,
  sample_collected_by UUID,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create hospital_lab_results table
CREATE TABLE public.hospital_lab_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.hospital_lab_orders(id) ON DELETE CASCADE,
  pathologist_report_id UUID REFERENCES public.pathologist_reports(id) ON DELETE SET NULL,
  health_record_id UUID REFERENCES public.health_records(id) ON DELETE SET NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX idx_hospital_lab_orders_hospital ON public.hospital_lab_orders(hospital_id);
CREATE INDEX idx_hospital_lab_orders_patient ON public.hospital_lab_orders(patient_id);
CREATE INDEX idx_hospital_lab_orders_pathologist ON public.hospital_lab_orders(pathologist_id);
CREATE INDEX idx_hospital_lab_orders_admission ON public.hospital_lab_orders(admission_id);
CREATE INDEX idx_hospital_lab_orders_status ON public.hospital_lab_orders(status);
CREATE INDEX idx_hospital_lab_results_order ON public.hospital_lab_results(order_id);

-- Enable RLS
ALTER TABLE public.hospital_lab_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hospital_lab_results ENABLE ROW LEVEL SECURITY;

-- RLS Policies for hospital_lab_orders

-- Hospital staff can view their hospital's lab orders
CREATE POLICY "Hospital staff can view lab orders"
ON public.hospital_lab_orders FOR SELECT
USING (is_hospital_staff(auth.uid(), hospital_id));

-- Hospital staff can create lab orders for their hospital
CREATE POLICY "Hospital staff can create lab orders"
ON public.hospital_lab_orders FOR INSERT
WITH CHECK (is_hospital_staff(auth.uid(), hospital_id));

-- Hospital staff can update their hospital's lab orders
CREATE POLICY "Hospital staff can update lab orders"
ON public.hospital_lab_orders FOR UPDATE
USING (is_hospital_staff(auth.uid(), hospital_id));

-- Hospital admins can delete lab orders
CREATE POLICY "Hospital admins can delete lab orders"
ON public.hospital_lab_orders FOR DELETE
USING (is_hospital_admin(auth.uid(), hospital_id));

-- Pathologists can view orders assigned to them
CREATE POLICY "Pathologists can view their assigned orders"
ON public.hospital_lab_orders FOR SELECT
USING (pathologist_id = auth.uid());

-- Pathologists can update order status for orders assigned to them
CREATE POLICY "Pathologists can update their assigned orders"
ON public.hospital_lab_orders FOR UPDATE
USING (pathologist_id = auth.uid());

-- RLS Policies for hospital_lab_results

-- Hospital staff can view results for their hospital's orders
CREATE POLICY "Hospital staff can view lab results"
ON public.hospital_lab_results FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.hospital_lab_orders o
    WHERE o.id = hospital_lab_results.order_id
    AND is_hospital_staff(auth.uid(), o.hospital_id)
  )
);

-- Hospital staff can create results for their hospital's orders
CREATE POLICY "Hospital staff can create lab results"
ON public.hospital_lab_results FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.hospital_lab_orders o
    WHERE o.id = hospital_lab_results.order_id
    AND is_hospital_staff(auth.uid(), o.hospital_id)
  )
);

-- Pathologists can view results for orders assigned to them
CREATE POLICY "Pathologists can view their order results"
ON public.hospital_lab_results FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.hospital_lab_orders o
    WHERE o.id = hospital_lab_results.order_id
    AND o.pathologist_id = auth.uid()
  )
);

-- Pathologists can create results for orders assigned to them
CREATE POLICY "Pathologists can create their order results"
ON public.hospital_lab_results FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.hospital_lab_orders o
    WHERE o.id = hospital_lab_results.order_id
    AND o.pathologist_id = auth.uid()
  )
);

-- Hospital staff can update results for their hospital's orders
CREATE POLICY "Hospital staff can update lab results"
ON public.hospital_lab_results FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.hospital_lab_orders o
    WHERE o.id = hospital_lab_results.order_id
    AND is_hospital_staff(auth.uid(), o.hospital_id)
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_hospital_lab_orders_updated_at
BEFORE UPDATE ON public.hospital_lab_orders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();