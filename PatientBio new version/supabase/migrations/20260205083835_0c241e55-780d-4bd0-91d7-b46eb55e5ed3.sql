-- Create invoice status enum
CREATE TYPE public.pathologist_invoice_status AS ENUM ('draft', 'pending', 'partial', 'paid', 'cancelled');

-- Create payment method enum
CREATE TYPE public.pathologist_payment_method AS ENUM ('cash', 'card', 'upi', 'bank_transfer');

-- Create pathologist_invoices table
CREATE TABLE public.pathologist_invoices (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pathologist_id uuid NOT NULL,
  patient_id uuid NOT NULL,
  report_id uuid REFERENCES public.pathologist_reports(id) ON DELETE SET NULL,
  invoice_number text NOT NULL,
  invoice_date date NOT NULL DEFAULT CURRENT_DATE,
  due_date date,
  subtotal numeric NOT NULL DEFAULT 0,
  tax_amount numeric NOT NULL DEFAULT 0,
  discount_amount numeric NOT NULL DEFAULT 0,
  total_amount numeric NOT NULL DEFAULT 0,
  amount_paid numeric NOT NULL DEFAULT 0,
  status public.pathologist_invoice_status NOT NULL DEFAULT 'draft',
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create pathologist_invoice_items table
CREATE TABLE public.pathologist_invoice_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id uuid NOT NULL REFERENCES public.pathologist_invoices(id) ON DELETE CASCADE,
  test_id uuid REFERENCES public.pathologist_tests(id) ON DELETE SET NULL,
  description text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  total_price numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create pathologist_payments table
CREATE TABLE public.pathologist_payments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id uuid NOT NULL REFERENCES public.pathologist_invoices(id) ON DELETE CASCADE,
  pathologist_id uuid NOT NULL,
  amount numeric NOT NULL,
  payment_method public.pathologist_payment_method NOT NULL DEFAULT 'cash',
  payment_date timestamp with time zone NOT NULL DEFAULT now(),
  transaction_ref text,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create function to generate invoice numbers
CREATE OR REPLACE FUNCTION public.generate_pathologist_invoice_number(p_pathologist_id uuid)
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_prefix text;
  v_year_month text;
  v_sequence integer;
  v_invoice_number text;
BEGIN
  v_prefix := 'LAB';
  v_year_month := to_char(CURRENT_DATE, 'YYYYMM');
  
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(invoice_number FROM 'LAB-[0-9]{6}-([0-9]+)$') AS integer)
  ), 0) + 1
  INTO v_sequence
  FROM pathologist_invoices
  WHERE pathologist_id = p_pathologist_id
    AND invoice_number LIKE v_prefix || '-' || v_year_month || '-%';
  
  v_invoice_number := v_prefix || '-' || v_year_month || '-' || LPAD(v_sequence::text, 4, '0');
  
  RETURN v_invoice_number;
END;
$$;

-- Create trigger to auto-update invoice totals and status when payments are made
CREATE OR REPLACE FUNCTION public.update_invoice_on_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_total_paid numeric;
  v_total_amount numeric;
  v_new_status public.pathologist_invoice_status;
BEGIN
  -- Calculate total payments for this invoice
  SELECT COALESCE(SUM(amount), 0)
  INTO v_total_paid
  FROM pathologist_payments
  WHERE invoice_id = NEW.invoice_id;
  
  -- Get invoice total
  SELECT total_amount
  INTO v_total_amount
  FROM pathologist_invoices
  WHERE id = NEW.invoice_id;
  
  -- Determine new status
  IF v_total_paid >= v_total_amount THEN
    v_new_status := 'paid';
  ELSIF v_total_paid > 0 THEN
    v_new_status := 'partial';
  ELSE
    v_new_status := 'pending';
  END IF;
  
  -- Update invoice
  UPDATE pathologist_invoices
  SET amount_paid = v_total_paid,
      status = v_new_status,
      updated_at = now()
  WHERE id = NEW.invoice_id;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_invoice_on_payment
AFTER INSERT ON public.pathologist_payments
FOR EACH ROW
EXECUTE FUNCTION public.update_invoice_on_payment();

-- Create trigger to update updated_at on invoices
CREATE TRIGGER update_pathologist_invoices_updated_at
BEFORE UPDATE ON public.pathologist_invoices
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.pathologist_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pathologist_invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pathologist_payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for pathologist_invoices
CREATE POLICY "Pathologists can view own invoices"
ON public.pathologist_invoices
FOR SELECT
USING (auth.uid() = pathologist_id);

CREATE POLICY "Pathologists can create own invoices"
ON public.pathologist_invoices
FOR INSERT
WITH CHECK (auth.uid() = pathologist_id);

CREATE POLICY "Pathologists can update own invoices"
ON public.pathologist_invoices
FOR UPDATE
USING (auth.uid() = pathologist_id);

CREATE POLICY "Pathologists can delete own draft invoices"
ON public.pathologist_invoices
FOR DELETE
USING (auth.uid() = pathologist_id AND status = 'draft');

-- RLS Policies for pathologist_invoice_items
CREATE POLICY "Pathologists can view own invoice items"
ON public.pathologist_invoice_items
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM pathologist_invoices
  WHERE pathologist_invoices.id = pathologist_invoice_items.invoice_id
  AND pathologist_invoices.pathologist_id = auth.uid()
));

CREATE POLICY "Pathologists can manage own invoice items"
ON public.pathologist_invoice_items
FOR ALL
USING (EXISTS (
  SELECT 1 FROM pathologist_invoices
  WHERE pathologist_invoices.id = pathologist_invoice_items.invoice_id
  AND pathologist_invoices.pathologist_id = auth.uid()
));

-- RLS Policies for pathologist_payments
CREATE POLICY "Pathologists can view own payments"
ON public.pathologist_payments
FOR SELECT
USING (auth.uid() = pathologist_id);

CREATE POLICY "Pathologists can create own payments"
ON public.pathologist_payments
FOR INSERT
WITH CHECK (auth.uid() = pathologist_id);

CREATE POLICY "Pathologists can delete own payments"
ON public.pathologist_payments
FOR DELETE
USING (auth.uid() = pathologist_id);