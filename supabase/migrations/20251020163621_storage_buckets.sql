/*
  ================================================================
  Storage Buckets Setup
  ================================================================
*/

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('policies', 'policies', true),
  ('policy-documents', 'policy-documents', true),
  ('client-documents', 'client-documents', true),
  ('settings', 'settings', true),
  ('project-backups', 'project-backups', false)
ON CONFLICT (id) DO NOTHING;

-- Policies bucket RLS
DO $$
BEGIN
  DROP POLICY IF EXISTS "Authenticated users can upload policy files" ON storage.objects;
  DROP POLICY IF EXISTS "Authenticated users can update policy files" ON storage.objects;
  DROP POLICY IF EXISTS "Authenticated users can delete policy files" ON storage.objects;
  DROP POLICY IF EXISTS "Public can view policy files" ON storage.objects;

  CREATE POLICY "Authenticated users can upload policy files"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'policies');

  CREATE POLICY "Authenticated users can update policy files"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (bucket_id = 'policies');

  CREATE POLICY "Authenticated users can delete policy files"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (bucket_id = 'policies');

  CREATE POLICY "Public can view policy files"
    ON storage.objects FOR SELECT
    TO public
    USING (bucket_id = 'policies');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Policy-documents bucket RLS
DO $$
BEGIN
  DROP POLICY IF EXISTS "Authenticated users can upload to policy-documents" ON storage.objects;
  DROP POLICY IF EXISTS "Authenticated users can update policy-documents" ON storage.objects;
  DROP POLICY IF EXISTS "Authenticated users can delete from policy-documents" ON storage.objects;
  DROP POLICY IF EXISTS "Public can view policy-documents" ON storage.objects;

  CREATE POLICY "Authenticated users can upload to policy-documents"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'policy-documents');

  CREATE POLICY "Authenticated users can update policy-documents"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (bucket_id = 'policy-documents');

  CREATE POLICY "Authenticated users can delete from policy-documents"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (bucket_id = 'policy-documents');

  CREATE POLICY "Public can view policy-documents"
    ON storage.objects FOR SELECT
    TO public
    USING (bucket_id = 'policy-documents');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Client-documents bucket RLS
DO $$
BEGIN
  DROP POLICY IF EXISTS "Authenticated users can upload to client-documents" ON storage.objects;
  DROP POLICY IF EXISTS "Authenticated users can update client-documents" ON storage.objects;
  DROP POLICY IF EXISTS "Authenticated users can delete from client-documents" ON storage.objects;
  DROP POLICY IF EXISTS "Authenticated users can view client-documents" ON storage.objects;

  CREATE POLICY "Authenticated users can upload to client-documents"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'client-documents');

  CREATE POLICY "Authenticated users can update client-documents"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (bucket_id = 'client-documents');

  CREATE POLICY "Authenticated users can delete from client-documents"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (bucket_id = 'client-documents');

  CREATE POLICY "Authenticated users can view client-documents"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (bucket_id = 'client-documents');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Settings bucket RLS
DO $$
BEGIN
  DROP POLICY IF EXISTS "Authenticated users can upload to settings" ON storage.objects;
  DROP POLICY IF EXISTS "Authenticated users can update settings files" ON storage.objects;
  DROP POLICY IF EXISTS "Authenticated users can delete from settings" ON storage.objects;
  DROP POLICY IF EXISTS "Public can view settings files" ON storage.objects;

  CREATE POLICY "Authenticated users can upload to settings"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'settings');

  CREATE POLICY "Authenticated users can update settings files"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (bucket_id = 'settings');

  CREATE POLICY "Authenticated users can delete from settings"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (bucket_id = 'settings');

  CREATE POLICY "Public can view settings files"
    ON storage.objects FOR SELECT
    TO public
    USING (bucket_id = 'settings');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Project-backups bucket RLS (private)
DO $$
BEGIN
  DROP POLICY IF EXISTS "Admins can upload to project-backups" ON storage.objects;
  DROP POLICY IF EXISTS "Admins can update project-backups" ON storage.objects;
  DROP POLICY IF EXISTS "Admins can delete from project-backups" ON storage.objects;
  DROP POLICY IF EXISTS "Admins can view project-backups" ON storage.objects;

  CREATE POLICY "Admins can upload to project-backups"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
      bucket_id = 'project-backups' AND
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
      )
    );

  CREATE POLICY "Admins can update project-backups"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (
      bucket_id = 'project-backups' AND
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
      )
    );

  CREATE POLICY "Admins can delete from project-backups"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
      bucket_id = 'project-backups' AND
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
      )
    );

  CREATE POLICY "Admins can view project-backups"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (
      bucket_id = 'project-backups' AND
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
      )
    );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;