ALTER TABLE public.notifications DROP CONSTRAINT notifications_type_check;

ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check CHECK (type = ANY (ARRAY[
  'access_request'::text, 
  'data_viewed'::text, 
  'prescription_added'::text, 
  'request_approved'::text, 
  'request_rejected'::text, 
  'report_shared'::text, 
  'hospital_admission'::text, 
  'hospital_discharge'::text, 
  'hospital_appointment'::text, 
  'hospital_doctor_application'::text, 
  'medication_reminder'::text, 
  'caregiver_alert'::text,
  'verification_approved'::text,
  'verification_rejected'::text
]));