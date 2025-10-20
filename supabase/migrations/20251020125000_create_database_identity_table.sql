/*
  # Create Database Identity Table
  
  This migration creates a system table to identify and validate the correct database connection.
  This prevents accidentally connecting to wrong Supabase projects.
  
  1. New Tables
    - `database_identity`
      - `id` (uuid, primary key) - Unique identifier
      - `project_id` (text, unique, not null) - The Supabase project ID (azktsinnkthmjizpbaks)
      - `project_name` (text, not null) - Human-readable project name
      - `environment` (text) - Environment indicator (production, staging, etc)
      - `created_at` (timestamptz) - When this record was created
      - `updated_at` (timestamptz) - Last update timestamp
  
  2. Security
    - Enable RLS on `database_identity` table
    - Add policy for all authenticated users to read
    - Prevent any updates or deletes through RLS (read-only after creation)
    
  3. Initial Data
    - Insert the correct project identity: azktsinnkthmjizpbaks (Tanem Insurance)
*/

CREATE TABLE IF NOT EXISTS database_identity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id text UNIQUE NOT NULL,
  project_name text NOT NULL,
  environment text DEFAULT 'production',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE database_identity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read database identity"
  ON database_identity
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "No one can insert new identity records"
  ON database_identity
  FOR INSERT
  TO authenticated
  WITH CHECK (false);

CREATE POLICY "No one can update identity records"
  ON database_identity
  FOR UPDATE
  TO authenticated
  USING (false)
  WITH CHECK (false);

CREATE POLICY "No one can delete identity records"
  ON database_identity
  FOR DELETE
  TO authenticated
  USING (false);

INSERT INTO database_identity (project_id, project_name, environment)
VALUES ('azktsinnkthmjizpbaks', 'Tanem Insurance Management System', 'production')
ON CONFLICT (project_id) DO NOTHING;