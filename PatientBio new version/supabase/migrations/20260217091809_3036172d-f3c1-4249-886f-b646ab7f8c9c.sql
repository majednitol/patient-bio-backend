-- Fix: Restrict access_logs INSERT to only allow users to log their own access
DROP POLICY IF EXISTS "Authenticated users can log access" ON public.access_logs;

CREATE POLICY "Users can log own access"
ON public.access_logs
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);
