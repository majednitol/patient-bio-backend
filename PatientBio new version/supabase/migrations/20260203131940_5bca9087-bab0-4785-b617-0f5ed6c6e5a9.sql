-- Policy 1: Doctors can view their connected patients' profiles
CREATE POLICY "Doctors can view connected patients profiles"
  ON user_profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM doctor_patient_access dpa
      WHERE dpa.doctor_id = auth.uid()
        AND dpa.patient_id = user_profiles.user_id
        AND dpa.is_active = true
    )
  );

-- Policy 2: Patients can view their connected doctors' profiles
CREATE POLICY "Patients can view connected doctors profiles"
  ON doctor_profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM doctor_patient_access dpa
      WHERE dpa.patient_id = auth.uid()
        AND dpa.doctor_id = doctor_profiles.user_id
        AND dpa.is_active = true
    )
  );