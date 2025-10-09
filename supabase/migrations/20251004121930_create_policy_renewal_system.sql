/*
  # Poliçe Yenileme Sistemi

  1. Yeni Tablolar
    - `policy_renewal_requests`
      - `id` (uuid, primary key)
      - `policy_id` (uuid, foreign key to policies)
      - `client_id` (uuid, foreign key to clients)
      - `agent_id` (uuid, foreign key to profiles)
      - `request_notes` (text) - Müşterinin notları
      - `status` (text) - pending, approved, rejected, completed
      - `admin_notes` (text) - Admin notları
      - `processed_by` (uuid, foreign key to profiles) - İşlemi yapan admin
      - `processed_at` (timestamp)
      - `created_at` (timestamp)

  2. Güvenlik
    - RLS ile müşteriler sadece kendi taleplerini görebilir
    - Admin'ler tüm talepleri görebilir

  3. Triggerlar
    - Yeni yenileme talebi oluştuğunda admin'lere bildirim
*/

-- Poliçe yenileme talepleri tablosu
CREATE TABLE IF NOT EXISTS policy_renewal_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id uuid REFERENCES policies(id) ON DELETE CASCADE NOT NULL,
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  agent_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  request_notes text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
  admin_notes text,
  processed_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  processed_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Index'ler
CREATE INDEX IF NOT EXISTS idx_renewal_requests_policy_id ON policy_renewal_requests(policy_id);
CREATE INDEX IF NOT EXISTS idx_renewal_requests_client_id ON policy_renewal_requests(client_id);
CREATE INDEX IF NOT EXISTS idx_renewal_requests_agent_id ON policy_renewal_requests(agent_id);
CREATE INDEX IF NOT EXISTS idx_renewal_requests_status ON policy_renewal_requests(status);
CREATE INDEX IF NOT EXISTS idx_renewal_requests_created_at ON policy_renewal_requests(created_at DESC);

-- RLS aktifleştir
ALTER TABLE policy_renewal_requests ENABLE ROW LEVEL SECURITY;

-- RLS Politikaları
CREATE POLICY "Users can view own renewal requests"
  ON policy_renewal_requests FOR SELECT
  TO authenticated
  USING (
    auth.uid() = agent_id OR
    EXISTS (
      SELECT 1 FROM clients c
      WHERE c.id = policy_renewal_requests.client_id
        AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "Clients can create renewal requests"
  ON policy_renewal_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clients c
      WHERE c.id = client_id
        AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can update renewal requests"
  ON policy_renewal_requests FOR UPDATE
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

-- Yeni yenileme talebi oluştuğunda admin'lere bildirim gönder
CREATE OR REPLACE FUNCTION notify_admins_renewal_request()
RETURNS TRIGGER AS $$
BEGIN
  -- Sorumlu agent'e ve tüm admin'lere bildirim gönder
  INSERT INTO notifications (user_id, title, message, type, link, related_id)
  SELECT
    p.id,
    'Yeni Poliçe Yenileme Talebi',
    (SELECT c.full_name FROM clients c WHERE c.id = NEW.client_id) ||
    ' bir poliçe yenileme talebi gönderdi.',
    'policy_renewal',
    'renewals',
    NEW.id
  FROM profiles p
  WHERE p.role = 'admin' OR p.id = NEW.agent_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger oluştur
DROP TRIGGER IF EXISTS trigger_notify_renewal_request ON policy_renewal_requests;
CREATE TRIGGER trigger_notify_renewal_request
  AFTER INSERT ON policy_renewal_requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_admins_renewal_request();

-- Yenileme talebi onaylandığında müşteriye bildirim
CREATE OR REPLACE FUNCTION notify_client_renewal_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Status değiştiğinde müşteriye bildirim gönder
  IF OLD.status = 'pending' AND NEW.status IN ('approved', 'rejected', 'completed') THEN
    INSERT INTO notifications (user_id, title, message, type, link, related_id)
    SELECT
      c.user_id,
      CASE
        WHEN NEW.status = 'approved' THEN 'Yenileme Talebiniz Onaylandı'
        WHEN NEW.status = 'rejected' THEN 'Yenileme Talebiniz Reddedildi'
        WHEN NEW.status = 'completed' THEN 'Poliçeniz Yenilendi'
      END,
      CASE
        WHEN NEW.status = 'approved' THEN 'Poliçe yenileme talebiniz onaylandı. En kısa sürede işleme alınacak.'
        WHEN NEW.status = 'rejected' THEN COALESCE('Red nedeni: ' || NEW.admin_notes, 'Poliçe yenileme talebiniz reddedildi.')
        WHEN NEW.status = 'completed' THEN 'Poliçeniz başarıyla yenilendi. Poliçelerim sekmesinden görüntüleyebilirsiniz.'
      END,
      'policy_renewal',
      NULL,
      NEW.id
    FROM clients c
    WHERE c.id = NEW.client_id
      AND c.user_id IS NOT NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger oluştur
DROP TRIGGER IF EXISTS trigger_notify_renewal_status ON policy_renewal_requests;
CREATE TRIGGER trigger_notify_renewal_status
  AFTER UPDATE ON policy_renewal_requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_client_renewal_status();
