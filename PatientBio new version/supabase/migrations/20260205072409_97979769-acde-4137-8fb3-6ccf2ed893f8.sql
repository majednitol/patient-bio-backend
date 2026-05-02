-- Allow authenticated users to insert data_transactions (for when patients approve requests)
CREATE POLICY "Authenticated can insert transactions"
  ON public.data_transactions FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Add index for faster wallet lookups
CREATE INDEX IF NOT EXISTS idx_patient_wallets_user_id ON public.patient_wallets(user_id);

-- Add index for faster transaction lookups
CREATE INDEX IF NOT EXISTS idx_data_transactions_patient_id ON public.data_transactions(patient_id);
CREATE INDEX IF NOT EXISTS idx_data_transactions_created_at ON public.data_transactions(created_at DESC);