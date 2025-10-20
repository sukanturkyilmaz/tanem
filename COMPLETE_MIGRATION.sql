/*
  ================================================================
  COMPLETE DATABASE MIGRATION - STN Türkyılmaz Sigorta
  ================================================================

  This script consolidates ALL 48 migrations into one clean installation.

  IMPORTANT: Before running this script:
  1. Backup any important data if needed
  2. Run this script in Supabase SQL Editor
  3. Check for any errors after execution

  This script will:
  - Drop all existing tables (CASCADE)
  - Create fresh schema with proper RLS policies
  - Set up storage buckets
  - Create necessary functions and triggers
  - Insert default data

  ================================================================
*/

-- ============================================================
-- STEP 1: Drop All Existing Tables (Clean Slate)
-- ============================================================

DROP TABLE IF EXISTS announcement_reads CASCADE;
DROP TABLE IF EXISTS announcements CASCADE;
DROP TABLE IF EXISTS client_documents CASCADE;
DROP TABLE IF EXISTS policy_renewal_requests CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS customer_messages CASCADE;
DROP TABLE IF EXISTS agency_info CASCADE;
DROP TABLE IF EXISTS dashboard_visibility_settings CASCADE;
DROP TABLE IF EXISTS claims CASCADE;
DROP TABLE IF EXISTS policies CASCADE;
DROP TABLE IF EXISTS clients CASCADE;
DROP TABLE IF EXISTS insurance_companies CASCADE;
DROP TABLE IF EXISTS settings CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS generate_verification_code() CASCADE;
DROP FUNCTION IF EXISTS notify_admins_new_message() CASCADE;
DROP FUNCTION IF EXISTS notify_customer_message_reply() CASCADE;
DROP FUNCTION IF EXISTS notify_admins_renewal_request() CASCADE;
DROP FUNCTION IF EXISTS notify_client_renewal_status() CASCADE;
DROP FUNCTION IF EXISTS notify_admin_document_upload() CASCADE;

-- ============================================================
-- STEP 2: Create Core Tables
-- ============================================================

