/*
  # Create storage bucket for policy documents

  1. New Storage Bucket
    - `policy-documents` - stores PDF files for insurance policies
  
  2. Security
    - Authenticated users can upload files
    - Users can only access their own policy documents
    - File size limit: 10MB per file
    - Allowed file types: PDF only
*/

-- Create storage bucket for policy documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'policy-documents',
  'policy-documents',
  false,
  10485760,
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Authenticated users can upload policy documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own policy documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own policy documents" ON storage.objects;

-- Allow authenticated users to upload policy documents
CREATE POLICY "Authenticated users can upload policy documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'policy-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to view their own policy documents
CREATE POLICY "Users can view own policy documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'policy-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to delete their own policy documents
CREATE POLICY "Users can delete own policy documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'policy-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);