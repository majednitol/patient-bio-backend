
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS outcome_status text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS outcome_notes text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS follow_up_date date DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS treatment_plan_id uuid DEFAULT NULL REFERENCES public.patient_running_treatments(id);
