-- Fix permissive INSERT policy on health_insights - only allow service role
DROP POLICY IF EXISTS "System can insert health insights" ON public.health_insights;

-- Create a proper insert policy that requires user_id match
CREATE POLICY "Users can insert their own health insights"
ON public.health_insights FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Add insert policy for medication reminder logs
CREATE POLICY "Users can insert their own medication logs"
ON public.medication_reminder_logs FOR INSERT
WITH CHECK (auth.uid() = user_id);