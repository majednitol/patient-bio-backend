
-- Allow researchers to view profiles of patients who have shared non-anonymized data with them
CREATE POLICY "Researchers can view shared patients profiles"
ON public.user_profiles
FOR SELECT
USING (
  has_role(auth.uid(), 'researcher'::app_role) 
  AND EXISTS (
    SELECT 1 FROM patient_researcher_shares prs
    WHERE prs.patient_id = user_profiles.user_id
    AND prs.researcher_id = auth.uid()
    AND prs.is_anonymized = false
  )
);
