
-- Add FK referencing user_profiles(user_id) so patient_id = auth user ID works correctly
ALTER TABLE appointments
ADD CONSTRAINT appointments_patient_id_fkey
FOREIGN KEY (patient_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE;
