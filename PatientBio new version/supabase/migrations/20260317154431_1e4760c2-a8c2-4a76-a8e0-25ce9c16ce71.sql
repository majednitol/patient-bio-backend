
-- Performance indexes for frequently queried columns

-- access_logs: queried by user_id + accessed_at in useRecentActivity, useAccessHistory
CREATE INDEX IF NOT EXISTS idx_access_logs_user_id_accessed_at ON public.access_logs (user_id, accessed_at DESC);

-- health_records: queried by user_id + uploaded_at in useHealthRecords
CREATE INDEX IF NOT EXISTS idx_health_records_user_id_uploaded_at ON public.health_records (user_id, uploaded_at DESC);

-- notifications: queried by user_id + created_at in useNotifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_id_created_at ON public.notifications (user_id, created_at DESC);

-- data_transactions: queried by patient_id + created_at in useRecentActivity
CREATE INDEX IF NOT EXISTS idx_data_transactions_patient_id_created_at ON public.data_transactions (patient_id, created_at DESC);

-- data_access_requests: queried by patient_id + status
CREATE INDEX IF NOT EXISTS idx_data_access_requests_patient_id_status ON public.data_access_requests (patient_id, status);

-- audit_trail: queried by user_id + created_at in useUserRecentActivity
CREATE INDEX IF NOT EXISTS idx_audit_trail_user_id_created_at ON public.audit_trail (user_id, created_at DESC);

-- doctor_patient_access: queried by patient_id + is_active
CREATE INDEX IF NOT EXISTS idx_doctor_patient_access_patient_id_active ON public.doctor_patient_access (patient_id, is_active);

-- appointments: queried by patient_id + appointment_date
CREATE INDEX IF NOT EXISTS idx_appointments_patient_id_date ON public.appointments (patient_id, appointment_date DESC);

-- appointments: queried by doctor_id + appointment_date
CREATE INDEX IF NOT EXISTS idx_appointments_doctor_id_date ON public.appointments (doctor_id, appointment_date DESC);
