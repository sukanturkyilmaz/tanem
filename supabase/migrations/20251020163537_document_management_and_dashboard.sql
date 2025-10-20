/*
  ================================================================
  Document Management and Dashboard Settings
  ================================================================
*/

-- Create client_documents table
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

ALTER TABLE client_documents ENABLE ROW LEVEL SECURITY;

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

CREATE INDEX IF NOT EXISTS idx_client_documents_client_id ON client_documents(client_id);
CREATE INDEX IF NOT EXISTS idx_client_documents_agent_id ON client_documents(agent_id);
CREATE INDEX IF NOT EXISTS idx_client_documents_uploaded_by ON client_documents(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_client_documents_document_type ON client_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_client_documents_related_policy_id ON client_documents(related_policy_id);
CREATE INDEX IF NOT EXISTS idx_client_documents_related_claim_id ON client_documents(related_claim_id);
CREATE INDEX IF NOT EXISTS idx_client_documents_created_at ON client_documents(created_at DESC);

-- Create dashboard_visibility_settings table
CREATE TABLE IF NOT EXISTS dashboard_visibility_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid REFERENCES profiles(id) ON DELETE CASCADE UNIQUE NOT NULL,
  show_policy_reminders boolean DEFAULT true NOT NULL,
  show_premium_distribution boolean DEFAULT true NOT NULL,
  show_policy_types boolean DEFAULT true NOT NULL,
  show_claims_trend boolean DEFAULT true NOT NULL,
  show_insurance_companies boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE dashboard_visibility_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents can view own visibility settings"
  ON dashboard_visibility_settings FOR SELECT
  TO authenticated
  USING (auth.uid() = agent_id);

CREATE POLICY "Clients can view their agent's visibility settings"
  ON dashboard_visibility_settings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clients c
      WHERE c.user_id = auth.uid()
        AND c.agent_id = dashboard_visibility_settings.agent_id
    )
  );

CREATE POLICY "Agents can insert own visibility settings"
  ON dashboard_visibility_settings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = agent_id);

CREATE POLICY "Agents can update own visibility settings"
  ON dashboard_visibility_settings FOR UPDATE
  TO authenticated
  USING (auth.uid() = agent_id)
  WITH CHECK (auth.uid() = agent_id);

CREATE POLICY "Agents can delete own visibility settings"
  ON dashboard_visibility_settings FOR DELETE
  TO authenticated
  USING (auth.uid() = agent_id);

CREATE INDEX IF NOT EXISTS idx_dashboard_visibility_agent_id ON dashboard_visibility_settings(agent_id);