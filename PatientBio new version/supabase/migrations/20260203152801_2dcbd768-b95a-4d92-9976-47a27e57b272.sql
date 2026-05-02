-- Ward types enum
CREATE TYPE ward_type AS ENUM (
  'general', 'icu', 'emergency', 'maternity', 'pediatric', 'private'
);

-- Bed status enum
CREATE TYPE bed_status AS ENUM (
  'available', 'occupied', 'maintenance', 'reserved'
);

-- Admission status enum
CREATE TYPE admission_status AS ENUM (
  'admitted', 'discharged', 'transferred'
);

-- Invoice status enum
CREATE TYPE invoice_status AS ENUM (
  'draft', 'pending', 'partial', 'paid', 'cancelled'
);

-- Invoice item categories enum
CREATE TYPE invoice_item_category AS ENUM (
  'consultation', 'bed_charge', 'medication', 'procedure', 'lab_test', 'other'
);

-- Payment methods enum
CREATE TYPE payment_method AS ENUM (
  'cash', 'card', 'upi', 'bank_transfer', 'insurance'
);

-- 1. Wards table
CREATE TABLE public.wards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type ward_type NOT NULL DEFAULT 'general',
  floor TEXT,
  total_beds INTEGER NOT NULL DEFAULT 0,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Beds table
CREATE TABLE public.beds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ward_id UUID NOT NULL REFERENCES public.wards(id) ON DELETE CASCADE,
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  bed_number TEXT NOT NULL,
  bed_type TEXT DEFAULT 'standard',
  daily_rate DECIMAL(10,2) DEFAULT 0,
  status bed_status DEFAULT 'available',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(hospital_id, bed_number)
);

-- 3. Admissions table
CREATE TABLE public.admissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL,
  bed_id UUID REFERENCES public.beds(id) ON DELETE SET NULL,
  admitting_doctor_id UUID NOT NULL,
  admission_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  expected_discharge DATE,
  actual_discharge TIMESTAMPTZ,
  admission_reason TEXT,
  diagnosis TEXT,
  status admission_status DEFAULT 'admitted',
  discharge_notes TEXT,
  discharged_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Invoices table
CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL,
  admission_id UUID REFERENCES public.admissions(id) ON DELETE SET NULL,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  invoice_number TEXT NOT NULL,
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  subtotal DECIMAL(12,2) DEFAULT 0,
  tax_amount DECIMAL(12,2) DEFAULT 0,
  discount_amount DECIMAL(12,2) DEFAULT 0,
  total_amount DECIMAL(12,2) DEFAULT 0,
  amount_paid DECIMAL(12,2) DEFAULT 0,
  status invoice_status DEFAULT 'draft',
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(hospital_id, invoice_number)
);

-- 5. Invoice items table
CREATE TABLE public.invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  category invoice_item_category DEFAULT 'other',
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  service_date DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Payments table
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  amount DECIMAL(12,2) NOT NULL,
  payment_method payment_method NOT NULL DEFAULT 'cash',
  payment_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  transaction_ref TEXT,
  notes TEXT,
  received_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.wards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.beds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for wards
CREATE POLICY "Hospital admins can manage wards"
  ON public.wards FOR ALL
  USING (is_hospital_admin(auth.uid(), hospital_id))
  WITH CHECK (is_hospital_admin(auth.uid(), hospital_id));

CREATE POLICY "Hospital staff can view wards"
  ON public.wards FOR SELECT
  USING (is_hospital_staff(auth.uid(), hospital_id));

-- RLS Policies for beds
CREATE POLICY "Hospital admins can manage beds"
  ON public.beds FOR ALL
  USING (is_hospital_admin(auth.uid(), hospital_id))
  WITH CHECK (is_hospital_admin(auth.uid(), hospital_id));

CREATE POLICY "Hospital staff can view beds"
  ON public.beds FOR SELECT
  USING (is_hospital_staff(auth.uid(), hospital_id));

-- RLS Policies for admissions
CREATE POLICY "Hospital staff can view admissions"
  ON public.admissions FOR SELECT
  USING (is_hospital_staff(auth.uid(), hospital_id));

CREATE POLICY "Hospital staff can create admissions"
  ON public.admissions FOR INSERT
  WITH CHECK (is_hospital_staff(auth.uid(), hospital_id));

CREATE POLICY "Hospital staff can update admissions"
  ON public.admissions FOR UPDATE
  USING (is_hospital_staff(auth.uid(), hospital_id));

CREATE POLICY "Hospital admins can delete admissions"
  ON public.admissions FOR DELETE
  USING (is_hospital_admin(auth.uid(), hospital_id));

-- RLS Policies for invoices
CREATE POLICY "Hospital staff can view invoices"
  ON public.invoices FOR SELECT
  USING (is_hospital_staff(auth.uid(), hospital_id));

CREATE POLICY "Hospital staff can create invoices"
  ON public.invoices FOR INSERT
  WITH CHECK (is_hospital_staff(auth.uid(), hospital_id));

