/*
  # Fix profiles RLS recursive query issue

  1. Changes
    - Remove recursive policies that query profiles table within profiles policies
    - Add simpler, non-recursive policies
    - Keep policies straightforward to avoid infinite recursion
    
  2. Security
    - Users can read their own profile
    - Users can read client profiles (for agent access)
    - Users can update their own profile
    - No recursive queries
*/

-- Drop existing policies that might cause recursion
DROP POLICY IF EXISTS "Users can read own profile and admins can read all" ON profiles;
DROP POLICY IF EXISTS "Authenticated users can read client profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can insert client profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update client profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Simple read policy: users can read their own profile
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Allow reading client profiles (needed for agents)
CREATE POLICY "Users can read client profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (role = 'client');

-- Simple update policy: users can update their own profile
CREATE POLICY "Users can update their profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);