-- Add UPDATE policy for health_score_snapshots to allow upsert to work
CREATE POLICY "Users can update own score snapshots"
  ON public.health_score_snapshots
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
