-- Add encryption metadata columns to health_records
ALTER TABLE public.health_records
ADD COLUMN IF NOT EXISTS is_encrypted boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS encryption_salt text,
ADD COLUMN IF NOT EXISTS encryption_iv text;

-- Add comment for documentation
COMMENT ON COLUMN public.health_records.is_encrypted IS 'Whether the file is client-side encrypted';
COMMENT ON COLUMN public.health_records.encryption_salt IS 'Base64-encoded salt for PBKDF2 key derivation';
COMMENT ON COLUMN public.health_records.encryption_iv IS 'Base64-encoded IV for AES-GCM decryption';