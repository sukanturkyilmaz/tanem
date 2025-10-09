/*
  # Remove Policy Type CHECK Constraint

  1. Changes
    - Remove the CHECK constraint on policy_type column that limits values to only 'kasko' and 'workplace'
    - This allows all policy types: kasko, trafik, workplace, residence, health, dask, group_health, group_accident

  2. Security
    - Application-level validation will ensure only valid types are used
    - RLS policies remain unchanged
*/

-- Drop the existing CHECK constraint
ALTER TABLE policies DROP CONSTRAINT IF EXISTS policies_policy_type_check;

-- Add a comment documenting the allowed values
COMMENT ON COLUMN policies.policy_type IS 'Policy type: kasko, trafik, workplace, residence, health, dask, group_health, group_accident';
