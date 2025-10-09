/*
  # Customer Engagement Features

  1. New Tables
    - `announcements`
      - `id` (uuid, primary key)
      - `agent_id` (uuid, foreign key to profiles)
      - `title` (text)
      - `content` (text)
      - `priority` (text - low, medium, high)
      - `is_active` (boolean)
      - `created_at` (timestamptz)
      - `expires_at` (timestamptz, nullable)

    - `agency_info`
      - `id` (uuid, primary key)
      - `agent_id` (uuid, foreign key to profiles)
      - `agency_name` (text)
      - `contact_person` (text)
      - `phone` (text)
      - `email` (text)
      - `address` (text)
      - `website` (text, nullable)
      - `logo_url` (text, nullable)
      - `working_hours` (text, nullable)
      - `updated_at` (timestamptz)

    - `customer_messages`
      - `id` (uuid, primary key)
      - `client_id` (uuid, foreign key to clients)
      - `agent_id` (uuid, foreign key to profiles)
      - `subject` (text)
      - `message` (text)
      - `status` (text - new, read, replied, closed)
      - `priority` (text - low, medium, high)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for agents to manage their data
    - Add policies for customers to view and create appropriate data
*/

CREATE TABLE IF NOT EXISTS announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz
);

ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents can manage their announcements"
  ON announcements FOR ALL
  TO authenticated
  USING (auth.uid() = agent_id)
  WITH CHECK (auth.uid() = agent_id);

CREATE POLICY "Customers can view active announcements from their agent"
  ON announcements FOR SELECT
  TO authenticated
  USING (
    is_active = true
    AND (expires_at IS NULL OR expires_at > now())
    AND EXISTS (
      SELECT 1 FROM clients
      WHERE clients.user_id = auth.uid()
      AND clients.agent_id = announcements.agent_id
    )
  );

CREATE TABLE IF NOT EXISTS agency_info (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid REFERENCES profiles(id) ON DELETE CASCADE UNIQUE NOT NULL,
  agency_name text NOT NULL,
  contact_person text NOT NULL,
  phone text NOT NULL,
  email text NOT NULL,
  address text NOT NULL,
  website text,
  logo_url text,
  working_hours text,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE agency_info ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents can manage their agency info"
  ON agency_info FOR ALL
  TO authenticated
  USING (auth.uid() = agent_id)
  WITH CHECK (auth.uid() = agent_id);

CREATE POLICY "Customers can view their agent's agency info"
  ON agency_info FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.user_id = auth.uid()
      AND clients.agent_id = agency_info.agent_id
    )
  );

CREATE TABLE IF NOT EXISTS customer_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  agent_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  subject text NOT NULL,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'read', 'replied', 'closed')),
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE customer_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents can view and manage messages from their clients"
  ON customer_messages FOR ALL
  TO authenticated
  USING (auth.uid() = agent_id)
  WITH CHECK (auth.uid() = agent_id);

CREATE POLICY "Customers can create and view their own messages"
  ON customer_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = customer_messages.client_id
      AND clients.user_id = auth.uid()
    )
  );

CREATE POLICY "Customers can create messages"
  ON customer_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = client_id
      AND clients.user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_announcements_agent_id ON announcements(agent_id);
CREATE INDEX IF NOT EXISTS idx_announcements_is_active ON announcements(is_active);
CREATE INDEX IF NOT EXISTS idx_agency_info_agent_id ON agency_info(agent_id);
CREATE INDEX IF NOT EXISTS idx_customer_messages_client_id ON customer_messages(client_id);
CREATE INDEX IF NOT EXISTS idx_customer_messages_agent_id ON customer_messages(agent_id);
CREATE INDEX IF NOT EXISTS idx_customer_messages_status ON customer_messages(status);
