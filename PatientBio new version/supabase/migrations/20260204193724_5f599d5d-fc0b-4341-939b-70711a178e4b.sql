-- Create pathologist-reports storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('pathologist-reports', 'pathologist-reports', false);

-- RLS: Pathologists can upload their own files
CREATE POLICY "Pathologists can upload files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'pathologist-reports' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- RLS: Pathologists can read their own files
CREATE POLICY "Pathologists can read their files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'pathologist-reports' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- RLS: Pathologists can update their own files
CREATE POLICY "Pathologists can update their files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'pathologist-reports' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- RLS: Pathologists can delete their own files
CREATE POLICY "Pathologists can delete their files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'pathologist-reports' AND
  (storage.foldername(name))[1] = auth.uid()::text
);