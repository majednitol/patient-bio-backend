
-- Drop the old FK constraint that references user_profiles(id)
ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_patient_id_fkey;
