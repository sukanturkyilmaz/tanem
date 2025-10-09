/*
  # Create Storage Bucket for Policies

  1. Storage Setup
    - Create 'policies' bucket for PDF files
    - Set bucket as public for easy access
    - Add RLS policies for secure uploads

  2. Security
    - Authenticated users can upload files
    - Everyone can view files (for PDF viewer)
*/

-- Create storage bucket for policies
INSERT INTO storage.buckets (id, name, public)
VALUES ('policies', 'policies', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload policy files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'policies');

-- Allow authenticated users to update their files
CREATE POLICY "Authenticated users can update policy files"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'policies');

-- Allow authenticated users to delete files
CREATE POLICY "Authenticated users can delete policy files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'policies');

-- Allow public access to view files
CREATE POLICY "Public can view policy files"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'policies');