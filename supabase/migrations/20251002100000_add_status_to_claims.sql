/*
  # Add Status Column to Claims

  1. Changes
    - Add `status` column to claims table
    - Status values: 'open' or 'closed'
    - Default value: 'open'
    - Set existing claims with payment_amount > 0 to 'closed'

  2. Security
    - No RLS changes needed
*/

-- Add status column to claims table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'claims' AND column_name = 'status'
  ) THEN
    ALTER TABLE claims ADD COLUMN status text DEFAULT 'open' CHECK (status IN ('open', 'closed'));
  END IF;
END $$;

-- Update existing claims: set status based on payment_amount
UPDATE claims
SET status = CASE
  WHEN payment_amount > 0 THEN 'closed'
  ELSE 'open'
END
WHERE status IS NULL;

-- Add comment
COMMENT ON COLUMN claims.status IS 'Claim status: open (no payment) or closed (payment made)';
