
-- Allow admins to upload to the platform/ folder in avatars bucket
CREATE POLICY "Admins can upload platform logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = 'platform'
  AND public.has_role(auth.uid(), 'admin')
);

-- Allow admins to update platform logos
CREATE POLICY "Admins can update platform logos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = 'platform'
  AND public.has_role(auth.uid(), 'admin')
);

-- Allow admins to delete platform logos
CREATE POLICY "Admins can delete platform logos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = 'platform'
  AND public.has_role(auth.uid(), 'admin')
);
