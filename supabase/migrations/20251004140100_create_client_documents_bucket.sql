/*
  # Client Documents Storage Bucket

  1. Yeni Bucket
    - `client-documents` - Müşteri ve admin dosyaları için

  2. Güvenlik
    - Authenticated kullanıcılar dosya yükleyebilir
    - Dosyalar private, sadece yetkili kullanıcılar erişebilir
*/

-- Storage bucket oluştur
INSERT INTO storage.buckets (id, name, public)
VALUES ('client-documents', 'client-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS politikaları
CREATE POLICY "Users can upload documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'client-documents'
);

CREATE POLICY "Users can view own documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'client-documents'
);

CREATE POLICY "Users can update own documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'client-documents'
)
WITH CHECK (
  bucket_id = 'client-documents'
);

CREATE POLICY "Users can delete own documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'client-documents'
);
