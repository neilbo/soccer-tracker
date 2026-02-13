# Authentication & Authorization Setup Guide

This document explains how to set up and test the new authentication system with role-based access control.

## Overview

The app now supports:
- **Guest Mode**: Use app without login (localStorage only)
- **Team Staff Role**: Full access to assigned teams (Coach/Manager/Assistant Coach)
- **Club Admin Role**: Read-only + export access to all teams in their club
- **Super Admin Role**: Full system access, manage users/roles/permissions

## Prerequisites

1. **Supabase Project**: You need a Supabase project with the credentials in `.env`
2. **Supabase CLI** (optional but recommended): For running migrations

## Setup Instructions

### Step 1: Run the Database Migration

The migration creates all necessary tables and RLS policies.

#### Option A: Using Supabase CLI (Recommended)

```bash
# Install Supabase CLI if you haven't
npm install -g supabase

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Run the migration
supabase db push
```

#### Option B: Using Supabase Dashboard

1. Go to your Supabase Dashboard → SQL Editor
2. Open the migration file: `supabase/migrations/20260213000000_add_auth_schema.sql`
3. Copy the entire contents
4. Paste into the SQL Editor and run

### Step 2: Verify Supabase Auth Settings

In your Supabase Dashboard → Authentication → Settings:

1. **Enable Email provider**
2. **Disable email confirmations** (for testing) or configure email templates
3. **Set Site URL**: `http://localhost:5173` (for dev)

### Step 3: Start the Development Server

```bash
npm run dev
```

### Step 4: Access the App

Open `http://localhost:5173`

You should see the **Login Screen** (or click "Continue as Guest" to use guest mode).

## Testing the Authentication Flow

### Test 1: Guest Mode

1. Click **"Continue as Guest"** on the login screen
2. App should work normally with localStorage
3. Data persists only on this device
4. See "Sign up to sync" button in navigation

**Expected**: Full app functionality, no Supabase sync

### Test 2: User Signup & Team Creation

1. Reload the app (or sign out if in guest mode)
2. Click **"Sign up"**
3. Fill in:
   - Full Name: `Test Coach`
   - Email: `coach@example.com`
   - Password: `password123`
   - Team Name: `U10 Test Team`
4. Click **"Create Account"**

**Expected**:
- Account created
- Team created automatically
- User assigned as "team_staff" role
- Redirected to dashboard
- Team name appears in navigation
- Data syncs to Supabase

### Test 3: Multi-Team Access

#### Create Second Team:
1. Click the **Team Selector** dropdown (shows current team name)
2. Click **"Create New Team"**
3. Enter team name: `U12 Test Team`
4. Click **"Create"**

**Expected**:
- New team created
- Auto-switched to new team
- Empty dashboard (new team has no data)
- Can switch between teams using dropdown
- Each team has isolated data

#### Test Team Switching:
1. Add a match to `U12 Test Team`
2. Switch to `U10 Test Team` using dropdown
3. Verify different matches show
4. Switch back to `U12 Test Team`
5. Verify your match is still there

**Expected**: Complete data isolation between teams

### Test 4: Club Admin Role (Manual Setup Required)

Since we don't have the admin panel yet, you need to manually assign the club admin role:

1. **Create a club** in Supabase Dashboard → Table Editor → `clubs`:
   ```
   id: [generate UUID]
   name: "Test Soccer Club"
   ```

2. **Assign team to club** → Table Editor → `teams`:
   - Find your team
   - Set `club_id` to the club UUID

3. **Create club admin user**:
   - Sign up a new user: `clubadmin@example.com`

4. **Assign club admin role** → Table Editor → `club_members`:
   ```
   club_id: [club UUID]
   user_id: [new user's UUID from auth.users]
   role: club_admin
   ```

