# Super Admin Dashboard Setup Guide

Follow these steps **in order** to set up the Super Admin Dashboard.

---

## Step 1: Run Database Migrations

Go to **Supabase Dashboard** → **SQL Editor** → **New Query**

### 1.1 Run the Admin Functions Migration

Copy and paste the **entire contents** of this file:
```
supabase/migrations/20260214000000_add_admin_functions.sql
```

Click **Run** (or press Cmd/Ctrl + Enter)

You should see: `Success. No rows returned`

This creates 6 new database functions:
- `is_super_admin()` - Checks if user is super admin
- `get_all_users_admin()` - Lists all users
- `get_all_invitations_admin()` - Lists all invitations
- `remove_user_from_team_admin()` - Remove user from team
- `remove_user_from_club_admin()` - Remove user from club
- `update_user_role_admin()` - Change user role
- `get_system_stats_admin()` - System statistics

### 1.2 Fix Invitation RLS Policies

Copy and paste the **entire contents** of this file:
```
supabase/migrations/20260214100000_fix_invitation_rls_policies.sql
```

Click **Run** (or press Cmd/Ctrl + Enter)

You should see: `Success. No rows returned`

This fixes the Row Level Security policies so super admins can send invitations.

---

## Step 2: Make Yourself a Super Admin

### 2.1 Update the SQL file with your email

Open this file:
```
MAKE_USER_SUPER_ADMIN.sql
```

Replace `'your-email@example.com'` with your actual email address (the one you use to log in).

### 2.2 Run in Supabase

Copy the **UPDATE statement** from the file (lines 15-19):

```sql
UPDATE public.team_members
SET role = 'super_admin'
WHERE user_id = (
  SELECT id FROM public.users WHERE email = 'YOUR-ACTUAL-EMAIL@example.com'
);
```

Paste and run it in Supabase SQL Editor.

You should see: `Success. 1 rows affected` (or similar)

### 2.3 Verify

Run the verification query from the same file (lines 24-32):

```sql
SELECT
  u.email,
  tm.role,
  t.title as team_name
FROM public.users u
LEFT JOIN public.team_members tm ON u.id = tm.user_id
LEFT JOIN public.teams t ON tm.team_id = t.id
WHERE u.email = 'YOUR-ACTUAL-EMAIL@example.com';
```

You should see your role as `super_admin`.

---

## Step 3: Test the Application

### 3.1 Log out and log back in

In your app:
1. Click your user menu (top right)
2. Click "Sign Out"
3. Log back in with your email

### 3.2 Verify Super Admin Navigation

You should now see these menu items (and NOT see "New Match", "Team", "Clubs"):
- **Dashboard** (shows system statistics, not match stats)
- **Users** (user management)
- **Invitations** (send invitations + view all invitations)
- **Organizations** (manage organizations)

---

## Step 4: Test Features

### 4.1 Dashboard
- Should show: Total Users, Super Admins, Teams, Organizations, Matches
- Should NOT show: Match stats, player stats, "New Match" button

### 4.2 Users Page
- Click "Users" in sidebar
- Should show list of all users
- Click on a user to see details
- Try changing a user's role
- Try removing a user from a team

### 4.3 Invitations Page
- Click "Invitations" in sidebar
- You should see:
  - **Send Invitation** form at top
  - **Invitation Breakdown** with total/team/club counts
  - **Full list** of all invitations (team + club)
- Try sending a test invitation

### 4.4 Organizations Page
- Click "Organizations" in sidebar
- Should show list of all organizations
- Try creating/editing/deleting an organization

---

## Troubleshooting

### "new row violates row-level security policy for table 'club_invitations'"

This means the RLS policies need to be fixed. In Supabase SQL Editor, run:

```
supabase/migrations/20260214100000_fix_invitation_rls_policies.sql
```

This updates the policies to allow super admins to send invitations.

### "Error loading invitations - column invited_by does not exist"

This means the migration wasn't run correctly. Go back to **Step 1** and:

1. In Supabase SQL Editor, run this first:
```sql
DROP FUNCTION IF EXISTS get_all_invitations_admin();
```

2. Then run the entire migration file again:
```
supabase/migrations/20260214000000_add_admin_functions.sql
```

### "Access denied. Super admin privileges required"

This means you're not a super admin. Go back to **Step 2** and make sure:
1. You updated the email correctly
2. The UPDATE query affected 1 row
3. You logged out and back in

### Navigation still shows "New Match"

Hard refresh your browser:
- Chrome/Edge: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
- Firefox: Ctrl+F5 (Windows) or Cmd+Shift+R (Mac)
- Safari: Cmd+Option+R (Mac)

---

## Summary of Changes

### Database (Supabase)
- ✅ 6 new RPC functions for admin operations
- ✅ Security checks (all functions require super_admin role)

### Code Changes (Already Applied)
- ✅ New API functions in `src/supabaseClient.js`
- ✅ 5 new React components in `src/components/Admin/`
- ✅ Updated navigation in `src/App.jsx`
- ✅ Dashboard shows system stats for super admins

### Navigation Changes
**Super Admins See:**
- Dashboard (system overview)
- Users
- Invitations
- Organizations

**Regular Users See:**
- Dashboard (match stats)
- New Match
- Team
- Clubs

---

## Need Help?

If you encounter any issues:
1. Check the browser console for errors (F12)
2. Check Supabase logs for database errors
3. Make sure you're logged in as a super admin
4. Try a hard refresh of the browser
