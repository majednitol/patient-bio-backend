-- Add columns to identify guest/walk-in patients
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS is_guest_patient boolean DEFAULT false;

ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS registered_by_hospital_id uuid REFERENCES hospitals(id);

-- Policy: Hospital staff can view patients they registered
CREATE POLICY "Hospital staff can view registered patients" 
ON user_profiles
FOR SELECT
USING (
  registered_by_hospital_id IS NOT NULL 
  AND is_hospital_staff(auth.uid(), registered_by_hospital_id)
);

-- Policy: Hospital staff can insert guest patients for their hospital
CREATE POLICY "Hospital staff can insert guest patients" 
ON user_profiles
FOR INSERT
WITH CHECK (
  is_guest_patient = true
  AND registered_by_hospital_id IS NOT NULL 
  AND is_hospital_staff(auth.uid(), registered_by_hospital_id)
);

-- Policy: Hospital staff can update guest patients they registered
CREATE POLICY "Hospital staff can update guest patients" 
ON user_profiles
FOR UPDATE
USING (
  is_guest_patient = true
  AND registered_by_hospital_id IS NOT NULL 
  AND is_hospital_staff(auth.uid(), registered_by_hospital_id)
);