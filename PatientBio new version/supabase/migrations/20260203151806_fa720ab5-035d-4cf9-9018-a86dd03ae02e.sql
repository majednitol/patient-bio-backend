-- Create appointment status enum
CREATE TYPE public.appointment_status AS ENUM (
  'scheduled',
  'confirmed',
  'completed',
  'cancelled',
  'no_show'
);

-- Create doctor_availability table - stores weekly schedule patterns
CREATE TABLE public.doctor_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL,
  hospital_id UUID REFERENCES public.hospitals(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  slot_duration_minutes INTEGER NOT NULL DEFAULT 30,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(doctor_id, hospital_id, day_of_week)
);

-- Create appointments table
CREATE TABLE public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL,
  doctor_id UUID NOT NULL,
  hospital_id UUID REFERENCES public.hospitals(id) ON DELETE CASCADE,
  appointment_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status public.appointment_status DEFAULT 'scheduled',
  reason TEXT,
  notes TEXT,
  cancelled_by UUID,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create doctor_time_off table
CREATE TABLE public.doctor_time_off (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL,
  hospital_id UUID REFERENCES public.hospitals(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.doctor_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctor_time_off ENABLE ROW LEVEL SECURITY;

-- Create indexes for performance
CREATE INDEX idx_appointments_doctor_date ON public.appointments(doctor_id, appointment_date);
CREATE INDEX idx_appointments_patient ON public.appointments(patient_id);
CREATE INDEX idx_appointments_hospital_date ON public.appointments(hospital_id, appointment_date);
CREATE INDEX idx_availability_doctor ON public.doctor_availability(doctor_id, hospital_id);
CREATE INDEX idx_time_off_doctor ON public.doctor_time_off(doctor_id, start_date, end_date);

-- RLS Policies for doctor_availability

-- Doctors can manage their own availability
CREATE POLICY "Doctors can manage own availability"
ON public.doctor_availability
FOR ALL
USING (auth.uid() = doctor_id)
WITH CHECK (auth.uid() = doctor_id);

-- Hospital staff can view availability for their hospital
CREATE POLICY "Hospital staff can view availability"
ON public.doctor_availability
FOR SELECT
USING (is_hospital_staff(auth.uid(), hospital_id));

-- Anyone authenticated can view active availability for booking
CREATE POLICY "Authenticated users can view active availability"
ON public.doctor_availability
FOR SELECT
USING (is_active = true AND auth.uid() IS NOT NULL);

-- RLS Policies for appointments

-- Patients can view their own appointments
CREATE POLICY "Patients can view own appointments"
ON public.appointments
FOR SELECT
USING (auth.uid() = patient_id);

-- Patients can create appointments
CREATE POLICY "Patients can create appointments"
ON public.appointments
FOR INSERT
WITH CHECK (auth.uid() = patient_id);

-- Patients can cancel their own appointments
CREATE POLICY "Patients can update own appointments"
ON public.appointments
FOR UPDATE
USING (auth.uid() = patient_id);

-- Doctors can view appointments where they are the doctor
CREATE POLICY "Doctors can view their appointments"
ON public.appointments
FOR SELECT
USING (auth.uid() = doctor_id);

-- Doctors can update their appointments (status, notes)
CREATE POLICY "Doctors can update their appointments"
ON public.appointments
FOR UPDATE
USING (auth.uid() = doctor_id);

-- Hospital staff can view all appointments at their hospital
CREATE POLICY "Hospital staff can view hospital appointments"
ON public.appointments
FOR SELECT
USING (is_hospital_staff(auth.uid(), hospital_id));

-- Hospital admins can manage all appointments at their hospital
CREATE POLICY "Hospital admins can manage hospital appointments"
ON public.appointments
FOR ALL
USING (is_hospital_admin(auth.uid(), hospital_id))
WITH CHECK (is_hospital_admin(auth.uid(), hospital_id));

-- RLS Policies for doctor_time_off

-- Doctors can manage their own time off
CREATE POLICY "Doctors can manage own time off"
ON public.doctor_time_off
FOR ALL
USING (auth.uid() = doctor_id)
WITH CHECK (auth.uid() = doctor_id);

-- Hospital staff can view time off for their hospital
CREATE POLICY "Hospital staff can view time off"
ON public.doctor_time_off
FOR SELECT
USING (is_hospital_staff(auth.uid(), hospital_id));

-- Authenticated users can view time off for booking purposes
CREATE POLICY "Authenticated can view time off"
ON public.doctor_time_off
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Create trigger for updated_at on doctor_availability
CREATE TRIGGER update_doctor_availability_updated_at
BEFORE UPDATE ON public.doctor_availability
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger for updated_at on appointments
CREATE TRIGGER update_appointments_updated_at
BEFORE UPDATE ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();