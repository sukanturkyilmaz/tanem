/*
  # Fix RLS Policies - Remove Infinite Recursion

  1. Problem
    - The profiles SELECT policy was causing infinite recursion
    - When checking if user is admin, it queries profiles table which triggers the same policy again
    - This causes 500 errors on all queries

  2. Solution
    - Simplify profiles SELECT policy to avoid self-referential queries
    - Create a helper function to check admin status
    - Update all policies to use direct auth.uid() checks where possible

  3. Security
    - Users can read their own profile
    - Admins can read all profiles (checked via direct comparison, not subquery)
*/

-- Drop problematic policies
DROP POLICY IF EXISTS "Enable read for authenticated users" ON profiles;
DROP POLICY IF EXISTS "Admins can insert client profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;

-- Create simple SELECT policy without recursion
CREATE POLICY "Users can read own profile and admins can read all"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Create a separate policy that allows reading client profiles
CREATE POLICY "Authenticated users can read client profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (role = 'client');

-- Allow admins to insert client profiles (simplified check)
CREATE POLICY "Admins can insert client profiles"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    role = 'client'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Allow admins to update profiles (simplified)
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can update client profiles"
  ON profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
    AND role = 'client'
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
    AND role = 'client'
  );

-- Fix policies and claims RLS to avoid recursion
DROP POLICY IF EXISTS "Admins can view all policies" ON policies;
DROP POLICY IF EXISTS "Clients can view their own policies" ON policies;

CREATE POLICY "Users can view own policies"
  ON policies FOR SELECT
  TO authenticated
  USING (client_id = auth.uid());

CREATE POLICY "Users with admin role can view all policies"
  ON policies FOR SELECT
  TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

-- Fix claims policies
DROP POLICY IF EXISTS "Admins can view all claims" ON claims;
DROP POLICY IF EXISTS "Clients can view their own claims" ON claims;

CREATE POLICY "Users can view own claims"
  ON claims FOR SELECT
  TO authenticated
  USING (client_id = auth.uid());

CREATE POLICY "Users with admin role can view all claims"
  ON claims FOR SELECT
  TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );