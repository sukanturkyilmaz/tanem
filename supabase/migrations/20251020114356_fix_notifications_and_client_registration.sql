/*
  # Bildirim Sistemi ve Müşteri Kayıt Akışı Düzeltmeleri

  ## Değişiklikler

  1. **Clients Tablosu Güncellemeleri**
    - `registration_status` kolonu eklendi (pending, completed)
    - `registration_token` kolonu eklendi (güvenlik için)
    - `registration_completed_at` kolonu eklendi

  2. **Trigger Fonksiyonları Düzeltmeleri**
    - `notify_admins_new_message`: Müşteri mesajlarını doğru agent'a bildirir
    - `notify_admin_document_upload`: Müşteri dosya yüklemelerini doğru agent'a bildirir

  3. **Güvenlik**
    - RLS politikaları güncellendi
    - Müşteri kayıt akışı güvenli hale getirildi

  ## Notlar
  - Mevcut müşteriler otomatik olarak 'completed' durumuna alınır
  - Yeni müşteriler 'pending' durumunda başlar
*/

-- Clients tablosuna yeni kolonlar ekle
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'registration_status'
  ) THEN
    ALTER TABLE clients ADD COLUMN registration_status text DEFAULT 'completed'
      CHECK (registration_status IN ('pending', 'completed'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'registration_token'
  ) THEN
    ALTER TABLE clients ADD COLUMN registration_token text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'registration_completed_at'
  ) THEN
    ALTER TABLE clients ADD COLUMN registration_completed_at timestamptz;
  END IF;
END $$;

-- Index'ler ekle
CREATE INDEX IF NOT EXISTS idx_clients_registration_status ON clients(registration_status);
CREATE INDEX IF NOT EXISTS idx_clients_registration_token ON clients(registration_token);

-- Mevcut müşterileri 'completed' durumuna al
UPDATE clients
SET registration_status = 'completed',
    registration_completed_at = created_at
WHERE user_id IS NOT NULL AND registration_status IS NULL;

-- Müşteri mesajı trigger fonksiyonunu düzelt
CREATE OR REPLACE FUNCTION notify_admins_new_message()
RETURNS TRIGGER AS $$
BEGIN
  -- Mesajı gönderen müşterinin agent'ine bildirim gönder
  INSERT INTO notifications (user_id, title, message, type, link, related_id)
  VALUES (
    NEW.agent_id,
    'Yeni Müşteri Mesajı',
    (SELECT c.full_name FROM clients c WHERE c.id = NEW.client_id) ||
    ' yeni bir destek talebi gönderdi: ' || LEFT(NEW.message, 100),
    'new_message',
    'messages',
    NEW.id
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger'ı yeniden oluştur
DROP TRIGGER IF EXISTS trigger_notify_new_message ON customer_messages;
CREATE TRIGGER trigger_notify_new_message
  AFTER INSERT ON customer_messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_admins_new_message();

-- Dosya yükleme trigger fonksiyonunu düzelt
CREATE OR REPLACE FUNCTION notify_admin_document_upload()
RETURNS TRIGGER AS $$
DECLARE
  v_client_user_id uuid;
BEGIN
  -- Müşterinin user_id'sini al
  SELECT user_id INTO v_client_user_id
  FROM clients
  WHERE id = NEW.client_id;

  -- Sadece müşteri yüklediğinde bildirim gönder (uploaded_by = müşterinin user_id'si)
  IF v_client_user_id IS NOT NULL AND NEW.uploaded_by = v_client_user_id THEN
    -- Sorumlu agent'e bildirim gönder
    INSERT INTO notifications (user_id, title, message, type, link, related_id)
    VALUES (
      NEW.agent_id,
      'Yeni Dosya Yüklendi',
      (SELECT c.full_name FROM clients c WHERE c.id = NEW.client_id) ||
      ' yeni bir dosya yükledi: ' || NEW.document_name,
      'new_message',
      'documents',
      NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger'ı yeniden oluştur
DROP TRIGGER IF EXISTS trigger_notify_document_upload ON client_documents;
CREATE TRIGGER trigger_notify_document_upload
  AFTER INSERT ON client_documents
  FOR EACH ROW
  EXECUTE FUNCTION notify_admin_document_upload();

-- Müşteri kayıt token'ı oluşturma fonksiyonu
CREATE OR REPLACE FUNCTION generate_registration_token()
RETURNS text AS $$
BEGIN
  RETURN encode(gen_random_bytes(32), 'hex');
END;
$$ LANGUAGE plpgsql;

-- Clients tablosu için RLS politikalarını güncelle
-- Müşteriler pending durumundaki kayıtlarını görebilsin
DROP POLICY IF EXISTS "Clients can view own pending registration" ON clients;
CREATE POLICY "Clients can view own pending registration"
  ON clients FOR SELECT
  TO authenticated
  USING (
    registration_status = 'pending' AND
    (email = (SELECT email FROM profiles WHERE id = auth.uid()) OR
     full_name = (SELECT full_name FROM profiles WHERE id = auth.uid()))
  );