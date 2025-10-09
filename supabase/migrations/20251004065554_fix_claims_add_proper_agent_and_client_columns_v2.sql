/*
  # Fix claims table - separate agent and client references

  1. Changes
    - Rename current client_id to agent_id (it's actually storing agent/profile IDs)
    - Add new client_id column that properly references clients table
    - Update foreign key constraints and RLS policies
  
  2. Security
    - Update RLS policies to use correct column names
*/

-- Drop existing policies that depend on client_id column
DROP POLICY IF EXISTS "Clients can read own claims" ON claims;
DROP POLICY IF EXISTS "Users can view own claims" ON claims;
DROP POLICY IF EXISTS "Users can create own claims" ON claims;
DROP POLICY IF EXISTS "Users can update own claims" ON claims;
DROP POLICY IF EXISTS "Users can delete own claims" ON claims;

-- Drop the existing foreign key constraint
ALTER TABLE claims DROP CONSTRAINT IF EXISTS claims_client_id_fkey;

-- Rename the existing client_id column to agent_id (it was storing agent IDs all along)
ALTER TABLE claims RENAME COLUMN client_id TO agent_id_temp;

-- Add proper agent_id column with correct foreign key
ALTER TABLE claims ADD COLUMN IF NOT EXISTS agent_id uuid REFERENCES profiles(id) ON DELETE SET NULL;

-- Copy data from temp column to new column
UPDATE claims SET agent_id = agent_id_temp WHERE agent_id_temp IS NOT NULL;

-- Drop the temp column
ALTER TABLE claims DROP COLUMN IF EXISTS agent_id_temp;

-- Add proper client_id column that references clients table
ALTER TABLE claims ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES clients(id) ON DELETE SET NULL;

-- Recreate RLS policies with correct columns
CREATE POLICY "Users can view own claims"
  ON claims FOR SELECT
  TO authenticated
  USING (agent_id = auth.uid());

CREATE POLICY "Users can create own claims"
  ON claims FOR INSERT
  TO authenticated
  WITH CHECK (agent_id = auth.uid());

CREATE POLICY "Users can update own claims"
  ON claims FOR UPDATE
  TO authenticated
  USING (agent_id = auth.uid())
  WITH CHECK (agent_id = auth.uid());

CREATE POLICY "Users can delete own claims"
  ON claims FOR DELETE
  TO authenticated
  USING (agent_id = auth.uid());