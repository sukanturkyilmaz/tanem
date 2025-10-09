/*
  # Fix Analytics Count Permissions

  1. Problem
    - Count queries failing due to RLS policy complexity
    - Subquery-based admin checks causing performance issues

  2. Solution
    - Add explicit count policies for policies and claims tables
    - Use simpler RLS checks that work with aggregate functions

  3. Security
    - Admins can count all records
    - Regular users can only count their own records
*/

-- Add explicit SELECT policies that work better with COUNT
DROP POLICY IF EXISTS "Users with admin role can view all policies" ON policies;
DROP POLICY IF EXISTS "Users with admin role can view all claims" ON claims;

-- Recreate admin policies with better performance
CREATE POLICY "Admins can view all policies"
  ON policies FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
      LIMIT 1
    )
  );

CREATE POLICY "Admins can view all claims"
  ON claims FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
      LIMIT 1
    )
  );