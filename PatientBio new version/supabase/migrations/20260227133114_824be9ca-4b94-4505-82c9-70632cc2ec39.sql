
-- Fix the treatment trigger to use treatment_types (array) instead of treatment_type
CREATE OR REPLACE FUNCTION public.auto_populate_treatments_from_prescriptions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_med jsonb;
  v_doctor_name text;
BEGIN
  SELECT full_name INTO v_doctor_name
  FROM public.doctor_profiles
  WHERE user_id = NEW.doctor_id;

  IF NEW.medications IS NOT NULL AND jsonb_array_length(NEW.medications) > 0 THEN
    FOR v_med IN SELECT * FROM jsonb_array_elements(NEW.medications)
    LOOP
      INSERT INTO public.patient_running_treatments (
        user_id, treatment_types, medication_name, medication_dose, medication_frequency,
        treatment_start_date, is_active, notes, source, source_ref
      ) VALUES (
        NEW.patient_id,
        ARRAY['medication'],
        COALESCE(v_med->>'name', v_med->>'medication_name', 'Unknown'),
        COALESCE(v_med->>'dosage', v_med->>'dose', ''),
        COALESCE(v_med->>'frequency', ''),
        CURRENT_DATE,
        true,
        'Prescribed by ' || COALESCE(v_doctor_name, 'doctor') || '. ' || COALESCE(v_med->>'instructions', ''),
        'auto:prescription',
        NEW.id::text
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;
