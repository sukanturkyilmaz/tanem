/*
  # Add status column to claims table

  1. Changes
    - Add `status` column to `claims` table with default value 'open'
    - Valid values: 'open', 'closed'
    - NOT NULL constraint with default value

  2. Notes
    - Existing records will automatically get 'open' status
    - Status can be updated based on payment_amount in application logic
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'claims' AND column_name = 'status'
  ) THEN
    ALTER TABLE claims ADD COLUMN status text NOT NULL DEFAULT 'open';
  END IF;
END $$;