-- Fix the overly permissive RLS policy for invoice items by replacing the ALL policy with specific policies
DROP POLICY IF EXISTS "Pathologists can manage own invoice items" ON public.pathologist_invoice_items;

CREATE POLICY "Pathologists can insert own invoice items"
ON public.pathologist_invoice_items
FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM pathologist_invoices
  WHERE pathologist_invoices.id = pathologist_invoice_items.invoice_id
  AND pathologist_invoices.pathologist_id = auth.uid()
));

CREATE POLICY "Pathologists can update own invoice items"
ON public.pathologist_invoice_items
FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM pathologist_invoices
  WHERE pathologist_invoices.id = pathologist_invoice_items.invoice_id
  AND pathologist_invoices.pathologist_id = auth.uid()
));

CREATE POLICY "Pathologists can delete own invoice items"
ON public.pathologist_invoice_items
FOR DELETE
USING (EXISTS (
  SELECT 1 FROM pathologist_invoices
  WHERE pathologist_invoices.id = pathologist_invoice_items.invoice_id
  AND pathologist_invoices.pathologist_id = auth.uid()
));