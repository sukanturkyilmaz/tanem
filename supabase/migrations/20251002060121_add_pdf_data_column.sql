/*
  # Add PDF Data Column to Policies

  1. Changes
    - Add `pdf_data` column to store base64 encoded PDFs directly in database
    - This allows PDF storage without external storage service

  2. Notes
    - Using TEXT type for base64 encoded PDF content
    - Keeps existing pdf_url and pdf_filename columns for compatibility
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'policies' AND column_name = 'pdf_data'
  ) THEN
    ALTER TABLE policies ADD COLUMN pdf_data TEXT;
  END IF;
END $$;