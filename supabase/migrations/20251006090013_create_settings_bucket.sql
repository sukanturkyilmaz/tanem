/*
  # Create Storage Bucket for Settings (Logo)

  1. Storage Setup
    - Create 'settings' bucket for logo and other settings files
    - Set bucket as public for easy access
    - Add RLS policies for secure uploads

  2. Security
    - Only authenticated users (admin/agent) can upload files
    - Everyone can view files (for logo display)
*/

-- Create storage bucket for settings
INSERT INTO storage.buckets (id, name, public)
VALUES ('settings', 'settings', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload settings files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'settings');

-- Allow authenticated users to update files
CREATE POLICY "Authenticated users can update settings files"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'settings');

-- Allow authenticated users to delete files
CREATE POLICY "Authenticated users can delete settings files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'settings');

-- Allow public access to view files
CREATE POLICY "Public can view settings files"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'settings');