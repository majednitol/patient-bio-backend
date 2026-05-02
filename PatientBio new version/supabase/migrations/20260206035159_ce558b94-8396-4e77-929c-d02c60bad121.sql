-- Add RLS policy for hospital logo uploads
CREATE POLICY "Hospital staff can upload hospital logos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] LIKE 'hospital-%'
  AND EXISTS (
    SELECT 1 FROM public.hospital_staff
    WHERE hospital_staff.user_id = auth.uid()
    AND hospital_staff.hospital_id = (storage.foldername(name))[1]::uuid
    AND hospital_staff.is_active = true
  )
);

-- Allow hospital staff to view and delete their hospital logos
CREATE POLICY "Hospital staff can manage hospital logos"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] LIKE 'hospital-%'
);

CREATE POLICY "Hospital staff can delete hospital logos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] LIKE 'hospital-%'
  AND EXISTS (
    SELECT 1 FROM public.hospital_staff
    WHERE hospital_staff.user_id = auth.uid()
    AND hospital_staff.hospital_id = (storage.foldername(name))[1]::uuid
    AND hospital_staff.is_active = true
  )
);