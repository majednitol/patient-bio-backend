CREATE POLICY "Doctors can read connected patient score snapshots"
ON public.health_score_snapshots FOR SELECT TO authenticated
USING (
  public.has_active_doctor_access(auth.uid(), user_id)
);