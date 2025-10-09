/*
  # Add New Policy Types

  1. Changes
    - Add new policy types: residence, health, dask, group_health, group_accident
    - These are in addition to existing: kasko, trafik, workplace
    - All new types support the same fields as existing policies

  2. Notes
    - Policy type is stored as text, so no schema changes needed
    - Frontend will be updated to support new types
    - Existing RLS policies continue to work
*/

-- No database schema changes needed
-- Policy type is already a text field that accepts any value
-- This migration serves as documentation for the new policy types

-- Comment to document the change
COMMENT ON COLUMN policies.policy_type IS 'Policy type: kasko, trafik, workplace, residence, health, dask, group_health, group_accident';
