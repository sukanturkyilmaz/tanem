/*
  # Add plate number, location and PDF support to policies

  1. Changes
    - Add plate_number column for vehicle identification
    - Add location column for branch/office identification
    - Add pdf_url column to store policy document links
    - Add pdf_file_name column to store original file names
  
  2. Notes
    - plate_number is optional (only for vehicle insurance)
    - location stores branch info in compact format (e.g., istanbulanadolusubesi)
    - PDF files will be stored in Supabase Storage
*/

-- Add new columns to policies table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'policies' AND column_name = 'plate_number'
  ) THEN
    ALTER TABLE policies ADD COLUMN plate_number text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'policies' AND column_name = 'location'
  ) THEN
    ALTER TABLE policies ADD COLUMN location text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'policies' AND column_name = 'pdf_url'
  ) THEN
    ALTER TABLE policies ADD COLUMN pdf_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'policies' AND column_name = 'pdf_file_name'
  ) THEN
    ALTER TABLE policies ADD COLUMN pdf_file_name text;
  END IF;
END $$;

-- Create index for plate_number filtering
CREATE INDEX IF NOT EXISTS idx_policies_plate_number ON policies(plate_number);
CREATE INDEX IF NOT EXISTS idx_policies_location ON policies(location);