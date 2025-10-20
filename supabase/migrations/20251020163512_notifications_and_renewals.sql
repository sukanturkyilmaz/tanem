/*
  ================================================================
  Notifications and Policy Renewal System
  ================================================================
*/

-- Create notifications table
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

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

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

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- Create policy_renewal_requests table
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

ALTER TABLE policy_renewal_requests ENABLE ROW LEVEL SECURITY;

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

CREATE INDEX IF NOT EXISTS idx_renewal_requests_policy_id ON policy_renewal_requests(policy_id);
CREATE INDEX IF NOT EXISTS idx_renewal_requests_client_id ON policy_renewal_requests(client_id);
CREATE INDEX IF NOT EXISTS idx_renewal_requests_agent_id ON policy_renewal_requests(agent_id);
CREATE INDEX IF NOT EXISTS idx_renewal_requests_status ON policy_renewal_requests(status);
CREATE INDEX IF NOT EXISTS idx_renewal_requests_created_at ON policy_renewal_requests(created_at DESC);