
-- Fix search_path on new validation functions
CREATE OR REPLACE FUNCTION public.validate_entity_grading()
RETURNS trigger LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
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

CREATE OR REPLACE FUNCTION public.validate_lab_grade()
RETURNS trigger LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.lab_grade IS NOT NULL AND NEW.lab_grade NOT IN ('A', 'B', 'C', 'D') THEN
    RAISE EXCEPTION 'Invalid lab_grade: %', NEW.lab_grade;
  END IF;
  RETURN NEW;
END;
$$;
