
-- Performance indexes for access_logs (622ms baseline - most critical)
CREATE INDEX IF NOT EXISTS idx_access_logs_user_id_accessed_at 
  ON public.access_logs (user_id, accessed_at DESC);

CREATE INDEX IF NOT EXISTS idx_access_logs_accessed_at 
  ON public.access_logs (accessed_at DESC);

CREATE INDEX IF NOT EXISTS idx_access_logs_accessor_type 
  ON public.access_logs (accessor_type);

-- Indexes for appointments (frequently queried by doctor_id, patient_id, date)
CREATE INDEX IF NOT EXISTS idx_appointments_doctor_id_date 
  ON public.appointments (doctor_id, appointment_date DESC);

CREATE INDEX IF NOT EXISTS idx_appointments_patient_id_date 
  ON public.appointments (patient_id, appointment_date DESC);

CREATE INDEX IF NOT EXISTS idx_appointments_status 
  ON public.appointments (status);

-- Indexes for prescriptions
CREATE INDEX IF NOT EXISTS idx_prescriptions_doctor_id_created 
  ON public.prescriptions (doctor_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_prescriptions_patient_id_created 
  ON public.prescriptions (patient_id, created_at DESC);

-- Indexes for health_records  
CREATE INDEX IF NOT EXISTS idx_health_records_user_id_uploaded 
  ON public.health_records (user_id, uploaded_at DESC);

-- Indexes for notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_id_created 
  ON public.notifications (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id_read 
  ON public.notifications (user_id, is_read);

-- Indexes for data_access_requests
CREATE INDEX IF NOT EXISTS idx_data_access_requests_patient_id_status 
  ON public.data_access_requests (patient_id, status);

CREATE INDEX IF NOT EXISTS idx_data_access_requests_requester_id 
  ON public.data_access_requests (requester_id);

-- Indexes for data_transactions
CREATE INDEX IF NOT EXISTS idx_data_transactions_patient_id_created 
  ON public.data_transactions (patient_id, created_at DESC);

-- Indexes for doctor_patient_access
CREATE INDEX IF NOT EXISTS idx_doctor_patient_access_doctor_patient 
  ON public.doctor_patient_access (doctor_id, patient_id, is_active);

-- Indexes for admin_audit_logs
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created 
  ON public.admin_audit_logs (created_at DESC);

-- Indexes for audit_trail
CREATE INDEX IF NOT EXISTS idx_audit_trail_user_id_created 
  ON public.audit_trail (user_id, created_at DESC);

-- Indexes for consent_records
CREATE INDEX IF NOT EXISTS idx_consent_records_patient_id_active 
  ON public.consent_records (patient_id, is_active);
