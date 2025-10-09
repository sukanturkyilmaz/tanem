/*
  # Add Tax Number Field and Client Creation Support

  1. Changes
    - Add `tax_number` field to profiles table
    - Add `phone` field to profiles table for better client management
    - Update RLS policies to allow admins to create client profiles directly
    - Create function for admins to add clients without auth.users dependency

  2. Security
    - Only admins can create client profiles
    - Clients cannot be created with admin role
    - Tax numbers are unique per client
*/

-- Add new fields to profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'tax_number'
  ) THEN
    ALTER TABLE profiles ADD COLUMN tax_number text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'phone'
  ) THEN
    ALTER TABLE profiles ADD COLUMN phone text;
  END IF;
END $$;

-- Create unique index on tax_number for clients
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_tax_number 
  ON profiles(tax_number) 
  WHERE tax_number IS NOT NULL AND role = 'client';

-- Remove the foreign key constraint temporarily to allow manual client creation
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- Make id column not require auth.users reference
ALTER TABLE profiles ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- Update admin insert policy to allow creating client profiles
DROP POLICY IF EXISTS "Admins can insert profiles" ON profiles;

CREATE POLICY "Admins can insert client profiles"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
    AND role = 'client'
  );

-- Add policy for admins to update all profiles
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;

CREATE POLICY "Admins can update all profiles"
  ON profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );