/*
  # Fix Dashboard Visibility RLS for Clients

  1. Changes
    - Update SELECT policy on dashboard_visibility_settings
    - Allow agents to view their own settings (admin users)
    - Allow clients to view their agent's settings (customer users)
  
  2. Security
    - Agents can only view their own settings
    - Clients can only view settings of their assigned agent
    - Other operations (INSERT, UPDATE, DELETE) remain admin-only
*/

DROP POLICY IF EXISTS "Agents can view own visibility settings" ON dashboard_visibility_settings;

CREATE POLICY "Users can view relevant visibility settings"
  ON dashboard_visibility_settings
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = agent_id
    OR
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.agent_id = dashboard_visibility_settings.agent_id
      AND clients.user_id = auth.uid()
    )
  );