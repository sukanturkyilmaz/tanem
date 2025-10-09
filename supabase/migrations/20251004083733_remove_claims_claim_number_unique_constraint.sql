/*
  # Remove unique constraint from claims.claim_number

  1. Changes
    - Drop the unique constraint on claims.claim_number column
    - This allows multiple claims to have the same claim number
    - Useful when claims are being imported in bulk or re-entered
  
  2. Security
    - No changes to RLS policies
*/

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'claims' 
    AND constraint_name = 'claims_claim_number_key'
  ) THEN
    ALTER TABLE claims DROP CONSTRAINT claims_claim_number_key;
  END IF;
END $$;