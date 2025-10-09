/*
  # Create clients table
  
  1. New Tables
    - `clients`
      - `id` (uuid, primary key)
      - `name` (text) - Client name
      - `tax_number` (text) - TC/Tax number
      - `phone` (text) - Phone number
      - `email` (text, optional) - Email address
      - `address` (text, optional) - Address
      - `agent_id` (uuid) - Reference to agent (profiles)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
  
  2. Security
    - Enable RLS on `clients` table
    - Add policy for agents to manage their own clients
*/

CREATE TABLE IF NOT EXISTS clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  tax_number text NOT NULL,
  phone text NOT NULL,
  email text,
  address text,
  agent_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents can view own clients"
  ON clients FOR SELECT
  TO authenticated
  USING (agent_id = auth.uid());

CREATE POLICY "Agents can insert own clients"
  ON clients FOR INSERT
  TO authenticated
  WITH CHECK (agent_id = auth.uid());

CREATE POLICY "Agents can update own clients"
  ON clients FOR UPDATE
  TO authenticated
  USING (agent_id = auth.uid())
  WITH CHECK (agent_id = auth.uid());

CREATE POLICY "Agents can delete own clients"
  ON clients FOR DELETE
  TO authenticated
  USING (agent_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_clients_agent_id ON clients(agent_id);
CREATE INDEX IF NOT EXISTS idx_clients_tax_number ON clients(tax_number);