/*
  ================================================================
  COMPLETE DATABASE MIGRATION - STN Türkyılmaz Sigorta
  ================================================================
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'agent', 'client')),
  company_name text,
  tax_number text,
  phone text,
  verification_code text UNIQUE,
  is_verified boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Profiles RLS policies
CREATE POLICY "Users can read own profile and admins can read all"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Authenticated users can read client profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (role = 'client');

CREATE POLICY "Admins can insert client profiles"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    role = 'client'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can update client profiles"
  ON profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
    AND role = 'client'
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
    AND role = 'client'
  );

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_tax_number
  ON profiles(tax_number)
  WHERE tax_number IS NOT NULL AND role = 'client';
CREATE INDEX IF NOT EXISTS idx_profiles_verification_code ON profiles(verification_code) WHERE verification_code IS NOT NULL;

-- Create insurance_companies table
CREATE TABLE IF NOT EXISTS insurance_companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE insurance_companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can read insurance companies"
  ON insurance_companies FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage insurance companies"
  ON insurance_companies FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Create clients table
CREATE TABLE IF NOT EXISTS clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  tc_number text,
  tax_number text,
  phone text NOT NULL,
  email text,
  address text,
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  agent_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  password_set boolean DEFAULT false NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents can view own clients"
  ON clients FOR SELECT
  TO authenticated
  USING (agent_id = auth.uid());

CREATE POLICY "Clients can view own client record"
  ON clients FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

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
CREATE INDEX IF NOT EXISTS idx_clients_tc_number ON clients(tc_number);
CREATE INDEX IF NOT EXISTS idx_clients_user_id ON clients(user_id);

-- Create policies table
CREATE TABLE IF NOT EXISTS policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_number text NOT NULL,
  policy_type text NOT NULL,
  insurance_company_id uuid REFERENCES insurance_companies(id) ON DELETE RESTRICT,
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
  agent_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  start_date date NOT NULL,
  end_date date NOT NULL,
  premium_amount decimal(15,2) NOT NULL DEFAULT 0,
  pdf_url text,
  pdf_filename text,
  pdf_data jsonb,
  insured_name text,
  status text DEFAULT 'active' CHECK (status IN ('active', 'archived', 'expired', 'cancelled')),
  is_archived boolean DEFAULT false NOT NULL,
  plate_number text,
  license_plate text,
  vehicle_value decimal(15,2) DEFAULT 0,
  chassis_value decimal(15,2) DEFAULT 0,
  accessories_value decimal(15,2) DEFAULT 0,
  other_values decimal(15,2) DEFAULT 0,
  no_claims_discount integer DEFAULT 0,
  coverages jsonb DEFAULT '[]'::jsonb,
  address text,
  building_value decimal(15,2) DEFAULT 0,
  fixtures_value decimal(15,2) DEFAULT 0,
  electronics_value decimal(15,2) DEFAULT 0,
  inventory_value decimal(15,2) DEFAULT 0,
  workplace_other_values decimal(15,2) DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own policies"
  ON policies FOR SELECT
  TO authenticated
  USING (client_id IN (SELECT id FROM clients WHERE user_id = auth.uid()) OR agent_id = auth.uid());

CREATE POLICY "Clients can view own policies via clients table"
  ON policies FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = policies.client_id
      AND clients.user_id = auth.uid()
    )
  );

CREATE POLICY "Users with admin role can view all policies"
  ON policies FOR SELECT
  TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "Admins can manage all policies"
  ON policies FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE INDEX IF NOT EXISTS idx_policies_client_id ON policies(client_id);
CREATE INDEX IF NOT EXISTS idx_policies_agent_id ON policies(agent_id);
CREATE INDEX IF NOT EXISTS idx_policies_policy_number ON policies(policy_number);
CREATE INDEX IF NOT EXISTS idx_policies_dates ON policies(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_policies_license_plate ON policies(license_plate) WHERE license_plate IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_policies_plate_number ON policies(plate_number) WHERE plate_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_policies_status ON policies(status);

-- Create claims table
CREATE TABLE IF NOT EXISTS claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_number text,
  policy_id uuid REFERENCES policies(id) ON DELETE CASCADE,
  policy_type text,
  insurance_company text,
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
  agent_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  claim_date date NOT NULL,
  claim_type text NOT NULL,
  license_plate text,
  payment_amount decimal(15,2) NOT NULL DEFAULT 0,
  description text,
  status text DEFAULT 'open' CHECK (status IN ('open', 'processing', 'approved', 'rejected', 'paid', 'closed')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own claims"
  ON claims FOR SELECT
  TO authenticated
  USING (client_id IN (SELECT id FROM clients WHERE user_id = auth.uid()) OR agent_id = auth.uid());

CREATE POLICY "Clients can view own claims via clients table"
  ON claims FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = claims.client_id
      AND clients.user_id = auth.uid()
    )
  );

CREATE POLICY "Users with admin role can view all claims"
  ON claims FOR SELECT
  TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "Admins can manage all claims"
  ON claims FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE INDEX IF NOT EXISTS idx_claims_policy_id ON claims(policy_id);
CREATE INDEX IF NOT EXISTS idx_claims_client_id ON claims(client_id);
CREATE INDEX IF NOT EXISTS idx_claims_agent_id ON claims(agent_id);
CREATE INDEX IF NOT EXISTS idx_claims_date ON claims(claim_date);
CREATE INDEX IF NOT EXISTS idx_claims_status ON claims(status);

-- Create settings table
CREATE TABLE IF NOT EXISTS settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  logo_url text,
  company_name text DEFAULT 'STN Türkyılmaz Sigorta',
  primary_color text DEFAULT '#1e40af',
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can read settings"
  ON settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can update settings"
  ON settings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can insert settings"
  ON settings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Insert default data
INSERT INTO settings (company_name, primary_color)
VALUES ('STN Türkyılmaz Sigorta', '#1e40af')
ON CONFLICT DO NOTHING;

INSERT INTO insurance_companies (name) VALUES
  ('Anadolu Sigorta'),
  ('Allianz Sigorta'),
  ('Aksigorta'),
  ('Sompo Sigorta'),
  ('HDI Sigorta'),
  ('Mapfre Sigorta'),
  ('Groupama Sigorta'),
  ('Zurich Sigorta'),
  ('Gulf Sigorta'),
  ('Türk Nippon Sigorta'),
  ('Quick Sigorta'),
  ('Corpus Sigorta'),
  ('Doga Sigorta'),
  ('Eureko Sigorta'),
  ('Generali Sigorta'),
  ('Neova Sigorta'),
  ('Orient Sigorta'),
  ('Ray Sigorta'),
  ('Unico Sigorta')
ON CONFLICT (name) DO NOTHING;