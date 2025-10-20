# Supabase Database Setup Instructions

## Complete Clean Installation - STN Türkyılmaz Sigorta

Follow these steps **IN ORDER** to set up your database from scratch.

---

## ⚠️ IMPORTANT WARNING

**This will DELETE all existing data in your database!**

If you have any important data, back it up first through Supabase Dashboard > Storage.

---

## Step 1: Access Supabase SQL Editor

1. Go to https://supabase.com/dashboard
2. Select your project: `ocmofokkokzufivkcafr`
3. Click **SQL Editor** in the left sidebar
4. Click **New query** button

---

## Step 2: Run the Complete Migration

1. Open the file `COMPLETE_MIGRATION.sql` in this project
2. **Copy the ENTIRE contents** of the file
3. **Paste it** into the Supabase SQL Editor
4. Click the **RUN** button (or press Ctrl+Enter / Cmd+Enter)
5. Wait for the script to complete (should take 10-20 seconds)
6. **Check for errors** in the output panel at the bottom

### Expected Success Message:

```
SUCCESS: All tables created | table_count: 13
```

### What This Script Does:

- ✅ Drops all existing tables (clean slate)
- ✅ Creates 13 new tables with proper structure
- ✅ Sets up Row Level Security (RLS) policies
- ✅ Creates 5 storage buckets with RLS
- ✅ Adds triggers and functions
- ✅ Inserts Turkish insurance companies
- ✅ Inserts default settings

---

## Step 3: Verify Tables Were Created

Run this query in SQL Editor to verify:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;
```

### Expected Tables (13 total):

1. ✅ agency_info
2. ✅ announcement_reads
3. ✅ announcements
4. ✅ claims
5. ✅ client_documents
6. ✅ clients
7. ✅ customer_messages
8. ✅ dashboard_visibility_settings
9. ✅ insurance_companies
10. ✅ notifications
11. ✅ policies
12. ✅ policy_renewal_requests
13. ✅ profiles
14. ✅ settings

---

## Step 4: Create Admin User Profile

**IMPORTANT:** Use the existing auth user ID from your screenshot:
- User ID: `a5d8fcb8-362d-453e-82a6-4fba97691dcb`
- Email: `sukan@turkyilmazigorta.com`

Run this SQL in the editor:

```sql
-- Insert admin profile for existing user
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

-- Verify the admin was created
SELECT id, email, full_name, role, created_at
FROM profiles
WHERE role = 'admin';
```

### Expected Output:

```
id: a5d8fcb8-362d-453e-82a6-4fba97691dcb
email: sukan@turkyilmazigorta.com
full_name: Sukan Türkyılmaz
role: admin
created_at: [timestamp]
```

---

## Step 5: Verify Storage Buckets

1. Click **Storage** in the left sidebar
2. You should see 5 buckets:
   - ✅ policies (Public)
   - ✅ policy-documents (Public)
   - ✅ client-documents (Public)
   - ✅ settings (Public)
   - ✅ project-backups (Private)

---

## Step 6: Verify Insurance Companies

Run this query:

```sql
SELECT name FROM insurance_companies ORDER BY name;
```

You should see 19 Turkish insurance companies including:
- Anadolu Sigorta
- Allianz Sigorta
- Aksigorta
- And 16 more...

---

## Step 7: Test Database Connection

Your `.env` file should have these values:

```env
VITE_SUPABASE_URL=https://ocmofokkokzufivkcafr.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**No changes needed** - these are already correct!

---

## Step 8: Test Login

1. In your local development environment, run: `npm run dev`
2. Go to http://localhost:8080
3. Login with:
   - Email: `sukan@turkyilmazigorta.com`
   - Password: [your existing password]
4. You should see the admin dashboard

---

## Troubleshooting

### Error: "duplicate key value violates unique constraint"

This means the table or data already exists. Solution:
1. Re-run the COMPLETE_MIGRATION.sql script
2. It will DROP all tables first, then recreate them

### Error: "relation does not exist"

This means a table wasn't created properly. Solution:
1. Check the SQL Editor output for specific errors
2. Run the verification query from Step 3
3. If tables are missing, re-run COMPLETE_MIGRATION.sql

### Error: "permission denied for table"

This means RLS policies aren't set correctly. Solution:
1. Verify you're logged in as an admin
2. Re-run COMPLETE_MIGRATION.sql

### Can't Login After Migration

Check your auth user exists:

```sql
-- Run this in SQL Editor
SELECT id, email, created_at
FROM auth.users
WHERE email = 'sukan@turkyilmazigorta.com';
```

If the user doesn't exist, you'll need to create a new one through Supabase Auth Dashboard.

---

## Next Steps

After successful database setup:

1. ✅ Update your local `.env` file (already done!)
2. ✅ Test the application locally
3. ✅ Add test clients and policies
4. ✅ Test all features (upload PDFs, create claims, etc.)
5. ✅ Deploy to Vercel with updated environment variables

---

## Database Schema Summary

### Core Tables:
- **profiles** - User accounts (admin, agent, client)
- **clients** - Customer records
- **insurance_companies** - Insurance provider list
- **policies** - Insurance policies (Kasko, Trafik, İşyeri, etc.)
- **claims** - Insurance claims
- **settings** - Application settings

### Engagement Tables:
- **announcements** - Agent announcements to clients
- **announcement_reads** - Track which announcements were read
- **agency_info** - Agency contact information
- **customer_messages** - Support messages from clients
- **notifications** - User notifications

### Management Tables:
- **policy_renewal_requests** - Policy renewal tracking
- **client_documents** - Document management
- **dashboard_visibility_settings** - Customize dashboard widgets

---

## Support

If you encounter any issues:
1. Check the Supabase Logs tab
2. Verify RLS policies are enabled
3. Confirm your admin profile exists
4. Check that storage buckets are created

---

**Database setup complete!** 🎉
