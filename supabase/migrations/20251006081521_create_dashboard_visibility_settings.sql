/*
  # Create Dashboard Visibility Settings System

  1. New Tables
    - `dashboard_visibility_settings`
      - `id` (uuid, primary key)
      - `agent_id` (uuid, foreign key to profiles)
      - `show_policy_reminders` (boolean, default true)
      - `show_premium_distribution` (boolean, default true)
      - `show_policy_types` (boolean, default true)
      - `show_claims_trend` (boolean, default true)
      - `show_insurance_companies` (boolean, default true)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `dashboard_visibility_settings` table
    - Add policies for agents to manage their own settings

  3. Notes
    - Each agent has one visibility settings record
    - All widgets are visible by default
    - Settings apply to all clients under that agent
*/

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

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_dashboard_visibility_agent_id ON dashboard_visibility_settings(agent_id);