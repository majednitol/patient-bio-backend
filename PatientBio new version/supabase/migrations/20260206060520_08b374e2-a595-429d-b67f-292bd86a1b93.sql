-- Medication status enum
CREATE TYPE medication_status AS ENUM ('active', 'discontinued', 'completed');

-- Medication route enum
CREATE TYPE medication_route AS ENUM ('oral', 'iv', 'im', 'sc', 'topical', 'inhalation', 'rectal', 'other');

-- Admission medications table
CREATE TABLE admission_medications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admission_id UUID NOT NULL REFERENCES admissions(id) ON DELETE CASCADE,
  medication_name TEXT NOT NULL,
  dosage TEXT NOT NULL,
  frequency TEXT NOT NULL,
  route medication_route DEFAULT 'oral',
  prescribed_by UUID NOT NULL,
  prescribed_at TIMESTAMPTZ DEFAULT now(),
  status medication_status DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Administration records
CREATE TABLE medication_administrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admission_medication_id UUID NOT NULL REFERENCES admission_medications(id) ON DELETE CASCADE,
  administered_by UUID NOT NULL,
  administered_at TIMESTAMPTZ DEFAULT now(),
  dose_given TEXT NOT NULL,
  notes TEXT,
  skipped BOOLEAN DEFAULT false,
  skip_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_admission_medications_admission ON admission_medications(admission_id);
CREATE INDEX idx_medication_administrations_med ON medication_administrations(admission_medication_id);
CREATE INDEX idx_medication_administrations_time ON medication_administrations(administered_at);

-- Trigger for updated_at
CREATE TRIGGER update_admission_medications_updated_at
  BEFORE UPDATE ON admission_medications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE admission_medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE medication_administrations ENABLE ROW LEVEL SECURITY;

-- Hospital staff can manage medications for their hospital's admissions
CREATE POLICY "Hospital staff can manage admission medications"
ON admission_medications FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM admissions a
    JOIN hospital_staff hs ON hs.hospital_id = a.hospital_id
    WHERE a.id = admission_medications.admission_id
    AND hs.user_id = auth.uid()
    AND hs.is_active = true
  )
);

CREATE POLICY "Hospital staff can manage medication administrations"
ON medication_administrations FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM admission_medications am
    JOIN admissions a ON a.id = am.admission_id
    JOIN hospital_staff hs ON hs.hospital_id = a.hospital_id
    WHERE am.id = medication_administrations.admission_medication_id
    AND hs.user_id = auth.uid()
    AND hs.is_active = true
  )
);