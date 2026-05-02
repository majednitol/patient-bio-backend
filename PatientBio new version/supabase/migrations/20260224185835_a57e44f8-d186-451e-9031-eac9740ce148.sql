ALTER TABLE public.doctor_profiles
  ADD COLUMN is_online boolean NOT NULL DEFAULT false,
  ADD COLUMN last_seen_at timestamptz;