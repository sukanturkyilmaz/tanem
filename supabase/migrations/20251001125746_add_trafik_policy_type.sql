/*
  # Add Trafik (Traffic) Policy Type

  1. Changes
    - Modify policy_type check constraint to include 'trafik'
    - Add trafik-specific fields to policies table
    
  2. New Fields for Trafik
    - vehicle_brand_model (marka model)
    - trafik_coverage_amount (trafik teminat tutarı)
    
  3. Notes
    - Trafik policies will use license_plate field (already exists for kasko)
*/

-- Drop old constraint and add new one with 'trafik'
ALTER TABLE policies DROP CONSTRAINT IF EXISTS policies_policy_type_check;
ALTER TABLE policies ADD CONSTRAINT policies_policy_type_check 
  CHECK (policy_type IN ('kasko', 'workplace', 'trafik'));

-- Add trafik-specific fields
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'policies' AND column_name = 'vehicle_brand_model'
  ) THEN
    ALTER TABLE policies ADD COLUMN vehicle_brand_model text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'policies' AND column_name = 'trafik_coverage_amount'
  ) THEN
    ALTER TABLE policies ADD COLUMN trafik_coverage_amount decimal(15,2) DEFAULT 0;
  END IF;
END $$;