CREATE POLICY "Hospital staff can update invoices"
  ON public.invoices FOR UPDATE
  USING (is_hospital_staff(auth.uid(), hospital_id) AND status != 'paid');

CREATE POLICY "Hospital admins can delete invoices"
  ON public.invoices FOR DELETE
  USING (is_hospital_admin(auth.uid(), hospital_id) AND status = 'draft');

-- RLS Policies for invoice_items
CREATE POLICY "Hospital staff can manage invoice items"
  ON public.invoice_items FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.invoices i
    WHERE i.id = invoice_items.invoice_id
    AND is_hospital_staff(auth.uid(), i.hospital_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.invoices i
    WHERE i.id = invoice_items.invoice_id
    AND is_hospital_staff(auth.uid(), i.hospital_id)
  ));

-- RLS Policies for payments
CREATE POLICY "Hospital staff can view payments"
  ON public.payments FOR SELECT
  USING (is_hospital_staff(auth.uid(), hospital_id));

CREATE POLICY "Hospital staff can record payments"
  ON public.payments FOR INSERT
  WITH CHECK (is_hospital_staff(auth.uid(), hospital_id));

CREATE POLICY "Hospital admins can manage payments"
  ON public.payments FOR ALL
  USING (is_hospital_admin(auth.uid(), hospital_id))
  WITH CHECK (is_hospital_admin(auth.uid(), hospital_id));

-- Indexes for performance
CREATE INDEX idx_wards_hospital ON public.wards(hospital_id);
CREATE INDEX idx_beds_ward ON public.beds(ward_id);
CREATE INDEX idx_beds_hospital_status ON public.beds(hospital_id, status);
CREATE INDEX idx_admissions_hospital ON public.admissions(hospital_id);
CREATE INDEX idx_admissions_patient ON public.admissions(patient_id);
CREATE INDEX idx_admissions_status ON public.admissions(hospital_id, status);
CREATE INDEX idx_invoices_hospital ON public.invoices(hospital_id);
CREATE INDEX idx_invoices_patient ON public.invoices(patient_id);
CREATE INDEX idx_invoices_status ON public.invoices(hospital_id, status);
CREATE INDEX idx_invoice_items_invoice ON public.invoice_items(invoice_id);
CREATE INDEX idx_payments_invoice ON public.payments(invoice_id);
CREATE INDEX idx_payments_hospital ON public.payments(hospital_id);

-- Invoice number generation function
CREATE OR REPLACE FUNCTION public.generate_invoice_number(p_hospital_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  year_part TEXT;
  seq_num INTEGER;
  invoice_num TEXT;
BEGIN
  year_part := to_char(CURRENT_DATE, 'YYYY');
  
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(invoice_number FROM '\d+$') AS INTEGER)
  ), 0) + 1
  INTO seq_num
  FROM invoices
  WHERE invoices.hospital_id = p_hospital_id
    AND invoice_number LIKE 'INV-' || year_part || '-%';
  
  invoice_num := 'INV-' || year_part || '-' || LPAD(seq_num::TEXT, 4, '0');
  
  RETURN invoice_num;
END;
$$;

-- Trigger to auto-update bed status on admission changes
CREATE OR REPLACE FUNCTION public.update_bed_status_on_admission()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'admitted' AND NEW.bed_id IS NOT NULL THEN
    UPDATE beds SET status = 'occupied', updated_at = now() WHERE id = NEW.bed_id;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status = 'admitted' AND NEW.status = 'discharged' AND OLD.bed_id IS NOT NULL THEN
      UPDATE beds SET status = 'available', updated_at = now() WHERE id = OLD.bed_id;
    ELSIF OLD.bed_id IS DISTINCT FROM NEW.bed_id THEN
      IF OLD.bed_id IS NOT NULL THEN
        UPDATE beds SET status = 'available', updated_at = now() WHERE id = OLD.bed_id;
      END IF;
      IF NEW.bed_id IS NOT NULL AND NEW.status = 'admitted' THEN
        UPDATE beds SET status = 'occupied', updated_at = now() WHERE id = NEW.bed_id;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_bed_status
  AFTER INSERT OR UPDATE ON public.admissions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_bed_status_on_admission();

-- Trigger to update invoice amount_paid when payment is added
CREATE OR REPLACE FUNCTION public.update_invoice_on_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_paid DECIMAL(12,2);
  invoice_total DECIMAL(12,2);
BEGIN
  SELECT COALESCE(SUM(amount), 0) INTO total_paid
  FROM payments WHERE invoice_id = NEW.invoice_id;
  
  SELECT total_amount INTO invoice_total
  FROM invoices WHERE id = NEW.invoice_id;
  
  UPDATE invoices 
  SET 
    amount_paid = total_paid,
    status = CASE 
      WHEN total_paid >= invoice_total THEN 'paid'::invoice_status
      WHEN total_paid > 0 THEN 'partial'::invoice_status
      ELSE status
    END,
    updated_at = now()
  WHERE id = NEW.invoice_id;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_invoice_on_payment
  AFTER INSERT ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_invoice_on_payment();