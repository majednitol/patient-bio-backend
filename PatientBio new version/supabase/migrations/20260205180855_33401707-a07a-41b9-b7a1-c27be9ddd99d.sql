-- Add foreign key from appointments.doctor_id to doctor_profiles.user_id
-- This allows joining appointments with doctor profiles
ALTER TABLE public.appointments
ADD CONSTRAINT appointments_doctor_id_fkey
FOREIGN KEY (doctor_id) REFERENCES public.doctor_profiles(user_id)
ON DELETE CASCADE;

-- Add foreign key from appointments.patient_id to user_profiles.id
-- This allows joining appointments with patient profiles
ALTER TABLE public.appointments
ADD CONSTRAINT appointments_patient_id_fkey
FOREIGN KEY (patient_id) REFERENCES public.user_profiles(id)
ON DELETE CASCADE;