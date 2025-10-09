/*
  # Dosya Yönetim Sistemi

  1. Yeni Tablolar
    - `client_documents`
      - `id` (uuid, primary key)
      - `client_id` (uuid, foreign key to clients)
      - `agent_id` (uuid, foreign key to profiles)
      - `uploaded_by` (uuid, foreign key to profiles) - Admin veya müşteri
      - `document_type` (text) - ruhsat, ehliyet, hasar_fotografi, fatura, diger
      - `document_name` (text) - Dosya adı
      - `file_path` (text) - Storage'daki dosya yolu
      - `file_size` (bigint) - Dosya boyutu (bytes)
      - `mime_type` (text) - Dosya tipi
      - `description` (text) - Açıklama
      - `related_policy_id` (uuid) - İlgili poliçe (optional)
      - `related_claim_id` (uuid) - İlgili hasar (optional)
      - `is_visible_to_client` (boolean) - Müşteriye görünür mü?
      - `created_at` (timestamp)

  2. Güvenlik
    - RLS ile müşteriler sadece kendi dosyalarını görebilir
    - Admin'ler tüm dosyaları görebilir
    - Sadece admin'ler ve ilgili müşteri upload edebilir

  3. Storage Bucket
    - client-documents bucket'ı oluşturulacak
*/

-- Client documents tablosu
CREATE TABLE IF NOT EXISTS client_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  agent_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  uploaded_by uuid REFERENCES profiles(id) ON DELETE SET NULL NOT NULL,
  document_type text NOT NULL CHECK (document_type IN ('ruhsat', 'ehliyet', 'hasar_fotografi', 'fatura', 'sozlesme', 'diger')),
  document_name text NOT NULL,
  file_path text NOT NULL,
  file_size bigint NOT NULL,
  mime_type text NOT NULL,
  description text,
  related_policy_id uuid REFERENCES policies(id) ON DELETE SET NULL,
  related_claim_id uuid REFERENCES claims(id) ON DELETE SET NULL,
  is_visible_to_client boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Index'ler
CREATE INDEX IF NOT EXISTS idx_client_documents_client_id ON client_documents(client_id);
CREATE INDEX IF NOT EXISTS idx_client_documents_agent_id ON client_documents(agent_id);
CREATE INDEX IF NOT EXISTS idx_client_documents_uploaded_by ON client_documents(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_client_documents_document_type ON client_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_client_documents_related_policy_id ON client_documents(related_policy_id);
CREATE INDEX IF NOT EXISTS idx_client_documents_related_claim_id ON client_documents(related_claim_id);
CREATE INDEX IF NOT EXISTS idx_client_documents_created_at ON client_documents(created_at DESC);

-- RLS aktifleştir
ALTER TABLE client_documents ENABLE ROW LEVEL SECURITY;

-- RLS Politikaları
CREATE POLICY "Users can view own documents"
  ON client_documents FOR SELECT
  TO authenticated
  USING (
    auth.uid() = agent_id OR
    (
      is_visible_to_client = true AND
      EXISTS (
        SELECT 1 FROM clients c
        WHERE c.id = client_documents.client_id
          AND c.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can upload documents"
  ON client_documents FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = agent_id OR
    EXISTS (
      SELECT 1 FROM clients c
      WHERE c.id = client_id
        AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can update documents"
  ON client_documents FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete documents"
  ON client_documents FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
    )
  );

-- Müşteri dosya yüklediğinde admin'e bildirim
CREATE OR REPLACE FUNCTION notify_admin_document_upload()
RETURNS TRIGGER AS $$
BEGIN
  -- Sadece müşteri yüklediğinde bildirim gönder
  IF EXISTS (
    SELECT 1 FROM clients c
    WHERE c.id = NEW.client_id
      AND c.user_id = NEW.uploaded_by
  ) THEN
    -- Sorumlu agent'e bildirim gönder
    INSERT INTO notifications (user_id, title, message, type, link, related_id)
    SELECT
      NEW.agent_id,
      'Yeni Dosya Yüklendi',
      (SELECT c.full_name FROM clients c WHERE c.id = NEW.client_id) ||
      ' yeni bir dosya yükledi: ' || NEW.document_name,
      'new_message',
      'documents',
      NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger oluştur
DROP TRIGGER IF EXISTS trigger_notify_document_upload ON client_documents;
CREATE TRIGGER trigger_notify_document_upload
  AFTER INSERT ON client_documents
  FOR EACH ROW
  EXECUTE FUNCTION notify_admin_document_upload();
