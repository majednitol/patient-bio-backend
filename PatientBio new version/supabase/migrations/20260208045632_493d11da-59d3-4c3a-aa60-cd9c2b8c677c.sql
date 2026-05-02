-- Track all provider imports (patients, doctors, hospitals, pathologists, researchers)
CREATE TABLE provider_import_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_type TEXT NOT NULL CHECK (provider_type IN ('patient', 'doctor', 'hospital', 'pathologist', 'researcher')),
  provider_id UUID NOT NULL,
  import_type TEXT NOT NULL,
  source_format TEXT NOT NULL CHECK (source_format IN ('csv', 'excel', 'fhir_r4', 'json', 'ccda')),
  source_filename TEXT,
  total_records INTEGER NOT NULL DEFAULT 0,
  imported_count INTEGER NOT NULL DEFAULT 0,
  skipped_count INTEGER NOT NULL DEFAULT 0,
  error_count INTEGER NOT NULL DEFAULT 0,
  error_details JSONB,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'rolled_back')),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE provider_import_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own imports
CREATE POLICY "Users can view own imports"
  ON provider_import_logs FOR SELECT
  TO authenticated
  USING (provider_id = auth.uid());

-- Policy: Users can create their own imports
CREATE POLICY "Users can create own imports"
  ON provider_import_logs FOR INSERT
  TO authenticated
  WITH CHECK (provider_id = auth.uid());

-- Policy: Users can update their own imports
CREATE POLICY "Users can update own imports"
  ON provider_import_logs FOR UPDATE
  TO authenticated
  USING (provider_id = auth.uid());

-- Detailed record-level tracking for audit trail
CREATE TABLE provider_import_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_log_id UUID REFERENCES provider_import_logs ON DELETE CASCADE NOT NULL,
  source_row_number INTEGER,
  source_data JSONB NOT NULL,
  target_table TEXT NOT NULL,
  target_record_id UUID,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'error', 'skipped', 'duplicate')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS (inherits from parent log)
ALTER TABLE provider_import_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view records of own imports"
  ON provider_import_records FOR SELECT
  TO authenticated
  USING (
    import_log_id IN (
      SELECT id FROM provider_import_logs WHERE provider_id = auth.uid()
    )
  );

CREATE POLICY "Users can create records for own imports"
  ON provider_import_records FOR INSERT
  TO authenticated
  WITH CHECK (
    import_log_id IN (
      SELECT id FROM provider_import_logs WHERE provider_id = auth.uid()
    )
  );

-- Create indexes for better query performance
CREATE INDEX idx_provider_import_logs_provider ON provider_import_logs(provider_id);
CREATE INDEX idx_provider_import_logs_status ON provider_import_logs(status);
CREATE INDEX idx_provider_import_records_log ON provider_import_records(import_log_id);
CREATE INDEX idx_provider_import_records_status ON provider_import_records(status);