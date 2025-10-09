/*
  # Add Policy Archive and Status System

  1. Changes
    - Add `status` column (active, expired, renewed, archived)
    - Add `renewed_policy_id` column to link renewed policies
    - Add `policy_year` column to track policy year
    - Add `archived_at` timestamp

  2. Purpose
    - Enable policy renewal tracking
    - Automatic archiving of old policies
    - Prevent duplicate policy entries
    - Year-based policy management
*/

DO $$
BEGIN
  -- Add status column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'policies' AND column_name = 'status'
  ) THEN
    ALTER TABLE policies ADD COLUMN status TEXT DEFAULT 'active';
  END IF;

  -- Add renewed_policy_id column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'policies' AND column_name = 'renewed_policy_id'
  ) THEN
    ALTER TABLE policies ADD COLUMN renewed_policy_id UUID REFERENCES policies(id);
  END IF;

  -- Add policy_year column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'policies' AND column_name = 'policy_year'
  ) THEN
    ALTER TABLE policies ADD COLUMN policy_year INTEGER;
  END IF;

  -- Add archived_at column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'policies' AND column_name = 'archived_at'
  ) THEN
    ALTER TABLE policies ADD COLUMN archived_at TIMESTAMPTZ;
  END IF;

  -- Add is_deleted column for soft delete
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'policies' AND column_name = 'is_deleted'
  ) THEN
    ALTER TABLE policies ADD COLUMN is_deleted BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_policies_status ON policies(status);
CREATE INDEX IF NOT EXISTS idx_policies_policy_number ON policies(policy_number);
CREATE INDEX IF NOT EXISTS idx_policies_is_deleted ON policies(is_deleted);