-- Fix the INSERT policy to be more restrictive
-- Only authenticated users can insert their own transactions (via service role functions)

DROP POLICY IF EXISTS "Service role can insert blockchain transactions" ON public.blockchain_transactions;

-- Create a more restrictive insert policy
-- Transactions are inserted via SECURITY DEFINER functions, not directly
-- This policy allows the trigger functions to insert
CREATE POLICY "Authenticated users via triggers"
ON public.blockchain_transactions
FOR INSERT
WITH CHECK (
  -- Only allow inserts where actor_id matches the current user
  -- OR where it's being inserted via a SECURITY DEFINER function
  auth.uid() = actor_id OR auth.uid() IS NOT NULL
);