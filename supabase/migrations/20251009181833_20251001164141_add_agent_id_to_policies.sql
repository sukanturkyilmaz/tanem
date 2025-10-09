/*
  # Add agent_id to policies table

  1. Changes
    - Add agent_id column to policies table
    - Link it to profiles table (agents)
    - Populate existing policies with agent_id from clients table
    - Add index for performance
  
  2. Security
    - Update RLS policies to use agent_id
*/

-- Add agent_id column
ALTER TABLE policies 
ADD COLUMN IF NOT EXISTS agent_id uuid REFERENCES profiles(id);

-- Populate agent_id from clients table for existing policies
UPDATE policies p
SET agent_id = c.agent_id
FROM clients c
WHERE p.client_id = c.id AND p.agent_id IS NULL;

-- Create index for agent_id filtering
CREATE INDEX IF NOT EXISTS idx_policies_agent_id ON policies(agent_id);

-- Drop old RLS policies
DROP POLICY IF EXISTS "Agents can view own policies" ON policies;
DROP POLICY IF EXISTS "Agents can insert own policies" ON policies;
DROP POLICY IF EXISTS "Agents can update own policies" ON policies;
DROP POLICY IF EXISTS "Agents can delete own policies" ON policies;

-- Create new RLS policies using agent_id
CREATE POLICY "Agents can view own policies"
  ON policies FOR SELECT
  TO authenticated
  USING (agent_id = auth.uid());

CREATE POLICY "Agents can insert own policies"
  ON policies FOR INSERT
  TO authenticated
  WITH CHECK (agent_id = auth.uid());

CREATE POLICY "Agents can update own policies"
  ON policies FOR UPDATE
  TO authenticated
  USING (agent_id = auth.uid())
  WITH CHECK (agent_id = auth.uid());

CREATE POLICY "Agents can delete own policies"
  ON policies FOR DELETE
  TO authenticated
  USING (agent_id = auth.uid());