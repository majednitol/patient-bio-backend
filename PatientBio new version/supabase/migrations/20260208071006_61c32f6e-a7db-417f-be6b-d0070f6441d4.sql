-- =====================================================
-- Blockchain Transactions Table for Immutable Audit Ledger
-- Part of Blockchain-Based Security System (Phase 4.2)
-- =====================================================

-- Create enum for transaction types
CREATE TYPE blockchain_transaction_type AS ENUM (
  'HEALTH_RECORD_CREATED',
  'HEALTH_RECORD_ACCESSED',
  'HEALTH_RECORD_UPDATED',
  'HEALTH_RECORD_DELETED',
  'ACCESS_GRANTED',
  'ACCESS_REVOKED',
  'CONSENT_GIVEN',
  'CONSENT_WITHDRAWN',
  'DATA_EXPORTED',
  'CROSS_BORDER_TRANSFER',
  'EMERGENCY_ACCESS',
  'PROVIDER_VERIFIED'
);

-- Create the blockchain_transactions table
CREATE TABLE public.blockchain_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_type blockchain_transaction_type NOT NULL,
  actor_id UUID NOT NULL,
  target_resource_type TEXT,
  target_resource_id UUID,
  data_hash TEXT NOT NULL,
  previous_hash TEXT,
  merkle_root TEXT,
  block_number BIGINT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  signature TEXT,
  is_verified BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add merkle_root and block_number columns to audit_trail
ALTER TABLE public.audit_trail 
ADD COLUMN IF NOT EXISTS merkle_root TEXT,
ADD COLUMN IF NOT EXISTS block_number BIGINT;

-- Create indexes for efficient querying
CREATE INDEX idx_blockchain_tx_actor ON public.blockchain_transactions(actor_id);
CREATE INDEX idx_blockchain_tx_type ON public.blockchain_transactions(transaction_type);
CREATE INDEX idx_blockchain_tx_target ON public.blockchain_transactions(target_resource_type, target_resource_id);
CREATE INDEX idx_blockchain_tx_timestamp ON public.blockchain_transactions(timestamp DESC);
CREATE INDEX idx_blockchain_tx_block ON public.blockchain_transactions(block_number);
CREATE INDEX idx_blockchain_tx_merkle ON public.blockchain_transactions(merkle_root);

-- Index for audit_trail merkle queries
CREATE INDEX IF NOT EXISTS idx_audit_trail_merkle ON public.audit_trail(merkle_root);
CREATE INDEX IF NOT EXISTS idx_audit_trail_block ON public.audit_trail(block_number);

-- Enable RLS
ALTER TABLE public.blockchain_transactions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own transactions
CREATE POLICY "Users can view own blockchain transactions"
ON public.blockchain_transactions
FOR SELECT
USING (auth.uid() = actor_id);

-- Policy: Users can view transactions where they are the target
CREATE POLICY "Users can view transactions targeting their resources"
ON public.blockchain_transactions
FOR SELECT
USING (
  target_resource_type = 'health_record' 
  AND target_resource_id IN (
    SELECT id FROM public.health_records WHERE user_id = auth.uid()
  )
);

-- Policy: Admins can view all transactions
CREATE POLICY "Admins can view all blockchain transactions"
ON public.blockchain_transactions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Policy: Insert via service role only (enforced by Edge Functions)
CREATE POLICY "Service role can insert blockchain transactions"
ON public.blockchain_transactions
FOR INSERT
WITH CHECK (true);

