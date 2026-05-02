
CREATE OR REPLACE FUNCTION public.protect_lab_grade()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- If lab_grade is being changed and user is NOT admin, revert it
  IF OLD.lab_grade IS DISTINCT FROM NEW.lab_grade THEN
    IF NOT public.has_role(auth.uid(), 'admin') THEN
      NEW.lab_grade := OLD.lab_grade;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER protect_doctor_lab_grade
  BEFORE UPDATE ON public.doctor_profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_lab_grade();

CREATE TRIGGER protect_pathologist_lab_grade
  BEFORE UPDATE ON public.pathologist_profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_lab_grade();

CREATE TRIGGER protect_hospital_lab_grade
  BEFORE UPDATE ON public.hospitals
  FOR EACH ROW EXECUTE FUNCTION public.protect_lab_grade();
