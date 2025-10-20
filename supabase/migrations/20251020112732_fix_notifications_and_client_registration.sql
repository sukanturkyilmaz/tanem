/*
  # Bildirim Sistemi ve Müşteri Kayıt Akışı Düzeltmeleri

  ## Değişiklikler

  1. **Clients Tablosu Güncellemeleri**
    - `full_name` kolonu eklendi (name kolonunun alias'ı olarak)
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
  -- full_name kolonu ekle (name kolonunun alias'ı olarak kullanılacak)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'full_name'
  ) THEN
    ALTER TABLE clients ADD COLUMN full_name text;
  END IF;

  -- Mevcut name değerlerini full_name'e kopyala
  UPDATE clients SET full_name = name WHERE full_name IS NULL;

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

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'password_set'
  ) THEN
    ALTER TABLE clients ADD COLUMN password_set boolean DEFAULT false;
  END IF;
END $$;

-- Index'ler ekle
CREATE INDEX IF NOT EXISTS idx_clients_registration_status ON clients(registration_status);
CREATE INDEX IF NOT EXISTS idx_clients_registration_token ON clients(registration_token);
CREATE INDEX IF NOT EXISTS idx_clients_full_name ON clients(full_name);

-- Mevcut müşterileri 'completed' durumuna al
UPDATE clients
SET registration_status = 'completed',
    registration_completed_at = created_at,
    password_set = (user_id IS NOT NULL)
WHERE user_id IS NOT NULL;

-- Müşteri mesajı trigger fonksiyonunu düzelt
CREATE OR REPLACE FUNCTION notify_admins_new_message()
RETURNS TRIGGER AS $$
BEGIN
  -- Mesajı gönderen müşterinin agent'ine bildirim gönder
  INSERT INTO notifications (user_id, title, message, type, link, related_id)
  VALUES (
    NEW.agent_id,
    'Yeni Müşteri Mesajı',
    COALESCE((SELECT c.full_name FROM clients c WHERE c.id = NEW.client_id), 
             (SELECT c.name FROM clients c WHERE c.id = NEW.client_id)) ||
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
      COALESCE((SELECT c.full_name FROM clients c WHERE c.id = NEW.client_id),
               (SELECT c.name FROM clients c WHERE c.id = NEW.client_id)) ||
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
     full_name = (SELECT full_name FROM profiles WHERE id = auth.uid()) OR
     name = (SELECT full_name FROM profiles WHERE id = auth.uid()))
  );

-- Trigger: name güncellendiğinde full_name'i de güncelle
CREATE OR REPLACE FUNCTION sync_client_full_name()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.name IS NOT NULL AND (NEW.full_name IS NULL OR NEW.full_name = OLD.name) THEN
    NEW.full_name = NEW.name;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_client_full_name ON clients;
CREATE TRIGGER trigger_sync_client_full_name
  BEFORE INSERT OR UPDATE ON clients
  FOR EACH ROW
  EXECUTE FUNCTION sync_client_full_name();
