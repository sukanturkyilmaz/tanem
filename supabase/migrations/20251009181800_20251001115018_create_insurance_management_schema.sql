/*
  # STN Türkyılmaz Sigorta - Insurance Management System

  ## Overview
  This migration creates the complete database schema for an insurance policy and claims management system.

  ## New Tables

  ### 1. profiles
  - `id` (uuid, primary key) - References auth.users
  - `email` (text) - User email
  - `full_name` (text) - Full name
  - `role` (text) - User role: 'admin' or 'client'
  - `company_name` (text) - For client users
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### 2. insurance_companies
  - `id` (uuid, primary key) - Company ID
  - `name` (text) - Insurance company name
  - `created_at` (timestamptz) - Creation timestamp

  ### 3. policies
  - `id` (uuid, primary key) - Policy ID
  - `policy_number` (text) - Policy number
  - `policy_type` (text) - Type: 'kasko' or 'workplace'
  - `insurance_company_id` (uuid) - Foreign key to insurance_companies
  - `client_id` (uuid) - Foreign key to profiles (client owner)
  - `start_date` (date) - Policy start date
  - `end_date` (date) - Policy end date
  - `premium_amount` (decimal) - Premium amount
  - `pdf_url` (text) - PDF file storage URL
  - `pdf_filename` (text) - Original PDF filename
  
  #### Kasko specific fields
  - `license_plate` (text) - Vehicle license plate
  - `vehicle_value` (decimal) - Vehicle value
  - `chassis_value` (decimal) - Chassis value
  - `accessories_value` (decimal) - Accessories value
  - `other_values` (decimal) - Other values
  - `no_claims_discount` (integer) - No-claims discount level
  - `coverages` (jsonb) - Coverage details as JSON
  
  #### Workplace specific fields
  - `address` (text) - Workplace address
  - `building_value` (decimal) - Building value
  - `fixtures_value` (decimal) - Fixtures/demirbaş value
  - `electronics_value` (decimal) - Electronic equipment value
  - `inventory_value` (decimal) - Inventory/emtea value
  - `workplace_other_values` (decimal) - Other workplace values
  
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### 4. claims
  - `id` (uuid, primary key) - Claim ID
  - `claim_number` (text) - Claim number (optional)
  - `policy_id` (uuid) - Foreign key to policies
  - `claim_date` (date) - Claim date
  - `claim_type` (text) - Type of claim
  - `license_plate` (text) - Vehicle license plate
  - `payment_amount` (decimal) - Payment amount
  - `description` (text) - Claim description
  - `client_id` (uuid) - Foreign key to profiles (for RLS)
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### 5. settings
  - `id` (uuid, primary key) - Settings ID
  - `logo_url` (text) - Company logo URL
  - `company_name` (text) - Company name
  - `primary_color` (text) - Primary brand color
  - `updated_at` (timestamptz) - Last update timestamp

  ## Security
  - Enable RLS on all tables
  - Admin users can access all data
  - Client users can only access their own data
  - Public cannot access any data
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'client')),
  company_name text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Admins can read all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
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

CREATE POLICY "Admins can insert profiles"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

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

-- Create policies table
CREATE TABLE IF NOT EXISTS policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_number text NOT NULL,
  policy_type text NOT NULL CHECK (policy_type IN ('kasko', 'workplace')),
  insurance_company_id uuid REFERENCES insurance_companies(id) ON DELETE RESTRICT,
  client_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  start_date date NOT NULL,
  end_date date NOT NULL,
  premium_amount decimal(15,2) NOT NULL DEFAULT 0,
  pdf_url text,
  pdf_filename text,
  
  -- Kasko fields
  license_plate text,
  vehicle_value decimal(15,2) DEFAULT 0,
  chassis_value decimal(15,2) DEFAULT 0,
  accessories_value decimal(15,2) DEFAULT 0,
  other_values decimal(15,2) DEFAULT 0,
  no_claims_discount integer DEFAULT 0,
  coverages jsonb DEFAULT '[]'::jsonb,
  
  -- Workplace fields
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

CREATE POLICY "Clients can read own policies"
  ON policies FOR SELECT
  TO authenticated
  USING (
    client_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
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

-- Create claims table
CREATE TABLE IF NOT EXISTS claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_number text,
  policy_id uuid REFERENCES policies(id) ON DELETE CASCADE,
  claim_date date NOT NULL,
  claim_type text NOT NULL,
  license_plate text,
  payment_amount decimal(15,2) NOT NULL DEFAULT 0,
  description text,
  client_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients can read own claims"
  ON claims FOR SELECT
  TO authenticated
  USING (
    client_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
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

-- Insert default settings
INSERT INTO settings (company_name, primary_color)
VALUES ('STN Türkyılmaz Sigorta', '#1e40af')
ON CONFLICT DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_policies_client_id ON policies(client_id);
CREATE INDEX IF NOT EXISTS idx_policies_policy_number ON policies(policy_number);
CREATE INDEX IF NOT EXISTS idx_policies_dates ON policies(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_claims_policy_id ON claims(policy_id);
CREATE INDEX IF NOT EXISTS idx_claims_client_id ON claims(client_id);
CREATE INDEX IF NOT EXISTS idx_claims_date ON claims(claim_date);
CREATE INDEX IF NOT EXISTS idx_policies_license_plate ON policies(license_plate) WHERE license_plate IS NOT NULL;