-- Drop the incorrect policies
DROP POLICY IF EXISTS "Hospital staff can upload hospital logos" ON storage.objects;
DROP POLICY IF EXISTS "Hospital staff can manage hospital logos" ON storage.objects;
DROP POLICY IF EXISTS "Hospital staff can delete hospital logos" ON storage.objects;

-- Create a helper function to extract hospital ID from storage path
CREATE OR REPLACE FUNCTION public.extract_hospital_id_from_path(path text)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  folder_name text;
  hospital_id_text text;
BEGIN
  -- Get the first folder name from the path
  folder_name := (string_to_array(path, '/'))[1];
  
  -- Extract UUID part after 'hospital-' prefix
  IF folder_name LIKE 'hospital-%' THEN
    hospital_id_text := substring(folder_name from 10); -- Skip 'hospital-'
    BEGIN
      RETURN hospital_id_text::uuid;
    EXCEPTION WHEN OTHERS THEN
      RETURN NULL;
    END;
  END IF;
  
  RETURN NULL;
END;
$$;

-- Create a helper function to check if user is hospital staff
CREATE OR REPLACE FUNCTION public.is_hospital_staff_for_path(user_id uuid, path text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.hospital_staff
    WHERE hospital_staff.user_id = is_hospital_staff_for_path.user_id
    AND hospital_staff.hospital_id = public.extract_hospital_id_from_path(path)
    AND hospital_staff.is_active = true
  )
$$;

-- Add RLS policy for hospital logo uploads
CREATE POLICY "Hospital staff can upload hospital logos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' 
  AND name LIKE 'hospital-%'
  AND public.is_hospital_staff_for_path(auth.uid(), name)
);

-- Allow anyone authenticated to view hospital logos (they're public branding)
CREATE POLICY "Hospital logos are viewable"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'avatars' 
  AND name LIKE 'hospital-%'
);

-- Allow hospital staff to delete their hospital logos
CREATE POLICY "Hospital staff can delete hospital logos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars' 
  AND name LIKE 'hospital-%'
  AND public.is_hospital_staff_for_path(auth.uid(), name)
);