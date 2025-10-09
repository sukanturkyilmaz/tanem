/*
  # Add Missing Insurance Companies

  1. Changes
    - Ensure all required insurance companies exist in the database
    - Companies: Anadolu, Türkiye, Quick, HDI, Neova

  2. Notes
    - Uses ON CONFLICT to avoid duplicates
    - Safe to run multiple times
*/

-- Insert insurance companies if they don't exist
INSERT INTO insurance_companies (name) VALUES
  ('Anadolu Sigorta'),
  ('Türkiye Sigorta'),
  ('Quick Sigorta'),
  ('HDI Sigorta'),
  ('Neova Sigorta')
ON CONFLICT (name) DO NOTHING;
