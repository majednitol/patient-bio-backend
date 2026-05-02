
-- Add appointment_reminder and data_viewed to the notifications type check constraint
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check CHECK (
  type IN (
    'access', 'share', 'record', 'appointment', 'prescription', 'system',
    'data_request', 'broadcast_request', 'family_link', 'referral',
    'doctor_share', 'pathologist_share', 'researcher_share',
    'lab_order', 'lab_result', 'abnormal_result',
    'admission', 'discharge', 'transfer', 'medication_due',
    'appointment_booked', 'appointment_confirmed', 'appointment_cancelled',
    'appointment_completed', 'appointment_rescheduled', 'appointment_reminder',
    'provider_verification', 'staff_invitation', 'data_viewed'
  )
);
