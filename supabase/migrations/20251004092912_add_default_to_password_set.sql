/*
  # Add default value to password_set column

  1. Changes
    - Set default value for password_set to false
    - Update existing records to have password_set = false where null
    
  2. Security
    - No security changes
*/

-- Set default value for new records
ALTER TABLE clients 
ALTER COLUMN password_set SET DEFAULT false;

-- Update existing records
UPDATE clients 
SET password_set = false 
WHERE password_set IS NULL;