-- Function to record a blockchain transaction
CREATE OR REPLACE FUNCTION public.record_blockchain_transaction(
  p_transaction_type blockchain_transaction_type,
  p_actor_id UUID,
  p_target_resource_type TEXT DEFAULT NULL,
  p_target_resource_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_previous_hash TEXT;
  v_data_hash TEXT;
  v_hash_input TEXT;
  v_transaction_id UUID;
BEGIN
  -- Get the previous transaction's hash
  SELECT data_hash INTO v_previous_hash
  FROM public.blockchain_transactions
  ORDER BY created_at DESC
  LIMIT 1;

  -- If no previous transaction, use genesis hash
  IF v_previous_hash IS NULL THEN
    v_previous_hash := 'GENESIS_0000000000000000000000000000000000000000000000000000000000000000';
  END IF;

  -- Create hash input
  v_hash_input := p_transaction_type::TEXT || '|' ||
                  p_actor_id::TEXT || '|' ||
                  COALESCE(p_target_resource_type, 'NULL') || '|' ||
                  COALESCE(p_target_resource_id::TEXT, 'NULL') || '|' ||
                  v_previous_hash || '|' ||
                  p_metadata::TEXT || '|' ||
                  now()::TEXT;

  -- Compute SHA-256 hash
  v_data_hash := encode(digest(v_hash_input, 'sha256'), 'hex');

  -- Insert the transaction
  INSERT INTO public.blockchain_transactions (
    transaction_type,
    actor_id,
    target_resource_type,
    target_resource_id,
    data_hash,
    previous_hash,
    metadata
  ) VALUES (
    p_transaction_type,
    p_actor_id,
    p_target_resource_type,
    p_target_resource_id,
    v_data_hash,
    v_previous_hash,
    p_metadata
  ) RETURNING id INTO v_transaction_id;

  RETURN v_transaction_id;
END;
$$;

-- Function to verify blockchain integrity
CREATE OR REPLACE FUNCTION public.verify_blockchain_integrity()
RETURNS TABLE(
  total_transactions BIGINT,
  verified_transactions BIGINT,
  broken_links BIGINT,
  integrity_percentage NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total BIGINT;
  v_verified BIGINT := 0;
  v_broken BIGINT := 0;
  v_prev_hash TEXT := NULL;
  v_rec RECORD;
BEGIN
  -- Count total
  SELECT COUNT(*) INTO v_total FROM public.blockchain_transactions;

  -- Verify chain
  FOR v_rec IN 
    SELECT id, previous_hash, data_hash 
    FROM public.blockchain_transactions 
    ORDER BY created_at ASC
  LOOP
    IF v_prev_hash IS NULL THEN
      -- First record should have genesis hash
      IF v_rec.previous_hash LIKE 'GENESIS%' OR v_rec.previous_hash IS NULL THEN
        v_verified := v_verified + 1;
      ELSE
        v_broken := v_broken + 1;
      END IF;
    ELSE
      -- Subsequent records should link to previous
      IF v_rec.previous_hash = v_prev_hash THEN
        v_verified := v_verified + 1;
      ELSE
        v_broken := v_broken + 1;
      END IF;
    END IF;
    
    v_prev_hash := v_rec.data_hash;
  END LOOP;

  RETURN QUERY SELECT 
    v_total,
    v_verified,
    v_broken,
    CASE WHEN v_total > 0 
      THEN ROUND((v_verified::NUMERIC / v_total::NUMERIC) * 100, 2)
      ELSE 100.00
    END;
END;
$$;

-- Trigger to automatically log health record changes to blockchain
CREATE OR REPLACE FUNCTION public.blockchain_health_record_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.record_blockchain_transaction(
      'HEALTH_RECORD_CREATED',
      NEW.user_id,
      'health_record',
      NEW.id,
      jsonb_build_object('title', NEW.title, 'category', NEW.category)
    );
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM public.record_blockchain_transaction(
      'HEALTH_RECORD_UPDATED',
      NEW.user_id,
      'health_record',
      NEW.id,
      jsonb_build_object('title', NEW.title)
    );
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.record_blockchain_transaction(
      'HEALTH_RECORD_DELETED',
      OLD.user_id,
      'health_record',
      OLD.id,
      jsonb_build_object('title', OLD.title)
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger for health_records
DROP TRIGGER IF EXISTS blockchain_health_record_trigger ON public.health_records;
CREATE TRIGGER blockchain_health_record_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.health_records
FOR EACH ROW EXECUTE FUNCTION public.blockchain_health_record_trigger();

-- Trigger for access token events
CREATE OR REPLACE FUNCTION public.blockchain_access_token_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.record_blockchain_transaction(
      'ACCESS_GRANTED',
      NEW.user_id,
      'access_token',
      NEW.id,
      jsonb_build_object('label', NEW.label, 'expires_at', NEW.expires_at)
    );
  ELSIF TG_OP = 'UPDATE' AND NEW.is_revoked = true AND OLD.is_revoked = false THEN
    PERFORM public.record_blockchain_transaction(
      'ACCESS_REVOKED',
      NEW.user_id,
      'access_token',
      NEW.id,
      jsonb_build_object('label', NEW.label)
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for access_tokens
DROP TRIGGER IF EXISTS blockchain_access_token_trigger ON public.access_tokens;
CREATE TRIGGER blockchain_access_token_trigger
AFTER INSERT OR UPDATE ON public.access_tokens
FOR EACH ROW EXECUTE FUNCTION public.blockchain_access_token_trigger();

-- Trigger for consent record events
CREATE OR REPLACE FUNCTION public.blockchain_consent_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.record_blockchain_transaction(
      'CONSENT_GIVEN',
      NEW.patient_id,
      'consent',
      NEW.id,
      jsonb_build_object('consent_type', NEW.consent_type, 'purpose', NEW.purpose)
    );
  ELSIF TG_OP = 'UPDATE' AND NEW.revoked_at IS NOT NULL AND OLD.revoked_at IS NULL THEN
    PERFORM public.record_blockchain_transaction(
      'CONSENT_WITHDRAWN',
      NEW.patient_id,
      'consent',
      NEW.id,
      jsonb_build_object('consent_type', NEW.consent_type)
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for consent_records
DROP TRIGGER IF EXISTS blockchain_consent_trigger ON public.consent_records;
CREATE TRIGGER blockchain_consent_trigger
AFTER INSERT OR UPDATE ON public.consent_records
FOR EACH ROW EXECUTE FUNCTION public.blockchain_consent_trigger();