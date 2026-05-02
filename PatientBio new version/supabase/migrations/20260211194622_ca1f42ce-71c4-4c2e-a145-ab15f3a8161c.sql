-- Add missing FK: patient_id -> user_profiles(user_id)
ALTER TABLE public.hospital_lab_orders
  ADD CONSTRAINT hospital_lab_orders_patient_id_fkey
  FOREIGN KEY (patient_id) REFERENCES public.user_profiles(user_id);

-- Add missing FK: pathologist_id -> pathologist_profiles(user_id)
ALTER TABLE public.hospital_lab_orders
  ADD CONSTRAINT hospital_lab_orders_pathologist_id_fkey
  FOREIGN KEY (pathologist_id) REFERENCES public.pathologist_profiles(user_id);