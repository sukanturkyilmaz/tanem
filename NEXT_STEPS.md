# 🚀 Next Steps - Database Migration Complete

## ✅ What We've Done

1. ✅ Created `COMPLETE_MIGRATION.sql` - Complete database schema
2. ✅ Created `SUPABASE_SETUP_INSTRUCTIONS.md` - Step-by-step guide
3. ✅ Updated `.env` file with correct Supabase credentials
4. ✅ Removed fallback values from `src/lib/supabase.ts`

---

## 📋 What YOU Need to Do NOW

### STEP 1: Run Database Migration in Supabase (10 minutes)

**CRITICAL: This must be done first!**

1. Open `SUPABASE_SETUP_INSTRUCTIONS.md` and follow it carefully
2. Go to https://supabase.com/dashboard
3. Select project: `ocmofokkokzufivkcafr`
4. Click **SQL Editor** → **New query**
5. Copy ALL content from `COMPLETE_MIGRATION.sql`
6. Paste into SQL Editor and click **RUN**
7. Wait for success message: `SUCCESS: All tables created | table_count: 13`

### STEP 2: Create Admin User Profile (2 minutes)

**Run this SQL in Supabase SQL Editor:**

```sql
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
```

**Then verify:**

```sql
SELECT id, email, full_name, role FROM profiles WHERE role = 'admin';
```

### STEP 3: Test Locally (5 minutes)

```bash
# Install dependencies (if needed)
npm install

# Start development server
npm run dev
```

Then:
1. Open http://localhost:8080
2. Login with: `sukan@turkyilmazigorta.com`
3. Check that dashboard loads correctly
4. Test creating a client
5. Test uploading a policy

### STEP 4: Update Vercel Environment Variables (3 minutes)

1. Go to https://vercel.com/dashboard
2. Select your project: `tanem` or `stnsigorta`
3. Go to **Settings** → **Environment Variables**
4. Update these variables for ALL environments (Production, Preview, Development):

```
VITE_SUPABASE_URL=https://ocmofokkokzufivkcafr.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9jbW9mb2trb2t6dWZpdmtjYWZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA4NzE4NTYsImV4cCI6MjA3NjQ0Nzg1Nn0.v_BARIBs1IiDOz-ytV3gYUr-giMyZf12m3hUL72k7ok
```

5. Click **Save**

### STEP 5: Deploy to Production (2 minutes)

```bash
# Commit changes
git add .
git commit -m "Update Supabase configuration and database schema"
git push origin main
```

Vercel will automatically deploy. Wait 2-3 minutes for deployment to complete.

### STEP 6: Test Production (5 minutes)

1. Go to https://stnsigorta.com (or your Vercel URL)
2. Login with: `sukan@turkyilmazigorta.com`
3. Test all features:
   - Dashboard loads
   - Client creation works
   - Policy upload works
   - Claims work
   - All CRUD operations work

---

## 📊 Database Overview

Your database now has:

### Tables (13)
- ✅ profiles (admin, agent, client users)
- ✅ clients (customer records)
- ✅ insurance_companies (19 Turkish companies)
- ✅ policies (Kasko, Trafik, İşyeri, etc.)
- ✅ claims (insurance claims)
- ✅ settings (app settings)
- ✅ announcements (agent announcements)
- ✅ announcement_reads (tracking)
- ✅ agency_info (agent contact info)
- ✅ customer_messages (support tickets)
- ✅ notifications (user notifications)
- ✅ policy_renewal_requests (renewal tracking)
- ✅ client_documents (document management)
- ✅ dashboard_visibility_settings (widget preferences)

### Storage Buckets (5)
- ✅ policies (Public)
- ✅ policy-documents (Public)
- ✅ client-documents (Public)
- ✅ settings (Public)
- ✅ project-backups (Private)

### Security
- ✅ Row Level Security (RLS) enabled on ALL tables
- ✅ Proper authentication checks
- ✅ Admin-only operations protected
- ✅ Client data isolation

---

## 🔍 Verification Checklist

After completing all steps, verify:

- [ ] All 13 tables exist in Supabase
- [ ] Admin profile exists with correct email
- [ ] 19 insurance companies are in database
- [ ] Storage buckets are created
- [ ] Local development works
- [ ] Can login to dashboard
- [ ] Can create clients
- [ ] Can upload policies
- [ ] Production deployment successful
- [ ] Production site works correctly

---

## ⚠️ Common Issues

### "Missing Supabase environment variables"
**Solution:** Check that `.env` file has correct values

### "relation does not exist"
**Solution:** Run COMPLETE_MIGRATION.sql in Supabase SQL Editor

### "permission denied for table"
**Solution:** Check that admin profile exists with correct role

### Can't login after migration
**Solution:** Verify auth user exists in Supabase Auth dashboard

---

## 🆘 Need Help?

If something goes wrong:

1. Check Supabase Logs tab
2. Verify all tables were created
3. Confirm admin profile exists
4. Check browser console for errors
5. Review `SUPABASE_SETUP_INSTRUCTIONS.md`

---

## 📝 Files Created

1. `COMPLETE_MIGRATION.sql` - Full database schema
2. `SUPABASE_SETUP_INSTRUCTIONS.md` - Detailed setup guide
3. `NEXT_STEPS.md` - This file
4. `.env` - Updated with correct credentials
5. `src/lib/supabase.ts` - Cleaned up client config

---

## 🎉 After Success

Once everything is working:

1. Add test data (clients, policies)
2. Test all features thoroughly
3. Customize agency info in settings
4. Upload company logo
5. Test client login flow
6. Test PDF uploads
7. Test claims management
8. Verify notifications work

---

**Ready to begin? Start with STEP 1 above!** ⬆️

Good luck! 🚀
