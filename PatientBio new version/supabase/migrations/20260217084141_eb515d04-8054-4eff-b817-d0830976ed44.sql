
-- Create symptom_screenings table to persist screening history
CREATE TABLE public.symptom_screenings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  symptoms TEXT NOT NULL,
  duration TEXT,
  severity TEXT,
  urgency TEXT NOT NULL,
  urgency_label TEXT,
  summary TEXT,
  reasoning TEXT,
  recommendations TEXT[],
  home_remedies TEXT[],
  warning_signs TEXT[],
  estimated_savings TEXT,
  booked_appointment BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.symptom_screenings ENABLE ROW LEVEL SECURITY;

-- Patients can view their own screenings
CREATE POLICY "Users can view own screenings"
ON public.symptom_screenings
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Patients can insert their own screenings
CREATE POLICY "Users can insert own screenings"
ON public.symptom_screenings
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Patients can update their own screenings (e.g., mark as booked)
CREATE POLICY "Users can update own screenings"
ON public.symptom_screenings
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Doctors with active access can view patient screenings
CREATE POLICY "Doctors can view patient screenings"
ON public.symptom_screenings
FOR SELECT
TO authenticated
USING (
  public.has_active_doctor_access(auth.uid(), user_id)
);

-- Index for fast lookups
CREATE INDEX idx_symptom_screenings_user_id ON public.symptom_screenings(user_id);
CREATE INDEX idx_symptom_screenings_created_at ON public.symptom_screenings(user_id, created_at DESC);