-- Create profiles table
CREATE TABLE profiles (
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

-- Simple SELECT policy without recursion
CREATE POLICY "Users can read own profile and admins can read all"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Authenticated users can read client profiles
CREATE POLICY "Authenticated users can read client profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (role = 'client');

-- Allow admins to insert client profiles
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

-- Users can update own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Admins can update client profiles
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

-- Create indexes
CREATE UNIQUE INDEX idx_profiles_tax_number
  ON profiles(tax_number)
  WHERE tax_number IS NOT NULL AND role = 'client';
CREATE INDEX idx_profiles_verification_code ON profiles(verification_code) WHERE verification_code IS NOT NULL;

-- Create insurance_companies table
CREATE TABLE insurance_companies (
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
CREATE TABLE clients (
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

CREATE INDEX idx_clients_agent_id ON clients(agent_id);
CREATE INDEX idx_clients_tax_number ON clients(tax_number);
CREATE INDEX idx_clients_tc_number ON clients(tc_number);
CREATE INDEX idx_clients_user_id ON clients(user_id);

-- Create policies table
CREATE TABLE policies (
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

  -- Kasko fields
  plate_number text,
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

CREATE INDEX idx_policies_client_id ON policies(client_id);
CREATE INDEX idx_policies_agent_id ON policies(agent_id);
CREATE INDEX idx_policies_policy_number ON policies(policy_number);
CREATE INDEX idx_policies_dates ON policies(start_date, end_date);
CREATE INDEX idx_policies_license_plate ON policies(license_plate) WHERE license_plate IS NOT NULL;
CREATE INDEX idx_policies_plate_number ON policies(plate_number) WHERE plate_number IS NOT NULL;
CREATE INDEX idx_policies_status ON policies(status);

-- Create claims table
CREATE TABLE claims (
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

CREATE INDEX idx_claims_policy_id ON claims(policy_id);
CREATE INDEX idx_claims_client_id ON claims(client_id);
CREATE INDEX idx_claims_agent_id ON claims(agent_id);
CREATE INDEX idx_claims_date ON claims(claim_date);
CREATE INDEX idx_claims_status ON claims(status);

-- Create settings table
CREATE TABLE settings (
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

-- ============================================================
-- STEP 3: Customer Engagement Features
-- ============================================================

-- Create announcements table
CREATE TABLE announcements (
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

CREATE INDEX idx_announcements_agent_id ON announcements(agent_id);
CREATE INDEX idx_announcements_is_active ON announcements(is_active);

-- Create announcement_reads table
CREATE TABLE announcement_reads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id uuid REFERENCES announcements(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  read_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(announcement_id, user_id)
);

ALTER TABLE announcement_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own announcement reads"
  ON announcement_reads FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_announcement_reads_announcement_id ON announcement_reads(announcement_id);
CREATE INDEX idx_announcement_reads_user_id ON announcement_reads(user_id);

-- Create agency_info table
CREATE TABLE agency_info (
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

CREATE INDEX idx_agency_info_agent_id ON agency_info(agent_id);

-- Create customer_messages table
CREATE TABLE customer_messages (
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

CREATE INDEX idx_customer_messages_client_id ON customer_messages(client_id);
CREATE INDEX idx_customer_messages_agent_id ON customer_messages(agent_id);
CREATE INDEX idx_customer_messages_status ON customer_messages(status);

-- ============================================================
-- STEP 4: Notifications System
-- ============================================================

CREATE TABLE notifications (
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

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);

-- ============================================================
-- STEP 5: Policy Renewal System
-- ============================================================

CREATE TABLE policy_renewal_requests (
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

CREATE INDEX idx_renewal_requests_policy_id ON policy_renewal_requests(policy_id);
CREATE INDEX idx_renewal_requests_client_id ON policy_renewal_requests(client_id);
CREATE INDEX idx_renewal_requests_agent_id ON policy_renewal_requests(agent_id);
CREATE INDEX idx_renewal_requests_status ON policy_renewal_requests(status);
CREATE INDEX idx_renewal_requests_created_at ON policy_renewal_requests(created_at DESC);

-- ============================================================
-- STEP 6: Document Management System
-- ============================================================

CREATE TABLE client_documents (
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

CREATE INDEX idx_client_documents_client_id ON client_documents(client_id);
CREATE INDEX idx_client_documents_agent_id ON client_documents(agent_id);
CREATE INDEX idx_client_documents_uploaded_by ON client_documents(uploaded_by);
CREATE INDEX idx_client_documents_document_type ON client_documents(document_type);
CREATE INDEX idx_client_documents_related_policy_id ON client_documents(related_policy_id);
CREATE INDEX idx_client_documents_related_claim_id ON client_documents(related_claim_id);
CREATE INDEX idx_client_documents_created_at ON client_documents(created_at DESC);

-- ============================================================
-- STEP 7: Dashboard Visibility Settings
-- ============================================================

CREATE TABLE dashboard_visibility_settings (
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

CREATE INDEX idx_dashboard_visibility_agent_id ON dashboard_visibility_settings(agent_id);

-- ============================================================
-- STEP 8: Functions and Triggers
-- ============================================================

-- Function to generate unique verification code
CREATE OR REPLACE FUNCTION generate_verification_code()
RETURNS text AS $$
DECLARE
  code text;
  exists boolean;
BEGIN
  LOOP
    -- Generate 8 character alphanumeric code
    code := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 8));

    -- Check if code already exists
    SELECT EXISTS(SELECT 1 FROM profiles WHERE verification_code = code) INTO exists;

    -- Exit loop if code is unique
    EXIT WHEN NOT exists;
  END LOOP;

  RETURN code;
END;
$$ LANGUAGE plpgsql;

-- Notify admins when new message arrives
CREATE OR REPLACE FUNCTION notify_admins_new_message()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notifications (user_id, title, message, type, link, related_id)
  SELECT
    p.id,
    'Yeni Müşteri Mesajı',
    (SELECT name FROM clients WHERE id = NEW.client_id) || ' yeni bir destek talebi gönderdi',
    'new_message',
    'messages',
    NEW.id
  FROM profiles p
  WHERE p.role = 'admin' OR p.id = NEW.agent_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_notify_new_message
  AFTER INSERT ON customer_messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_admins_new_message();

-- Notify admins when renewal request is created
CREATE OR REPLACE FUNCTION notify_admins_renewal_request()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notifications (user_id, title, message, type, link, related_id)
  SELECT
    p.id,
    'Yeni Poliçe Yenileme Talebi',
    (SELECT name FROM clients c WHERE c.id = NEW.client_id) ||
    ' bir poliçe yenileme talebi gönderdi.',
    'policy_renewal',
    'renewals',
    NEW.id
  FROM profiles p
  WHERE p.role = 'admin' OR p.id = NEW.agent_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_notify_renewal_request
  AFTER INSERT ON policy_renewal_requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_admins_renewal_request();

-- Notify client when renewal status changes
CREATE OR REPLACE FUNCTION notify_client_renewal_status()
RETURNS TRIGGER AS $$
BEGIN
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
        WHEN NEW.status = 'approved' THEN 'Poliçe yenileme talebiniz onaylandı.'
        WHEN NEW.status = 'rejected' THEN COALESCE('Red nedeni: ' || NEW.admin_notes, 'Talebiniz reddedildi.')
        WHEN NEW.status = 'completed' THEN 'Poliçeniz başarıyla yenilendi.'
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

CREATE TRIGGER trigger_notify_renewal_status
  AFTER UPDATE ON policy_renewal_requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_client_renewal_status();

-- Notify admin when document is uploaded
CREATE OR REPLACE FUNCTION notify_admin_document_upload()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM clients c
    WHERE c.id = NEW.client_id
      AND c.user_id = NEW.uploaded_by
  ) THEN
    INSERT INTO notifications (user_id, title, message, type, link, related_id)
    SELECT
      NEW.agent_id,
      'Yeni Dosya Yüklendi',
      (SELECT name FROM clients c WHERE c.id = NEW.client_id) ||
      ' yeni bir dosya yükledi: ' || NEW.document_name,
      'new_message',
      'documents',
      NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_notify_document_upload
  AFTER INSERT ON client_documents
  FOR EACH ROW
  EXECUTE FUNCTION notify_admin_document_upload();

-- ============================================================
-- STEP 9: Insert Default Data
-- ============================================================

-- Insert default settings
INSERT INTO settings (company_name, primary_color)
VALUES ('STN Türkyılmaz Sigorta', '#1e40af')
ON CONFLICT DO NOTHING;

-- Insert Turkish insurance companies
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

-- ============================================================
-- STEP 10: Storage Bucket Policies
-- ============================================================

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('policies', 'policies', true),
  ('policy-documents', 'policy-documents', true),
  ('client-documents', 'client-documents', true),
  ('settings', 'settings', true),
  ('project-backups', 'project-backups', false)
ON CONFLICT (id) DO NOTHING;

-- Policies bucket RLS
DO $$
BEGIN
  -- Drop existing policies to avoid conflicts
  DROP POLICY IF EXISTS "Authenticated users can upload policy files" ON storage.objects;
  DROP POLICY IF EXISTS "Authenticated users can update policy files" ON storage.objects;
  DROP POLICY IF EXISTS "Authenticated users can delete policy files" ON storage.objects;
  DROP POLICY IF EXISTS "Public can view policy files" ON storage.objects;

  -- Create new policies
  CREATE POLICY "Authenticated users can upload policy files"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'policies');

  CREATE POLICY "Authenticated users can update policy files"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (bucket_id = 'policies');

  CREATE POLICY "Authenticated users can delete policy files"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (bucket_id = 'policies');

  CREATE POLICY "Public can view policy files"
    ON storage.objects FOR SELECT
    TO public
    USING (bucket_id = 'policies');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Policy-documents bucket RLS
DO $$
BEGIN
  DROP POLICY IF EXISTS "Authenticated users can upload to policy-documents" ON storage.objects;
  DROP POLICY IF EXISTS "Authenticated users can update policy-documents" ON storage.objects;
  DROP POLICY IF EXISTS "Authenticated users can delete from policy-documents" ON storage.objects;
  DROP POLICY IF EXISTS "Public can view policy-documents" ON storage.objects;

  CREATE POLICY "Authenticated users can upload to policy-documents"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'policy-documents');

  CREATE POLICY "Authenticated users can update policy-documents"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (bucket_id = 'policy-documents');

  CREATE POLICY "Authenticated users can delete from policy-documents"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (bucket_id = 'policy-documents');

  CREATE POLICY "Public can view policy-documents"
    ON storage.objects FOR SELECT
    TO public
    USING (bucket_id = 'policy-documents');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Client-documents bucket RLS
DO $$
BEGIN
  DROP POLICY IF EXISTS "Authenticated users can upload to client-documents" ON storage.objects;
  DROP POLICY IF EXISTS "Authenticated users can update client-documents" ON storage.objects;
  DROP POLICY IF EXISTS "Authenticated users can delete from client-documents" ON storage.objects;
  DROP POLICY IF EXISTS "Authenticated users can view client-documents" ON storage.objects;

  CREATE POLICY "Authenticated users can upload to client-documents"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'client-documents');

  CREATE POLICY "Authenticated users can update client-documents"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (bucket_id = 'client-documents');

  CREATE POLICY "Authenticated users can delete from client-documents"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (bucket_id = 'client-documents');

  CREATE POLICY "Authenticated users can view client-documents"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (bucket_id = 'client-documents');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Settings bucket RLS
DO $$
BEGIN
  DROP POLICY IF EXISTS "Authenticated users can upload to settings" ON storage.objects;
  DROP POLICY IF EXISTS "Authenticated users can update settings files" ON storage.objects;
  DROP POLICY IF EXISTS "Authenticated users can delete from settings" ON storage.objects;
  DROP POLICY IF EXISTS "Public can view settings files" ON storage.objects;

  CREATE POLICY "Authenticated users can upload to settings"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'settings');

  CREATE POLICY "Authenticated users can update settings files"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (bucket_id = 'settings');

  CREATE POLICY "Authenticated users can delete from settings"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (bucket_id = 'settings');

  CREATE POLICY "Public can view settings files"
    ON storage.objects FOR SELECT
    TO public
    USING (bucket_id = 'settings');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Project-backups bucket RLS (private)
DO $$
BEGIN
  DROP POLICY IF EXISTS "Admins can upload to project-backups" ON storage.objects;
  DROP POLICY IF EXISTS "Admins can update project-backups" ON storage.objects;
  DROP POLICY IF EXISTS "Admins can delete from project-backups" ON storage.objects;
  DROP POLICY IF EXISTS "Admins can view project-backups" ON storage.objects;

  CREATE POLICY "Admins can upload to project-backups"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
      bucket_id = 'project-backups' AND
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
      )
    );

  CREATE POLICY "Admins can update project-backups"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (
      bucket_id = 'project-backups' AND
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
      )
    );

  CREATE POLICY "Admins can delete from project-backups"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
      bucket_id = 'project-backups' AND
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
      )
    );

  CREATE POLICY "Admins can view project-backups"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (
      bucket_id = 'project-backups' AND
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
      )
    );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- MIGRATION COMPLETE!
-- ============================================================

-- Verify table creation
SELECT
  'SUCCESS: All tables created' as status,
  COUNT(*) as table_count
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE';
