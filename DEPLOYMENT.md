# Deployment Guide

This guide covers deploying the Soccer Tracker app to production.

---

## Prerequisites

Before deploying, ensure you have:
- ✅ A Supabase project set up
- ✅ All database migrations run in Supabase
- ✅ A hosting platform account (Vercel, Netlify, etc.)

---

## Step 1: Get Supabase Credentials

1. Go to your **Supabase Dashboard**
2. Select your project
3. Navigate to **Project Settings** → **API**
4. Copy these values:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **Anon/Public Key** (starts with `eyJ...`)

---

## Step 2: Set Environment Variables in Production

Your hosting platform needs these environment variables:

### Required Variables
```bash
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Where to Set Them

#### Vercel
1. Go to **Project Settings** → **Environment Variables**
2. Add both variables:
   - Name: `VITE_SUPABASE_URL`
   - Value: Your Supabase URL
   - Name: `VITE_SUPABASE_ANON_KEY`
   - Value: Your Supabase anon key
3. Click **Save**
4. **Redeploy** your app for changes to take effect

#### Netlify
1. Go to **Site Settings** → **Environment Variables**
2. Click **Add a variable**
3. Add both variables as above
4. **Trigger a new deploy**

#### Other Platforms
Most platforms have similar settings:
- Railway: Settings → Variables
- Render: Environment → Environment Variables
- GitHub Pages: Not recommended (env vars exposed)

---

## Step 3: Run Database Migrations

Ensure all migrations are run in your **production** Supabase project:

### Required Migrations (in order)

1. **Auth Schema** (if not already run)
   ```
   supabase/migrations/20260213000000_add_auth_schema.sql
   ```

2. **Team Invitations** (if not already run)
   ```
   supabase/migrations/20260213100000_add_invitations.sql
   ```

3. **Club Invitations** (if not already run)
   ```
   supabase/migrations/20260213200000_add_club_invitations.sql
   ```

4. **Admin Functions** ⚠️ REQUIRED FOR SUPER ADMIN
   ```
   supabase/migrations/20260214000000_add_admin_functions.sql
   ```

5. **Fix RLS Policies** ⚠️ REQUIRED FOR INVITATIONS
   ```
   supabase/migrations/20260214100000_fix_invitation_rls_policies.sql
   ```

### How to Run
1. Open **Supabase Dashboard** → **SQL Editor**
2. Copy the **entire contents** of each file
3. Paste and click **Run**
4. Verify: `Success. No rows returned`

---

## Step 4: Create Your Super Admin

After deploying, make yourself a super admin:

1. **Sign up** for an account in your deployed app
2. Go to **Supabase Dashboard** → **SQL Editor**
3. Run this query (replace with your email):

```sql
UPDATE public.team_members
SET role = 'super_admin'
WHERE user_id = (
  SELECT id FROM public.users WHERE email = 'your-email@example.com'
);
```

4. **Verify** it worked:
```sql
SELECT u.email, tm.role
FROM public.users u
LEFT JOIN public.team_members tm ON u.id = tm.user_id
WHERE u.email = 'your-email@example.com';
```

You should see `role: super_admin`

---

## Step 5: Test Your Deployment

### 1. Test Authentication
- Sign out and sign back in
- Verify you see the super admin navigation:
  - Dashboard (system stats)
  - Users
  - Invitations
  - Organizations

### 2. Test Admin Features
- **Dashboard**: Check system statistics load
- **Users**: View all users
- **Invitations**: Send a test invitation
- **Organizations**: Create/edit/delete an organization

---

## Troubleshooting

### "Supabase not configured" Error

**Cause:** Environment variables not set in production

**Fix:**
1. Verify variables are set in your hosting platform
2. Variable names must be **exact**: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
3. **Redeploy** after adding variables (most platforms don't auto-redeploy)
4. Check browser console for the actual values being used (they should not be `undefined`)

### Migrations Not Applied

**Symptoms:**
- "column does not exist" errors
- "function does not exist" errors
- "new row violates row-level security policy"

**Fix:**
1. Go to Supabase Dashboard → SQL Editor
2. Run all migrations listed in Step 3 (in order)
3. Refresh your app

### Super Admin Not Working

**Symptoms:**
- Still see "New Match" in navigation
- Don't see admin menu items
- Can't access admin pages

**Fix:**
1. Verify the UPDATE query in Step 4 affected 1 row
2. Sign out completely
3. Clear browser cache (Cmd/Ctrl + Shift + R)
4. Sign back in

### RLS Policy Errors When Sending Invitations

**Error:** "new row violates row-level security policy"

**Fix:**
Run the RLS fix migration:
```
supabase/migrations/20260214100000_fix_invitation_rls_policies.sql
```

---

## Build Configuration

### Vite Build

The app uses Vite. Your hosting platform should:
- **Build command**: `npm run build` or `vite build`
- **Output directory**: `dist`
- **Install command**: `npm install`

### Environment Variables in Build

⚠️ **Important**: Vite environment variables starting with `VITE_` are embedded in the build at build time.

This means:
1. Set env vars **before** building
2. If you change env vars, **rebuild** the app
3. Vite will replace `import.meta.env.VITE_*` with actual values in the bundle

---

## Security Notes

### What's Safe to Expose
✅ **Supabase URL** - Public, safe to expose
✅ **Supabase Anon Key** - Public, safe to expose (protected by RLS)

### What to NEVER Expose
❌ **Supabase Service Role Key** - Never use in frontend
❌ **Database passwords** - Never needed in frontend
❌ **Private API keys** - Backend only

### Row Level Security (RLS)
The app uses RLS to protect data. The anon key is safe because:
- Users can only access data they're authorized for
- All sensitive operations check permissions
- Super admin functions verify `is_super_admin()` before executing

---

## Updating Your Deployment

### For Code Changes
1. Push changes to your git repository
2. Most platforms auto-deploy on push
3. Or manually trigger a deploy

### For Database Changes
1. Create a new migration file
2. Run it in Supabase Dashboard → SQL Editor
3. No app redeployment needed

### For Environment Variable Changes
1. Update variables in hosting platform
2. **Trigger a new deployment**
3. Verify changes took effect

---

## Monitoring

### Check Logs
- **Hosting Platform**: Check deployment and runtime logs
- **Supabase**: Dashboard → Logs → check for errors
- **Browser Console**: F12 → Console tab

### Common Issues
- CORS errors: Check Supabase allowed origins
- 401/403 errors: Check RLS policies
- Function errors: Check Supabase logs

---

## Rollback Plan

If something goes wrong:

1. **Revert Code**: Deploy previous commit
2. **Revert Database**: Supabase has point-in-time recovery (Settings → Database → Backups)
3. **Check Logs**: Identify what went wrong before reverting

---

## Production Checklist

Before going live:

- [ ] All migrations run in production Supabase
- [ ] Environment variables set correctly
- [ ] At least one super admin created
- [ ] Test login/signup flow
- [ ] Test admin features
- [ ] Test regular user features
- [ ] Check browser console for errors
- [ ] Test on mobile devices
- [ ] Verify all API calls work
- [ ] Check Supabase usage/limits

---

## Support

If you encounter issues:
1. Check browser console (F12)
2. Check Supabase logs
3. Check hosting platform logs
4. Refer to troubleshooting section above
