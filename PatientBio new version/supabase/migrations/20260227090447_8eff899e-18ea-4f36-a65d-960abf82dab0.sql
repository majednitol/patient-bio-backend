
-- Add source and source_ref columns to all 6 clinical record tables
ALTER TABLE public.patient_background_info 
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS source_ref text;

ALTER TABLE public.patient_comorbidities 
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS source_ref text;

ALTER TABLE public.patient_clinical_investigations 
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS source_ref text;

ALTER TABLE public.patient_running_treatments 
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS source_ref text;

ALTER TABLE public.patient_care_team 
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS source_ref text;

ALTER TABLE public.patient_complications_status 
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS source_ref text;

-- Trigger: Auto-populate patient_clinical_investigations from patient_vitals
CREATE OR REPLACE FUNCTION public.auto_populate_investigations_from_vitals()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.patient_clinical_investigations (
    user_id, investigation_date, investigation_type,
    bp_systolic, bp_diastolic, weight_kg,
    notes, source, source_ref
  ) VALUES (
    NEW.patient_id,
    COALESCE(NEW.recorded_at::date, CURRENT_DATE),
    'vitals',
    NEW.bp_systolic,
    NEW.bp_diastolic,
    NEW.weight,
    'Auto-recorded from consultation vitals. HR: ' || COALESCE(NEW.heart_rate::text, 'N/A') || ', Temp: ' || COALESCE(NEW.temperature::text, 'N/A') || '°C, SpO2: ' || COALESCE(NEW.spo2::text, 'N/A') || '%',
    'auto:vitals',
    NEW.id::text
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_populate_investigations_from_vitals
AFTER INSERT ON public.patient_vitals
FOR EACH ROW
EXECUTE FUNCTION public.auto_populate_investigations_from_vitals();

-- Trigger: Auto-populate patient_care_team from doctor_patient_access
CREATE OR REPLACE FUNCTION public.auto_populate_care_team_from_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_doctor_name text;
  v_doctor_specialty text;
BEGIN
  -- Only on active access grants
  IF NEW.is_active = false THEN
    RETURN NEW;
  END IF;

  -- Check if this doctor is already in the patient's care team
  IF EXISTS (
    SELECT 1 FROM public.patient_care_team
    WHERE user_id = NEW.patient_id AND ref_doctor_id = NEW.doctor_id
  ) THEN
    RETURN NEW;
  END IF;

  -- Look up doctor profile
  SELECT full_name, specialty INTO v_doctor_name, v_doctor_specialty
  FROM public.doctor_profiles
  WHERE user_id = NEW.doctor_id;

  INSERT INTO public.patient_care_team (
    user_id, physician_name, specialty, ref_doctor_id, is_primary, notes, source, source_ref
  ) VALUES (
    NEW.patient_id,
    COALESCE(v_doctor_name, 'Unknown Doctor'),
    v_doctor_specialty,
    NEW.doctor_id,
    false,
    'Auto-added when doctor connected with patient',
    'auto:doctor_access',
    NEW.id::text
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_populate_care_team_from_access
AFTER INSERT ON public.doctor_patient_access
FOR EACH ROW
EXECUTE FUNCTION public.auto_populate_care_team_from_access();

-- Trigger: Auto-populate patient_running_treatments from prescriptions
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
  -- Get doctor name for source_ref
  SELECT full_name INTO v_doctor_name
  FROM public.doctor_profiles
  WHERE user_id = NEW.doctor_id;

  -- medications is a jsonb array: [{name, dosage, frequency, duration, instructions}]
  IF NEW.medications IS NOT NULL AND jsonb_array_length(NEW.medications) > 0 THEN
    FOR v_med IN SELECT * FROM jsonb_array_elements(NEW.medications)
    LOOP
      INSERT INTO public.patient_running_treatments (
        user_id, treatment_type, medication_name, medication_dose, medication_frequency,
        treatment_start_date, is_active, notes, source, source_ref
      ) VALUES (
        NEW.patient_id,
        'medication',
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

CREATE TRIGGER trg_auto_populate_treatments_from_prescriptions
AFTER INSERT ON public.prescriptions
FOR EACH ROW
EXECUTE FUNCTION public.auto_populate_treatments_from_prescriptions();
