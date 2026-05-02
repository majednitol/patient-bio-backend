
-- Doctor Settings table
CREATE TABLE public.doctor_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  default_consultation_minutes INTEGER DEFAULT 30,
  timezone TEXT DEFAULT 'Asia/Dhaka',
  email_digest_enabled BOOLEAN DEFAULT true,
  notification_new_patient BOOLEAN DEFAULT true,
  notification_appointment BOOLEAN DEFAULT true,
  notification_prescription BOOLEAN DEFAULT true,
  notification_referral BOOLEAN DEFAULT true,
  auto_reply_enabled BOOLEAN DEFAULT false,
  auto_reply_message TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.doctor_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Doctors can view own settings" ON public.doctor_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Doctors can insert own settings" ON public.doctor_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Doctors can update own settings" ON public.doctor_settings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE TRIGGER update_doctor_settings_updated_at
  BEFORE UPDATE ON public.doctor_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Doctor-to-Doctor Referrals table
CREATE TABLE public.doctor_referrals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referring_doctor_id UUID NOT NULL,
  referred_to_doctor_id UUID NOT NULL,
  patient_id UUID NOT NULL,
  hospital_id UUID REFERENCES public.hospitals(id),
  specialty_needed TEXT,
  urgency TEXT DEFAULT 'routine' CHECK (urgency IN ('routine', 'urgent', 'emergency')),
  reason TEXT NOT NULL,
  clinical_notes TEXT,
  diagnosis TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'completed', 'cancelled')),
  responded_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.doctor_referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Referring doctor can view own referrals" ON public.doctor_referrals
  FOR SELECT USING (auth.uid() = referring_doctor_id OR auth.uid() = referred_to_doctor_id);

CREATE POLICY "Doctors can create referrals" ON public.doctor_referrals
  FOR INSERT WITH CHECK (auth.uid() = referring_doctor_id);

CREATE POLICY "Referred doctor can update referral status" ON public.doctor_referrals
  FOR UPDATE USING (auth.uid() = referred_to_doctor_id OR auth.uid() = referring_doctor_id);

CREATE TRIGGER update_doctor_referrals_updated_at
  BEFORE UPDATE ON public.doctor_referrals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Recurring Appointments columns
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS recurrence_pattern TEXT CHECK (recurrence_pattern IN ('weekly', 'biweekly', 'monthly', NULL)),
  ADD COLUMN IF NOT EXISTS recurrence_end_date DATE,
  ADD COLUMN IF NOT EXISTS parent_appointment_id UUID REFERENCES public.appointments(id);
