
CREATE TYPE public.chronic_condition_type AS ENUM (
  'diabetes', 'hypertension', 'asthma', 'arthritis', 'cancer', 'copd', 'other'
);

CREATE TABLE public.chronic_care_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL,
  doctor_id UUID NOT NULL,
  condition_type chronic_condition_type NOT NULL,
  plan_name TEXT NOT NULL,
  milestones JSONB NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'active',
  next_review_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.chronic_care_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Doctors manage own care plans"
  ON public.chronic_care_plans FOR ALL TO authenticated
  USING (doctor_id = auth.uid())
  WITH CHECK (doctor_id = auth.uid());

CREATE POLICY "Patients read own care plans"
  ON public.chronic_care_plans FOR SELECT TO authenticated
  USING (patient_id = auth.uid());

CREATE OR REPLACE FUNCTION public.validate_care_plan_status()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status NOT IN ('active', 'completed', 'paused') THEN
    RAISE EXCEPTION 'Invalid care plan status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER validate_care_plan_status_trigger
  BEFORE INSERT OR UPDATE ON public.chronic_care_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_care_plan_status();
