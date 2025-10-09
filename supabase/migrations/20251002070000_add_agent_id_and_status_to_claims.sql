/*
  # Add agent_id and status columns to claims table

  1. Changes
    - Add `agent_id` column to `claims` table (references agents/profiles)
    - Add `status` column to `claims` table for tracking claim status
    - Add index on agent_id for faster queries
    - Update RLS policies to include agent_id checks

  2. Security
    - Update existing RLS policies to work with agent_id
    - Agents can only see their own claims
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'claims' AND column_name = 'agent_id'
  ) THEN
    ALTER TABLE claims ADD COLUMN agent_id uuid REFERENCES profiles(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_claims_agent_id ON claims(agent_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'claims' AND column_name = 'status'
  ) THEN
    ALTER TABLE claims ADD COLUMN status text DEFAULT 'Beklemede';
  END IF;
END $$;

DROP POLICY IF EXISTS "Clients can read own claims" ON claims;
DROP POLICY IF EXISTS "Clients can insert own claims" ON claims;
DROP POLICY IF EXISTS "Clients can update own claims" ON claims;

CREATE POLICY "Users can read own claims"
  ON claims FOR SELECT
  TO authenticated
  USING (
    auth.uid() = client_id OR auth.uid() = agent_id
  );

CREATE POLICY "Users can insert claims"
  ON claims FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = client_id OR auth.uid() = agent_id
  );

CREATE POLICY "Users can update own claims"
  ON claims FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = client_id OR auth.uid() = agent_id
  )
  WITH CHECK (
    auth.uid() = client_id OR auth.uid() = agent_id
  );

CREATE POLICY "Users can delete own claims"
  ON claims FOR DELETE
  TO authenticated
  USING (
    auth.uid() = client_id OR auth.uid() = agent_id
  );
