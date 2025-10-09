/*
  # Add unique constraints to prevent duplicate uploads

  1. Changes
    - Add unique constraint on policies.policy_number to prevent duplicate policy uploads
    - Add unique constraint on claims.claim_number to prevent duplicate claim uploads
  
  2. Security
    - No changes to RLS policies
*/

-- Add unique constraint to policy_number if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'policies_policy_number_key'
  ) THEN
    ALTER TABLE policies ADD CONSTRAINT policies_policy_number_key UNIQUE (policy_number);
  END IF;
END $$;

-- Add unique constraint to claim_number if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'claims_claim_number_key'
  ) THEN
    ALTER TABLE claims ADD CONSTRAINT claims_claim_number_key UNIQUE (claim_number);
  END IF;
END $$;