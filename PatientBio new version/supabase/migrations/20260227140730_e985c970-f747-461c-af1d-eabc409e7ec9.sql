-- Enable realtime for clinical tables so patient gets notified of auto-populated records
ALTER PUBLICATION supabase_realtime ADD TABLE public.patient_running_treatments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.patient_care_team;
ALTER PUBLICATION supabase_realtime ADD TABLE public.patient_clinical_investigations;