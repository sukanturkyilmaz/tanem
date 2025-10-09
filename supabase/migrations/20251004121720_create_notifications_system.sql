/*
  # Bildirim Sistemi

  1. Yeni Tablolar
    - `notifications`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to profiles)
      - `title` (text) - Bildirim başlığı
      - `message` (text) - Bildirim içeriği
      - `type` (text) - Bildirim türü (new_message, policy_renewal, new_claim, announcement)
      - `link` (text) - Tıklandığında gidilecek sayfa (optional)
      - `read` (boolean) - Okundu mu?
      - `created_at` (timestamp)
      - `related_id` (uuid) - İlgili kayıt ID'si (optional)

  2. Güvenlik
    - RLS politikaları ile kullanıcılar sadece kendi bildirimlerini görebilir
    - Admin'ler tüm bildirimleri görebilir

  3. Triggerlar
    - Yeni müşteri mesajı geldiğinde admin'lere bildirim
    - Poliçe yenileme talebi olduğunda admin'lere bildirim
*/

-- Bildirim tablosu oluştur
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL CHECK (type IN ('new_message', 'policy_renewal', 'new_claim', 'announcement', 'message_reply')),
  link text,
  related_id uuid,
  read boolean DEFAULT false NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Index'ler
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- RLS aktifleştir
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS Politikaları
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System can insert notifications"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Yeni müşteri mesajı geldiğinde admin'lere bildirim gönder
CREATE OR REPLACE FUNCTION notify_admins_new_message()
RETURNS TRIGGER AS $$
BEGIN
  -- Tüm admin'lere bildirim gönder
  INSERT INTO notifications (user_id, title, message, type, link, related_id)
  SELECT
    p.id,
    'Yeni Müşteri Mesajı',
    NEW.client_name || ' yeni bir destek talebi gönderdi: ' || LEFT(NEW.message, 100),
    'new_message',
    'messages',
    NEW.id
  FROM profiles p
  WHERE p.role = 'admin';

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger oluştur
DROP TRIGGER IF EXISTS trigger_notify_new_message ON customer_messages;
CREATE TRIGGER trigger_notify_new_message
  AFTER INSERT ON customer_messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_admins_new_message();

-- Müşteriye mesaj cevaplanınca bildirim gönder
CREATE OR REPLACE FUNCTION notify_customer_message_reply()
RETURNS TRIGGER AS $$
BEGIN
  -- Sadece replied_at güncellendiğinde çalış
  IF OLD.replied_at IS NULL AND NEW.replied_at IS NOT NULL THEN
    -- Müşteriye bildirim gönder
    INSERT INTO notifications (user_id, title, message, type, link, related_id)
    SELECT
      c.user_id,
      'Desteğiniz Yanıtlandı',
      'Destek talebiniz yanıtlandı. Lütfen kontrol edin.',
      'message_reply',
      NULL,
      NEW.id
    FROM clients c
    WHERE c.email = NEW.client_email
      AND c.user_id IS NOT NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger oluştur
DROP TRIGGER IF EXISTS trigger_notify_message_reply ON customer_messages;
CREATE TRIGGER trigger_notify_message_reply
  AFTER UPDATE ON customer_messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_customer_message_reply();
