
-- Create entity_gradings audit table
CREATE TABLE public.entity_gradings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  grade TEXT NOT NULL,
  previous_grade TEXT,
  reason TEXT NOT NULL,
  graded_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Use validation trigger instead of CHECK constraints
CREATE OR REPLACE FUNCTION public.validate_entity_grading()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.entity_type NOT IN ('doctor', 'pathologist', 'hospital') THEN
    RAISE EXCEPTION 'Invalid entity_type: %', NEW.entity_type;
  END IF;
  IF NEW.grade NOT IN ('A', 'B', 'C', 'D') THEN
    RAISE EXCEPTION 'Invalid grade: %', NEW.grade;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_entity_grading
  BEFORE INSERT OR UPDATE ON public.entity_gradings
  FOR EACH ROW EXECUTE FUNCTION public.validate_entity_grading();

ALTER TABLE public.entity_gradings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage gradings" ON public.entity_gradings
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Add lab_grade columns
ALTER TABLE public.doctor_profiles ADD COLUMN IF NOT EXISTS lab_grade TEXT;
ALTER TABLE public.pathologist_profiles ADD COLUMN IF NOT EXISTS lab_grade TEXT;
ALTER TABLE public.hospitals ADD COLUMN IF NOT EXISTS lab_grade TEXT;

-- Validation triggers for lab_grade on each table
CREATE OR REPLACE FUNCTION public.validate_lab_grade()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.lab_grade IS NOT NULL AND NEW.lab_grade NOT IN ('A', 'B', 'C', 'D') THEN
    RAISE EXCEPTION 'Invalid lab_grade: %', NEW.lab_grade;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_doctor_lab_grade
  BEFORE INSERT OR UPDATE ON public.doctor_profiles
  FOR EACH ROW EXECUTE FUNCTION public.validate_lab_grade();

CREATE TRIGGER trg_validate_pathologist_lab_grade
  BEFORE INSERT OR UPDATE ON public.pathologist_profiles
  FOR EACH ROW EXECUTE FUNCTION public.validate_lab_grade();

CREATE TRIGGER trg_validate_hospital_lab_grade
  BEFORE INSERT OR UPDATE ON public.hospitals
  FOR EACH ROW EXECUTE FUNCTION public.validate_lab_grade();
