/*
  # Veri Arşivleme ve Otomatik Temizleme Sistemi

  1. Yeni Tablolar
    - `archive_settings`
      - `id` (uuid, primary key)
      - `agent_id` (uuid, foreign key)
      - `policy_pdf_retention_days` (integer) - Poliçe PDF saklama süresi (gün)
      - `document_retention_days` (integer) - Müşteri dosyalarını saklama süresi (gün)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Güvenlik
    - RLS etkinleştir
    - Agent'lar sadece kendi ayarlarını görebilir/düzenleyebilir
*/

-- Arşiv ayarları tablosu oluştur
CREATE TABLE IF NOT EXISTS archive_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  policy_pdf_retention_days integer DEFAULT 365 NOT NULL,
  document_retention_days integer DEFAULT 365 NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(agent_id)
);

-- RLS'yi etkinleştir
ALTER TABLE archive_settings ENABLE ROW LEVEL SECURITY;

-- Agent'lar sadece kendi ayarlarını görebilir
CREATE POLICY "Agents can view own archive settings"
  ON archive_settings
  FOR SELECT
  TO authenticated
  USING (auth.uid() = agent_id);

-- Agent'lar kendi ayarlarını ekleyebilir
CREATE POLICY "Agents can insert own archive settings"
  ON archive_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = agent_id);

-- Agent'lar kendi ayarlarını güncelleyebilir
CREATE POLICY "Agents can update own archive settings"
  ON archive_settings
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = agent_id)
  WITH CHECK (auth.uid() = agent_id);

-- Tüm agent'lar için varsayılan ayarları oluştur
INSERT INTO archive_settings (agent_id, policy_pdf_retention_days, document_retention_days)
SELECT id, 365, 365
FROM profiles
WHERE role = 'agent' OR role = 'admin'
ON CONFLICT (agent_id) DO NOTHING;