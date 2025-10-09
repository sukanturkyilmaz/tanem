/*
  # Doğrulama Kodu Sistemi

  ## Değişiklikler
  
  1. profiles tablosuna yeni alanlar
    - `verification_code` (text, unique) - Her müşterinin benzersiz doğrulama kodu
    - `is_verified` (boolean) - Hesap doğrulama durumu
  
  2. Güvenlik
    - Doğrulama kodu benzersiz olmalı
    - Sadece admin olmayan kullanıcılar doğrulama kodu alır
  
  ## Notlar
  - Her müşteri kayıt olurken benzersiz bir kod alacak
  - Bu kod ile sadece kendi müşterilerine erişebilecek
  - Admin kullanıcıların doğrulama koduna ihtiyacı yok
*/

-- Add verification_code column to profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'verification_code'
  ) THEN
    ALTER TABLE profiles ADD COLUMN verification_code text UNIQUE;
  END IF;
END $$;

-- Add is_verified column to profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'is_verified'
  ) THEN
    ALTER TABLE profiles ADD COLUMN is_verified boolean DEFAULT false;
  END IF;
END $$;

-- Create index for verification_code
CREATE INDEX IF NOT EXISTS idx_profiles_verification_code ON profiles(verification_code) WHERE verification_code IS NOT NULL;

-- Function to generate unique verification code
CREATE OR REPLACE FUNCTION generate_verification_code()
RETURNS text AS $$
DECLARE
  code text;
  exists boolean;
BEGIN
  LOOP
    -- Generate 8 character alphanumeric code
    code := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 8));
    
    -- Check if code already exists
    SELECT EXISTS(SELECT 1 FROM profiles WHERE verification_code = code) INTO exists;
    
    -- Exit loop if code is unique
    EXIT WHEN NOT exists;
  END LOOP;
  
  RETURN code;
END;
$$ LANGUAGE plpgsql;