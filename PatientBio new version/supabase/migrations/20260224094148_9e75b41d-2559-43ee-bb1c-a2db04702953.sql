
-- ==========================================
-- Table 1: patient_background_info
-- ==========================================
CREATE TABLE public.patient_background_info (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  education_level TEXT,
  occupation TEXT,
  occupational_health_note TEXT,
  family_history TEXT,
  lifestyle_notes TEXT,
  ward_address TEXT,
  ward_no TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT patient_background_info_user_id_unique UNIQUE (user_id)
);

ALTER TABLE public.patient_background_info ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own background" ON public.patient_background_info FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own background" ON public.patient_background_info FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own background" ON public.patient_background_info FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own background" ON public.patient_background_info FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER update_patient_background_info_updated_at BEFORE UPDATE ON public.patient_background_info FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ==========================================
-- Table 2: patient_comorbidities
-- ==========================================
CREATE TABLE public.patient_comorbidities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  comorbidity_list TEXT[] DEFAULT '{}',
  smoking_status TEXT,
  pack_years NUMERIC,
  alcohol_consumption TEXT,
  units_per_week NUMERIC,
  other_risk_factors TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT patient_comorbidities_user_id_unique UNIQUE (user_id)
);

ALTER TABLE public.patient_comorbidities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own comorbidities" ON public.patient_comorbidities FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own comorbidities" ON public.patient_comorbidities FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own comorbidities" ON public.patient_comorbidities FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own comorbidities" ON public.patient_comorbidities FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER update_patient_comorbidities_updated_at BEFORE UPDATE ON public.patient_comorbidities FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ==========================================
-- Table 3: patient_clinical_investigations
-- ==========================================
CREATE TABLE public.patient_clinical_investigations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  investigation_date DATE,
  investigation_type TEXT,
  results JSONB DEFAULT '{}',
  biomarker_results JSONB DEFAULT '{}',
  bp_systolic NUMERIC,
  bp_diastolic NUMERIC,
  weight_kg NUMERIC,
  height_cm NUMERIC,
  bmi NUMERIC,
  imaging_type TEXT,
  imaging_reference TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.patient_clinical_investigations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own investigations" ON public.patient_clinical_investigations FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own investigations" ON public.patient_clinical_investigations FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own investigations" ON public.patient_clinical_investigations FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own investigations" ON public.patient_clinical_investigations FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER update_patient_clinical_investigations_updated_at BEFORE UPDATE ON public.patient_clinical_investigations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ==========================================
-- Table 4: patient_running_treatments
-- ==========================================
CREATE TABLE public.patient_running_treatments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  treatment_start_date DATE,
  treatment_end_date DATE,
  treatment_types TEXT[] DEFAULT '{}',
  medication_name TEXT,
  medication_dose TEXT,
  medication_frequency TEXT,
  therapy_type TEXT,
  therapy_frequency TEXT,
  therapy_provider TEXT,
  dietary_intervention BOOLEAN DEFAULT false,
  dietary_notes TEXT,
  dialysis_status TEXT,
  dialysis_frequency TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.patient_running_treatments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own treatments" ON public.patient_running_treatments FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own treatments" ON public.patient_running_treatments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own treatments" ON public.patient_running_treatments FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own treatments" ON public.patient_running_treatments FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER update_patient_running_treatments_updated_at BEFORE UPDATE ON public.patient_running_treatments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ==========================================
-- Table 5: patient_care_team
-- ==========================================
CREATE TABLE public.patient_care_team (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  physician_name TEXT,
  specialty TEXT,
  contact_info TEXT,
  ref_doctor_id UUID,
  is_primary BOOLEAN DEFAULT false,
  referral_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.patient_care_team ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own care team" ON public.patient_care_team FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own care team" ON public.patient_care_team FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own care team" ON public.patient_care_team FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own care team" ON public.patient_care_team FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER update_patient_care_team_updated_at BEFORE UPDATE ON public.patient_care_team FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ==========================================
-- Table 6: patient_complications_status
-- ==========================================
CREATE TABLE public.patient_complications_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  current_complications TEXT[] DEFAULT '{}',
  complication_notes TEXT,
  treatment_response TEXT,
  follow_up_required BOOLEAN DEFAULT false,
  next_follow_up_date DATE,
  status_date DATE DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT patient_complications_status_user_id_unique UNIQUE (user_id)
);

