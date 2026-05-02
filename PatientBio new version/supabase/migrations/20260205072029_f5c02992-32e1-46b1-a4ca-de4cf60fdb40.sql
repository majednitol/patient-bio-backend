-- Patient Wallets: Store patient token balances
CREATE TABLE public.patient_wallets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  wallet_address TEXT NOT NULL DEFAULT ('PBIO-' || substring(gen_random_uuid()::text, 1, 8) || '-' || substring(gen_random_uuid()::text, 1, 4)),
  token_balance DECIMAL(12, 2) NOT NULL DEFAULT 0,
  total_earned DECIMAL(12, 2) NOT NULL DEFAULT 0,
  total_withdrawn DECIMAL(12, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Data Transactions: Immutable ledger of all token transactions
CREATE TABLE public.data_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL,
  requester_id UUID NOT NULL,
  requester_type TEXT NOT NULL CHECK (requester_type IN ('researcher', 'pharma', 'doctor', 'pathologist')),
  access_tier INTEGER NOT NULL DEFAULT 2 CHECK (access_tier IN (1, 2, 3)),
  disease_category TEXT,
  tokens_earned DECIMAL(12, 2) NOT NULL DEFAULT 0,
  is_anonymized BOOLEAN NOT NULL DEFAULT true,
  transaction_hash TEXT DEFAULT ('TX-' || to_char(now(), 'YYYYMMDD') || '-' || substring(gen_random_uuid()::text, 1, 8)),
  data_access_request_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Token Pricing: Base prices for different data categories
CREATE TABLE public.token_pricing (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  disease_category TEXT NOT NULL UNIQUE,
  data_type TEXT NOT NULL DEFAULT 'health_records',
  base_price_tokens DECIMAL(12, 2) NOT NULL DEFAULT 10,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add token_offer column to data_access_requests
ALTER TABLE public.data_access_requests 
ADD COLUMN IF NOT EXISTS token_offer DECIMAL(12, 2) DEFAULT 0;

-- Add token budget columns to research_broadcast_requests
ALTER TABLE public.research_broadcast_requests 
ADD COLUMN IF NOT EXISTS token_offer_per_patient DECIMAL(12, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_token_budget DECIMAL(12, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS tokens_disbursed DECIMAL(12, 2) DEFAULT 0;

-- Enable RLS
ALTER TABLE public.patient_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.token_pricing ENABLE ROW LEVEL SECURITY;

-- Patient Wallet RLS: Only owner can view/update their wallet
CREATE POLICY "Users can view their own wallet"
  ON public.patient_wallets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own wallet"
  ON public.patient_wallets FOR UPDATE
  USING (auth.uid() = user_id);

-- Service role can insert wallets (for auto-creation)
CREATE POLICY "Service can insert wallets"
  ON public.patient_wallets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Data Transactions RLS: Patients see their earnings, requesters see their payments
CREATE POLICY "Patients can view their transactions"
  ON public.data_transactions FOR SELECT
  USING (auth.uid() = patient_id);

CREATE POLICY "Requesters can view their transactions"
  ON public.data_transactions FOR SELECT
  USING (auth.uid() = requester_id);

-- Token Pricing RLS: Everyone can read active pricing
CREATE POLICY "Anyone can view active pricing"
  ON public.token_pricing FOR SELECT
  USING (is_active = true);

-- Insert default token pricing
INSERT INTO public.token_pricing (disease_category, base_price_tokens, data_type)
VALUES 
  ('cancer', 25, 'health_records'),
  ('heart_disease', 20, 'health_records'),
  ('diabetes', 20, 'health_records'),
  ('covid19', 15, 'health_records'),
  ('general', 10, 'health_records'),
  ('other', 10, 'health_records')
ON CONFLICT (disease_category) DO NOTHING;

-- Function to credit patient wallet (SECURITY DEFINER for internal use)
CREATE OR REPLACE FUNCTION public.credit_patient_wallet(
  p_patient_id UUID,
  p_tokens DECIMAL
)
RETURNS VOID AS $$
BEGIN
  -- Insert wallet if doesn't exist, then update
  INSERT INTO public.patient_wallets (user_id, token_balance, total_earned)
  VALUES (p_patient_id, p_tokens, p_tokens)
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    token_balance = patient_wallets.token_balance + p_tokens,
    total_earned = patient_wallets.total_earned + p_tokens,
    updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to update wallet timestamps
CREATE TRIGGER update_patient_wallets_updated_at
  BEFORE UPDATE ON public.patient_wallets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_token_pricing_updated_at
  BEFORE UPDATE ON public.token_pricing
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();