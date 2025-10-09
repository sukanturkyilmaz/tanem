/*
  # Fix policies client_id foreign key constraint

  1. Changes
    - Drop the incorrect foreign key constraint that references profiles table
    - Add the correct foreign key constraint that references clients table
  
  2. Security
    - No RLS changes needed, existing policies remain in effect
*/

-- Drop the incorrect foreign key constraint
ALTER TABLE policies 
DROP CONSTRAINT IF EXISTS policies_client_id_fkey;

-- Add the correct foreign key constraint to clients table
ALTER TABLE policies 
ADD CONSTRAINT policies_client_id_fkey 
FOREIGN KEY (client_id) 
REFERENCES clients(id) 
ON DELETE CASCADE;