ALTER TABLE public.patient_complications_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own complications" ON public.patient_complications_status FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own complications" ON public.patient_complications_status FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own complications" ON public.patient_complications_status FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own complications" ON public.patient_complications_status FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER update_patient_complications_status_updated_at BEFORE UPDATE ON public.patient_complications_status FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ==========================================
-- Blockchain audit triggers for all 6 tables
-- ==========================================
CREATE OR REPLACE FUNCTION public.blockchain_clinical_record_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.record_blockchain_transaction(
      'HEALTH_RECORD_CREATED',
      NEW.user_id,
      TG_TABLE_NAME,
      NEW.id,
      jsonb_build_object('table', TG_TABLE_NAME, 'action', 'created')
    );
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM public.record_blockchain_transaction(
      'HEALTH_RECORD_UPDATED',
      NEW.user_id,
      TG_TABLE_NAME,
      NEW.id,
      jsonb_build_object('table', TG_TABLE_NAME, 'action', 'updated')
    );
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.record_blockchain_transaction(
      'HEALTH_RECORD_DELETED',
      OLD.user_id,
      TG_TABLE_NAME,
      OLD.id,
      jsonb_build_object('table', TG_TABLE_NAME, 'action', 'deleted')
    );
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER blockchain_patient_background_info AFTER INSERT OR UPDATE OR DELETE ON public.patient_background_info FOR EACH ROW EXECUTE FUNCTION public.blockchain_clinical_record_trigger();
CREATE TRIGGER blockchain_patient_comorbidities AFTER INSERT OR UPDATE OR DELETE ON public.patient_comorbidities FOR EACH ROW EXECUTE FUNCTION public.blockchain_clinical_record_trigger();
CREATE TRIGGER blockchain_patient_clinical_investigations AFTER INSERT OR UPDATE OR DELETE ON public.patient_clinical_investigations FOR EACH ROW EXECUTE FUNCTION public.blockchain_clinical_record_trigger();
CREATE TRIGGER blockchain_patient_running_treatments AFTER INSERT OR UPDATE OR DELETE ON public.patient_running_treatments FOR EACH ROW EXECUTE FUNCTION public.blockchain_clinical_record_trigger();
CREATE TRIGGER blockchain_patient_care_team AFTER INSERT OR UPDATE OR DELETE ON public.patient_care_team FOR EACH ROW EXECUTE FUNCTION public.blockchain_clinical_record_trigger();
CREATE TRIGGER blockchain_patient_complications_status AFTER INSERT OR UPDATE OR DELETE ON public.patient_complications_status FOR EACH ROW EXECUTE FUNCTION public.blockchain_clinical_record_trigger();

-- Audit trail triggers
CREATE OR REPLACE FUNCTION public.audit_clinical_record_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.add_audit_entry(
      'RECORD_CREATED', TG_TABLE_NAME, NEW.id, NEW.user_id, 'created',
      jsonb_build_object('table', TG_TABLE_NAME)
    );
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM public.add_audit_entry(
      'RECORD_UPDATED', TG_TABLE_NAME, NEW.id, NEW.user_id, 'updated',
      jsonb_build_object('table', TG_TABLE_NAME)
    );
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.add_audit_entry(
      'RECORD_DELETED', TG_TABLE_NAME, OLD.id, OLD.user_id, 'deleted',
      jsonb_build_object('table', TG_TABLE_NAME)
    );
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER audit_patient_background_info AFTER INSERT OR UPDATE OR DELETE ON public.patient_background_info FOR EACH ROW EXECUTE FUNCTION public.audit_clinical_record_trigger();
CREATE TRIGGER audit_patient_comorbidities AFTER INSERT OR UPDATE OR DELETE ON public.patient_comorbidities FOR EACH ROW EXECUTE FUNCTION public.audit_clinical_record_trigger();
CREATE TRIGGER audit_patient_clinical_investigations AFTER INSERT OR UPDATE OR DELETE ON public.patient_clinical_investigations FOR EACH ROW EXECUTE FUNCTION public.audit_clinical_record_trigger();
CREATE TRIGGER audit_patient_running_treatments AFTER INSERT OR UPDATE OR DELETE ON public.patient_running_treatments FOR EACH ROW EXECUTE FUNCTION public.audit_clinical_record_trigger();
CREATE TRIGGER audit_patient_care_team AFTER INSERT OR UPDATE OR DELETE ON public.patient_care_team FOR EACH ROW EXECUTE FUNCTION public.audit_clinical_record_trigger();
CREATE TRIGGER audit_patient_complications_status AFTER INSERT OR UPDATE OR DELETE ON public.patient_complications_status FOR EACH ROW EXECUTE FUNCTION public.audit_clinical_record_trigger();
