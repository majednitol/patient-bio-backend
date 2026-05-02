
-- Follow-up tasks table for post-appointment reminders
CREATE TABLE public.follow_up_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE CASCADE NOT NULL,
  task_type TEXT NOT NULL DEFAULT 'general',
  title TEXT NOT NULL,
  description TEXT,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  due_date DATE,
  reminder_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.follow_up_tasks ENABLE ROW LEVEL SECURITY;

-- Patients can read their own follow-up tasks
CREATE POLICY "Patients can view own follow-up tasks"
  ON public.follow_up_tasks FOR SELECT
  TO authenticated
  USING (patient_id = auth.uid());

-- Patients can update their own follow-up tasks (toggle completion)
CREATE POLICY "Patients can update own follow-up tasks"
  ON public.follow_up_tasks FOR UPDATE
  TO authenticated
  USING (patient_id = auth.uid())
  WITH CHECK (patient_id = auth.uid());

-- Patients can insert their own follow-up tasks
CREATE POLICY "Patients can insert own follow-up tasks"
  ON public.follow_up_tasks FOR INSERT
  TO authenticated
  WITH CHECK (patient_id = auth.uid());

-- Patients can delete their own follow-up tasks
CREATE POLICY "Patients can delete own follow-up tasks"
  ON public.follow_up_tasks FOR DELETE
  TO authenticated
  USING (patient_id = auth.uid());

-- Doctors can insert follow-up tasks for their patients
CREATE POLICY "Doctors can insert follow-up tasks for patients"
  ON public.follow_up_tasks FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'doctor') AND
    public.has_active_doctor_access(auth.uid(), patient_id)
  );

-- Index for fast lookups
CREATE INDEX idx_follow_up_tasks_patient_id ON public.follow_up_tasks (patient_id, is_completed, due_date);
CREATE INDEX idx_follow_up_tasks_appointment_id ON public.follow_up_tasks (appointment_id);

-- Auto-update updated_at
CREATE TRIGGER update_follow_up_tasks_updated_at
  BEFORE UPDATE ON public.follow_up_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
