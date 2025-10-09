/*
  # Create Project Backup Bucket

  1. Storage
    - Create `project-backup` bucket for storing project files
  
  2. Security
    - Enable RLS on bucket
    - Only authenticated agents can upload/view backup files
*/

INSERT INTO storage.buckets (id, name, public)
VALUES ('project-backup', 'project-backup', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Agents can upload project backups"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'project-backup' 
    AND auth.uid() IN (SELECT id FROM profiles WHERE role = 'agent')
  );

CREATE POLICY "Agents can view project backups"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'project-backup'
    AND auth.uid() IN (SELECT id FROM profiles WHERE role = 'agent')
  );
