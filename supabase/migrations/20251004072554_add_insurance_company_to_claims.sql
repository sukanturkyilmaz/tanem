/*
  # Add insurance company to claims

  1. Changes
    - Add insurance_company_id column to claims table
    - Add foreign key constraint to insurance_companies table
    - Allow claims to have a different insurance company than the policy

  2. Notes
    - This allows tracking which company actually handled the claim
    - May differ from the policy's insurance company in some cases
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'claims' AND column_name = 'insurance_company_id'
  ) THEN
    ALTER TABLE claims ADD COLUMN insurance_company_id uuid REFERENCES insurance_companies(id);
  END IF;
END $$;