-- ================================================================
-- QUICK START - Copy and paste these queries in order
-- ================================================================
-- Use Supabase SQL Editor: https://supabase.com/dashboard
-- Project: ocmofokkokzufivkcafr
-- ================================================================

-- ================================================================
-- QUERY 1: Verify Current Database State (OPTIONAL)
-- ================================================================
-- Run this first to see what tables currently exist

SELECT
  schemaname,
  tablename
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- Expected: You'll see the old tables (if any)


-- ================================================================
-- QUERY 2: Run Complete Migration
-- ================================================================
-- Copy the ENTIRE contents of COMPLETE_MIGRATION.sql
-- and paste it here, then click RUN

-- (Don't type anything here - use the COMPLETE_MIGRATION.sql file)


-- ================================================================
-- QUERY 3: Verify Tables Were Created
-- ================================================================
-- Run this after the migration completes

SELECT
  table_name,
  table_type
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Expected Result: 13 tables
-- 1. agency_info
-- 2. announcement_reads
-- 3. announcements
-- 4. claims
-- 5. client_documents
-- 6. clients
-- 7. customer_messages
-- 8. dashboard_visibility_settings
-- 9. insurance_companies
-- 10. notifications
-- 11. policies
-- 12. policy_renewal_requests
-- 13. profiles
-- 14. settings


-- ================================================================
-- QUERY 4: Create Admin User Profile
-- ================================================================
-- IMPORTANT: Use your existing auth user ID from the screenshot
-- User ID: a5d8fcb8-362d-453e-82a6-4fba97691dcb
-- Email: sukan@turkyilmazigorta.com

INSERT INTO profiles (id, email, full_name, role, company_name, phone)
VALUES (
  'a5d8fcb8-362d-453e-82a6-4fba97691dcb',
  'sukan@turkyilmazigorta.com',
  'Sukan Türkyılmaz',
  'admin',
  'STN Türkyılmaz Sigorta',
  '+90 555 123 4567'
)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  company_name = EXCLUDED.company_name,
  phone = EXCLUDED.phone,
  updated_at = now();


-- ================================================================
-- QUERY 5: Verify Admin User Was Created
-- ================================================================

SELECT
  id,
  email,
  full_name,
  role,
  company_name,
  created_at
FROM profiles
WHERE role = 'admin';

-- Expected Result: 1 row
-- id: a5d8fcb8-362d-453e-82a6-4fba97691dcb
-- email: sukan@turkyilmazigorta.com
-- full_name: Sukan Türkyılmaz
-- role: admin


-- ================================================================
-- QUERY 6: Verify Insurance Companies
-- ================================================================

SELECT
  COUNT(*) as total_companies,
  STRING_AGG(name, ', ' ORDER BY name) as company_names
FROM insurance_companies;

-- Expected Result: 19 companies
-- Including: Anadolu Sigorta, Allianz Sigorta, Aksigorta, etc.


-- ================================================================
-- QUERY 7: Verify Storage Buckets
-- ================================================================

SELECT
  id,
  name,
  public,
  created_at
FROM storage.buckets
ORDER BY name;

-- Expected Result: 5 buckets
-- 1. client-documents (public: true)
-- 2. policies (public: true)
-- 3. policy-documents (public: true)
-- 4. project-backups (public: false)
-- 5. settings (public: true)


-- ================================================================
-- QUERY 8: Check RLS is Enabled on All Tables
-- ================================================================

SELECT
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'profiles', 'clients', 'insurance_companies', 'policies', 'claims',
    'settings', 'announcements', 'announcement_reads', 'agency_info',
    'customer_messages', 'notifications', 'policy_renewal_requests',
    'client_documents', 'dashboard_visibility_settings'
  )
ORDER BY tablename;

-- Expected Result: All tables should have rls_enabled = true


-- ================================================================
-- QUERY 9: Verify Triggers Are Created
-- ================================================================

SELECT
  trigger_name,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'public'
  AND event_object_table IN (
    'customer_messages', 'policy_renewal_requests', 'client_documents'
  )
ORDER BY event_object_table, trigger_name;

