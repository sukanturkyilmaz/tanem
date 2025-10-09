/*
  # Add Customer (Client) Role and Update RLS Policies

  1. Changes
    - Update profiles role check constraint to include 'client' and 'agent' roles
    - Add RLS policies for clients to view their own policies and claims
    - Link clients (customers) to their profiles via clients.user_id
    
  2. Security
    - Clients can only view their own data (policies and claims linked to their client_id)
    - Clients cannot modify or delete data
    - Clients cannot see other clients' data
*/

-- Drop existing check constraint and add all roles
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage 
    WHERE table_name = 'profiles' AND constraint_name = 'profiles_role_check'
  ) THEN
    ALTER TABLE profiles DROP CONSTRAINT profiles_role_check;
  END IF;
END $$;

ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
  CHECK (role IN ('admin', 'agent', 'client'));

-- Add policies for clients to view their own policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'policies' AND policyname = 'Clients can view own policies'
  ) THEN
    CREATE POLICY "Clients can view own policies"
      ON policies FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM clients
          WHERE clients.id = policies.client_id
          AND clients.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Add policies for clients to view their own claims
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'claims' AND policyname = 'Clients can view own claims'
  ) THEN
    CREATE POLICY "Clients can view own claims"
      ON claims FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM clients
          WHERE clients.id = claims.client_id
          AND clients.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Add policy for clients to view their own client record
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'clients' AND policyname = 'Clients can view own client record'
  ) THEN
    CREATE POLICY "Clients can view own client record"
      ON clients FOR SELECT
      TO authenticated
      USING (user_id = auth.uid());
  END IF;
END $$;