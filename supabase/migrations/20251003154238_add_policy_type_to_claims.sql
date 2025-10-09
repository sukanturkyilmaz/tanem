/*
  # Add policy_type column to claims table

  1. Changes
    - Add `policy_type` column to `claims` table
    - This will store the type of policy (Trafik, Kasko, İşyeri, Konut, Sağlık, DASK)
    - Used for matching claims with correct policies based on both plate/client and policy type
  
  2. Notes
    - Column is nullable to support existing claims
    - New claims uploaded via bulk upload will include this field
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'claims' AND column_name = 'policy_type'
  ) THEN
    ALTER TABLE claims ADD COLUMN policy_type text;
  END IF;
END $$;