-- Expected Result: 4 triggers
-- 1. trigger_notify_new_message (on customer_messages)
-- 2. trigger_notify_renewal_request (on policy_renewal_requests)
-- 3. trigger_notify_renewal_status (on policy_renewal_requests)
-- 4. trigger_notify_document_upload (on client_documents)


-- ================================================================
-- QUERY 10: Test Basic Query (As Admin)
-- ================================================================
-- This should work without errors if RLS is configured correctly

SELECT
  (SELECT COUNT(*) FROM profiles) as profiles_count,
  (SELECT COUNT(*) FROM clients) as clients_count,
  (SELECT COUNT(*) FROM insurance_companies) as companies_count,
  (SELECT COUNT(*) FROM policies) as policies_count,
  (SELECT COUNT(*) FROM claims) as claims_count;

-- Expected Result:
-- profiles_count: 1 (your admin)
-- clients_count: 0 (empty)
-- companies_count: 19 (Turkish insurance companies)
-- policies_count: 0 (empty)
-- claims_count: 0 (empty)


-- ================================================================
-- OPTIONAL: Add Test Client (For Testing)
-- ================================================================
-- Run this if you want to test with sample data

INSERT INTO clients (name, tc_number, phone, email, agent_id)
VALUES (
  'Test Müşteri',
  '12345678901',
  '+90 555 000 0001',
  'test@example.com',
  'a5d8fcb8-362d-453e-82a6-4fba97691dcb'
)
RETURNING id, name, tc_number, phone, email;


-- ================================================================
-- OPTIONAL: View All Data Counts
-- ================================================================

SELECT
  'profiles' as table_name, COUNT(*) as count FROM profiles
UNION ALL
SELECT 'clients', COUNT(*) FROM clients
UNION ALL
SELECT 'insurance_companies', COUNT(*) FROM insurance_companies
UNION ALL
SELECT 'policies', COUNT(*) FROM policies
UNION ALL
SELECT 'claims', COUNT(*) FROM claims
UNION ALL
SELECT 'settings', COUNT(*) FROM settings
UNION ALL
SELECT 'announcements', COUNT(*) FROM announcements
UNION ALL
SELECT 'agency_info', COUNT(*) FROM agency_info
UNION ALL
SELECT 'customer_messages', COUNT(*) FROM customer_messages
UNION ALL
SELECT 'notifications', COUNT(*) FROM notifications
UNION ALL
SELECT 'policy_renewal_requests', COUNT(*) FROM policy_renewal_requests
UNION ALL
SELECT 'client_documents', COUNT(*) FROM client_documents
UNION ALL
SELECT 'dashboard_visibility_settings', COUNT(*) FROM dashboard_visibility_settings
ORDER BY table_name;


-- ================================================================
-- TROUBLESHOOTING QUERIES
-- ================================================================

-- If you get "permission denied" errors, check your auth context:
SELECT
  auth.uid() as current_user_id,
  auth.role() as current_role;

-- Check if your user exists in auth.users:
SELECT
  id,
  email,
  created_at,
  confirmed_at
FROM auth.users
WHERE email = 'sukan@turkyilmazigorta.com';

-- If auth user doesn't exist, you'll need to create it through:
-- Supabase Dashboard → Authentication → Users → Add user


-- ================================================================
-- CLEANUP (Only if you need to start over)
-- ================================================================

-- WARNING: This will delete everything again!
-- Only run if you need to completely reset

-- DROP ALL TABLES CASCADE;
-- Then re-run COMPLETE_MIGRATION.sql


-- ================================================================
-- SUCCESS CRITERIA
-- ================================================================

-- ✅ All 13 tables exist
-- ✅ Admin profile exists with correct email
-- ✅ 19 insurance companies loaded
-- ✅ 5 storage buckets created
-- ✅ 1 default settings record
-- ✅ RLS enabled on all tables
-- ✅ 4 triggers created
-- ✅ All indexes created

-- ================================================================
-- DONE! Now test your application:
-- 1. npm run dev (local)
-- 2. Login with sukan@turkyilmazigorta.com
-- 3. Test creating clients, policies, claims
-- 4. Deploy to Vercel
-- ================================================================
