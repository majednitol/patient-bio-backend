-- Composite indexes for common query patterns

-- symptom_screenings: used by screening history queries
CREATE INDEX IF NOT EXISTS idx_symptom_screenings_user_created 
ON public.symptom_screenings (user_id, created_at DESC);

-- doctor_pathologist_shares: used by pathologist dashboard
CREATE INDEX IF NOT EXISTS idx_doctor_pathologist_shares_pathologist_shared 
ON public.doctor_pathologist_shares (pathologist_id, shared_at DESC);

-- data_transfer_agreements: used by international data page
CREATE INDEX IF NOT EXISTS idx_data_transfer_agreements_token_created 
ON public.data_transfer_agreements (access_token_id, created_at DESC);

-- data_transfer_agreements: user-scoped queries
CREATE INDEX IF NOT EXISTS idx_data_transfer_agreements_user_created 
ON public.data_transfer_agreements (user_id, created_at DESC);

-- fhir_subscriptions: used by subscription status queries
CREATE INDEX IF NOT EXISTS idx_fhir_subscriptions_user_status 
ON public.fhir_subscriptions (user_id, status);

-- doctor_share_history: used by share history queries
CREATE INDEX IF NOT EXISTS idx_doctor_share_history_user_shared 
ON public.doctor_share_history (user_id, shared_at DESC);

-- hospital_lab_orders: used by pathologist lab orders
CREATE INDEX IF NOT EXISTS idx_hospital_lab_orders_pathologist_created 
ON public.hospital_lab_orders (pathologist_id, created_at DESC);

-- provider_verifications: used by admin verification listing
CREATE INDEX IF NOT EXISTS idx_provider_verifications_submitted 
ON public.provider_verifications (submitted_at DESC);

-- doctor_staff: used by doctor staff listing
CREATE INDEX IF NOT EXISTS idx_doctor_staff_doctor_created 
ON public.doctor_staff (doctor_id, created_at DESC);