5. **Remove team_members entry** (club admins don't need direct team access)

6. **Sign in as club admin**

**Expected**:
- See "Club Admin" badge
- See "Read-Only Access" indicator
- Can VIEW all teams in the club
- CANNOT edit anything (buttons disabled/hidden)
- CAN export data

### Test 5: Super Admin Role (Manual Setup)

1. **Assign super admin** → Table Editor → `team_members`:
   - Pick any user
   - Add an entry:
     ```
     team_id: [any team UUID]
     user_id: [user UUID]
     role: super_admin
     ```

2. **Sign in as super admin**

**Expected**:
- See "Super Admin" badge
- Can access ALL teams across all clubs
- Full edit permissions everywhere
- Can see data from all teams

## Data Persistence Modes

### Guest Mode (No Auth)
- **Storage**: localStorage only
- **Sync**: None
- **Persistence**: Device-specific
- **Team ID**: Uses app state, not database

### Authenticated Mode
- **Storage**: Both localStorage (cache) AND Supabase
- **Sync**: Automatic (500ms debounced)
- **Persistence**: Cross-device
- **Team ID**: UUID from database

### Storage Structure

#### localStorage (all modes):
```javascript
Key: "soccer-tracker-data"
Value: {
  matches: [...],
  squad: [...],
  clubs: [...],
  teamTitle: "...",
  currentMatch: {...}
}
```

#### Supabase app_state table:
```sql
id: team_id (UUID)
data: jsonb (same as localStorage)
updated_at: timestamp
```

#### Supabase normalized tables:
- `teams`: Team metadata
- `players`: Squad roster
- `matches`: Match records
- `match_players`: Per-match player stats

## Permission Matrix

| Feature | Guest | Team Staff | Club Admin | Super Admin |
|---------|-------|------------|------------|-------------|
| View own team | ✓ | ✓ | - | ✓ |
| View club teams | - | - | ✓ | ✓ |
| View all teams | - | - | - | ✓ |
| Create/Edit matches | ✓ | ✓ | ✗ | ✓ |
| Edit squad | ✓ | ✓ | ✗ | ✓ |
| Export data | ✓ | ✓ | ✓ | ✓ |
| Sync across devices | ✗ | ✓ | ✓ | ✓ |
| Manage team members | - | - | - | ✓ |
| Manage clubs | - | - | - | ✓ |

## Common Issues & Solutions

### Issue: "Row Level Security policy violation"

**Cause**: RLS policies not set up correctly

**Solution**:
1. Verify migration ran successfully
2. Check Supabase Dashboard → Authentication → Policies
3. Ensure policies exist for all tables
4. Try signing out and back in

### Issue: "No teams available"

**Cause**: User has no team memberships

**Solution**:
1. Create a team using Team Selector → "Create New Team"
2. Or manually assign user to team in `team_members` table

### Issue: Can't see other teams as club admin

**Cause**: Club admin not properly assigned

**Solution**:
1. Verify entry in `club_members` table
2. Verify team's `club_id` matches
3. Verify NO entry in `team_members` (club admins shouldn't be team members)

### Issue: Data not syncing to Supabase

**Cause**: Not authenticated or team not selected

**Solution**:
1. Verify you're signed in (check for user menu)
2. Verify team is selected (check team selector)
3. Check browser console for errors
4. Verify `.env` has correct Supabase credentials

## Migration from Guest to Authenticated

Currently, guest data is NOT automatically migrated when signing up. This feature is planned for Phase 2.

**Workaround**:
1. Export guest data as CSV
2. Sign up for account
3. Manually re-enter data (or import via future import feature)

## Next Steps (Phase 2)

- [ ] Guest data migration on signup
- [ ] Team invitation system (invite other coaches)
- [ ] Admin panel UI for super admins
- [ ] Bulk export for club admins
- [ ] Audit logging
- [ ] Email notifications

## Security Notes

- All data access is enforced server-side via RLS policies
- Client-side UI restrictions are for UX only
- Never trust client-side permissions - RLS is the source of truth
- Rotate Supabase anon key if exposed publicly
- Use proper email verification in production

## Troubleshooting

### Enable Debug Mode

Add to browser console:
```javascript
localStorage.setItem('debug', 'true');
```

Reload the app. You'll see detailed auth logs.

### Reset Local Data

```javascript
localStorage.removeItem('soccer-tracker-data');
localStorage.removeItem('currentTeamId');
```

### Check Auth State

```javascript
// In browser console
const { data } = await supabase.auth.getUser();
console.log(data);
```

## Support

For issues or questions:
1. Check browser console for errors
2. Check Supabase Dashboard → Logs
3. Review RLS policies in Supabase Dashboard
4. Create an issue on GitHub

---

**Phase 1 Complete! 🎉**

The authentication foundation is now ready for testing. Please test all scenarios above and report any issues.
