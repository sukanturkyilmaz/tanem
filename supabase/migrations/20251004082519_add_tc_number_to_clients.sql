/*
  # Add tc_number column to clients table

  1. Changes
    - Add tc_number column to clients table (text, nullable)
    - Used for Turkish ID number storage
  
  2. Security
    - No changes to RLS policies
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'tc_number'
  ) THEN
    ALTER TABLE clients ADD COLUMN tc_number text;
  END IF;
END $$;