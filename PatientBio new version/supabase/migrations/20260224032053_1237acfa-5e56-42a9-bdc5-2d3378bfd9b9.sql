
-- Add cloud storage columns to backup_schedules
ALTER TABLE public.backup_schedules ADD COLUMN storage_destination text NOT NULL DEFAULT 'local';
ALTER TABLE public.backup_schedules ADD COLUMN cloud_folder_id text;

-- Add cloud upload tracking columns to backup_runs
ALTER TABLE public.backup_runs ADD COLUMN storage_destination text DEFAULT 'local';
ALTER TABLE public.backup_runs ADD COLUMN cloud_file_id text;
ALTER TABLE public.backup_runs ADD COLUMN cloud_upload_status text DEFAULT 'pending';
ALTER TABLE public.backup_runs ADD COLUMN cloud_file_url text;

-- Create private backups storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('backups', 'backups', false);

-- RLS: Only admins can read backup files
CREATE POLICY "Admins can read backups"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'backups'
  AND public.has_role(auth.uid(), 'admin')
);

-- RLS: Only admins can upload backup files
CREATE POLICY "Admins can upload backups"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'backups'
  AND public.has_role(auth.uid(), 'admin')
);

-- RLS: Only admins can delete backup files
CREATE POLICY "Admins can delete backups"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'backups'
  AND public.has_role(auth.uid(), 'admin')
);
