/*
  # Fix Clients RLS for Auth Loading

  1. Changes
    - Remove duplicate policies on clients table
    - Ensure clients can read their own record during auth
    
  2. Security
    - Maintain proper access control
    - Allow smooth authentication flow
*/

-- Drop duplicate policy
DROP POLICY IF EXISTS "Customers can view own client record" ON clients;

-- Ensure the correct policy exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'clients' 
    AND policyname = 'Clients can view own client record'
  ) THEN
    CREATE POLICY "Clients can view own client record"
      ON clients FOR SELECT
      TO authenticated
      USING (user_id = auth.uid());
  END IF;
END $$;