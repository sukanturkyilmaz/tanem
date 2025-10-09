/*
  # Add insured_name column to policies table

  1. Changes
    - Add `insured_name` column to policies table for health insurance policies
    - This field stores the name of the insured person for health insurance
  
  2. Notes
    - Used primarily for health insurance policies
    - Optional field as not all policy types require it
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'policies' AND column_name = 'insured_name'
  ) THEN
    ALTER TABLE policies ADD COLUMN insured_name text;
  END IF;
END $$;
