
-- Tighten sync_conflicts insert: only authenticated users can create conflicts for themselves
DROP POLICY "System can insert sync conflicts" ON public.sync_conflicts;
CREATE POLICY "Authenticated users can insert own sync conflicts" ON public.sync_conflicts FOR INSERT WITH CHECK (auth.uid() = user_id);
