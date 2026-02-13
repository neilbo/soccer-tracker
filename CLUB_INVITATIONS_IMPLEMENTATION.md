# Club Invitations & Team Assignment Implementation

## Overview

This implementation adds a complete club invitation and team assignment system to the Soccer Tracker application. Users can now:

- Be invited to clubs by club admins
- Accept/decline club invitations
- Create teams under clubs (or as independent teams)
- Manage club memberships and invitations

## Architecture

### Database Schema

#### New Table: `club_invitations`

```sql
CREATE TABLE club_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  inviter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invitee_email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'team_staff' CHECK (role IN ('team_staff', 'club_admin')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '7 days'),
  accepted_at TIMESTAMPTZ
);
```

**Key Features:**
- Secure random tokens (32 bytes)
- 7-day expiration
- Unique constraint on (club_id, invitee_email, status) for pending invitations
- Role support: `team_staff` or `club_admin`

#### Database Functions

1. **`accept_club_invitation(invitation_token)`**
   - Validates token and email match
   - Adds user to `club_members` table
   - Updates invitation status to 'accepted'
   - Returns success/error status

2. **`get_club_invitations(p_club_id)`**
   - Lists all invitations for a club (for admins)
   - Includes inviter name and status
   - Security: Only club admins can view

3. **`get_my_club_invitations()`**
   - Lists pending invitations for current user's email
   - Includes club name and inviter details
   - Auto-filters expired invitations

4. **`expire_old_club_invitations()`**
   - Utility function to mark expired invitations
   - Can be run as a cron job

#### Row Level Security (RLS)

- **Club admins** can create and view invitations for their clubs
- **Users** can view invitations sent to their email
- **Users** can accept/decline their own invitations
- **Super admins** have full access

## Implementation Components

### 1. Database Layer (`supabaseClient.js`)

#### New Functions

```javascript
// Club Invitation Functions
createClubInvitation(clubId, inviteeEmail, role)
getClubInvitations(clubId)
getMyClubInvitations()
acceptClubInvitation(token)
declineClubInvitation(invitationId)
cancelClubInvitation(invitationId)

// Club Management Functions
getUserClubs()
createClub(clubName)
getAllClubs()
```

### 2. Auth Context (`useAuth.jsx`)

#### New State & Functions

```javascript
const {
  userClubs,        // Array of clubs user belongs to
  loadUserClubs,    // Refresh user's clubs
  // ... existing auth state
} = useAuth();
```

**Flow:**
1. User authenticates → `loadUserData()` called
2. `loadUserData()` → calls `loadUserClubsData()`
3. User's clubs loaded into `userClubs` state
4. Available throughout the app via context

### 3. UI Components

#### `PendingClubInvitations.jsx`

**Purpose:** Display pending club invitations for the current user

**Features:**
- Auto-loads on mount
- Accept/decline buttons
- Shows club name, inviter, role, expiration
- Purple theme (distinct from team invitations which are blue)
- Auto-refreshes user's clubs on acceptance

**Integration:** Displayed at the top of authenticated views in `App.jsx`

#### `ClubInvitationManager.jsx`

**Purpose:** Manage club invitations (for club admins)

**Features:**
- Send new invitations (email + role)
- View all sent invitations with status
- Cancel pending invitations
- Shows inviter name and expiration dates
- Similar UI to team invitations for consistency

**Access:** Club admins only

#### `CreateClubModal.jsx`

**Purpose:** Create new clubs (super admin only)

**Features:**
- Simple modal form
- Club name input
- Creates club in database
- Callbacks on success

**Access:** Super admins only

#### `ClubListView.jsx` (Optional)

**Purpose:** View and manage clubs user belongs to

**Features:**
- List of user's clubs with role badges
- "Invite Members" button for club admins
- Opens `ClubInvitationManager` modal
- "Create Club" button for super admins

**Integration:** Can be added to main navigation

### 4. Team Creation Updates

#### `TeamSelector.jsx`

**Updates:**
- Added club dropdown to "Create New Team" form
- Shows user's clubs + "Independent" option
- Passes `clubId` to `createNewTeam()`
- Helper text when no clubs available

**User Experience:**
```
Create New Team Form:
├── Team Name: [input]
├── Club: [dropdown]
│   ├── Independent Team (default)
│   ├── Club A
│   └── Club B
└── [Create] button
```

## User Flows

### 1. Club Admin Invites User

```
Club Admin → Opens ClubInvitationManager
          → Enters user email + selects role
          → Sends invitation
          → Invitation saved with unique token
```

### 2. User Accepts Club Invitation

```
User → Sees PendingClubInvitations banner
     → Clicks "Accept"
     → accept_club_invitation() RPC called
     → User added to club_members
     → Invitation marked as accepted
     → userClubs refreshed
     → Invitation removed from list
```

### 3. User Creates Team Under Club

```
User → Opens TeamSelector dropdown
     → Clicks "Create New Team"
     → Enters team name
     → Selects club from dropdown (or "Independent")
     → Submits form
     → Team created with club_id
     → Team appears in teams list
```

### 4. End-to-End Flow

```
1. Super Admin creates Club X
2. Club Admin is assigned to Club X
3. Club Admin invites User A to Club X as 'team_staff'
4. User A accepts invitation
5. User A is now a member of Club X
6. User A creates Team Y under Club X
7. Team Y has club_id = Club X's ID
8. User A can see Team Y in their teams list
```

## Security Considerations

### Token Security
- 32-byte secure random tokens
- Unique per invitation
- Cannot be guessed or enumerated

### Email Validation
- Invitation can only be accepted by matching email
- Checked in RPC function, not client-side

### Role Enforcement
- Club admin status checked server-side
- RLS policies enforce permissions
- No client-side role bypassing

### Expiration
- 7-day expiration on all invitations
- Expired invitations auto-filtered
- Can be purged via cron job

## Testing Checklist

### Database Migration
- [x] Migration file created
- [ ] Run migration: `supabase migration up`
- [ ] Verify table created
- [ ] Test RLS policies
- [ ] Test database functions

### Club Invitations
- [ ] Create club as super admin
- [ ] Send invitation as club admin
- [ ] Verify invitation appears for invitee
- [ ] Accept invitation
- [ ] Verify user added to club_members
- [ ] Decline invitation
- [ ] Test expired invitations

### Team Creation
- [ ] User with no clubs → only sees "Independent"
- [ ] User with clubs → sees club dropdown
- [ ] Create independent team (club_id = null)
- [ ] Create team under club
- [ ] Verify team.club_id is correct
- [ ] Verify team appears in TeamSelector

### Integration
- [ ] PendingClubInvitations displays on login
- [ ] Accept invitation → clubs refresh
- [ ] Create team under club → works correctly
- [ ] TeamSelector shows club names
- [ ] All permissions work correctly

## Migration Guide

### Step 1: Run Database Migration

```bash
cd /path/to/soccer-tracker
supabase migration up
```

Or if using Supabase Dashboard:
1. Go to SQL Editor
2. Copy contents of `supabase/migrations/20260213200000_add_club_invitations.sql`
3. Run the migration

### Step 2: Verify Database

```sql
-- Check table exists
SELECT * FROM club_invitations LIMIT 1;

-- Check functions exist
SELECT proname FROM pg_proc WHERE proname LIKE '%club_invitation%';

-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'club_invitations';
```

### Step 3: Test in UI

1. Login as super admin
2. Create a test club
3. Assign yourself as club admin
4. Invite a test user
5. Login as test user
6. Accept invitation
7. Create team under club
8. Verify team has correct club_id

## File Structure

```
src/
├── components/
│   ├── Club/
│   │   ├── ClubInvitationManager.jsx       ✅ NEW
│   │   ├── PendingClubInvitations.jsx      ✅ NEW
│   │   ├── CreateClubModal.jsx             ✅ NEW
│   │   └── ClubListView.jsx                ✅ NEW (optional)
│   ├── Team/
│   │   └── TeamSelector.jsx                 ✨ UPDATED
│   └── Auth/
│       └── SignupScreen.jsx                 (no changes needed)
├── hooks/
│   └── useAuth.jsx                          ✨ UPDATED
├── supabaseClient.js                        ✨ UPDATED
└── App.jsx                                  ✨ UPDATED

supabase/
└── migrations/
    └── 20260213200000_add_club_invitations.sql  ✅ NEW
```

## API Reference

### Supabase Client Functions

#### `createClubInvitation(clubId, inviteeEmail, role)`
Creates a new club invitation.

**Parameters:**
- `clubId` (UUID): Club to invite to
- `inviteeEmail` (string): Email of invitee
- `role` (string): 'team_staff' or 'club_admin'

**Returns:**
```javascript
{
  invitation: { id, club_id, invitee_email, role, token, ... },
  error: { message: "..." } | null
}
```

#### `getClubInvitations(clubId)`
Get all invitations for a club (club admins only).

**Returns:**
```javascript
{
  invitations: [
    { id, invitee_email, role, status, created_at, expires_at, inviter_name }
  ],
  error: null
}
```

#### `getMyClubInvitations()`
Get pending club invitations for current user.

**Returns:**
```javascript
{
  invitations: [
    { id, club_id, club_name, role, token, inviter_name, expires_at }
  ],
  error: null
}
```

#### `acceptClubInvitation(token)`
Accept a club invitation.

**Returns:**
```javascript
{
  success: true,
  clubId: "uuid",
  error: null
}
```

#### `getUserClubs()`
Get all clubs current user is a member of.

**Returns:**
```javascript
{
  clubs: [
    { id, name, role }
  ],
  error: null
}
```

## Future Enhancements

### Phase 2 Improvements
- Email notifications for invitations
- Batch invitations (CSV import)
- Invitation link sharing
- Custom expiration periods

### Phase 3 Features
- Club dashboard with analytics
- Bulk team operations for club admins
- Transfer teams between clubs
- Club-level settings and branding

### Phase 4 Features
- Club discovery (public directory)
- Club leagues and competitions
- Cross-club reporting
- Club roles hierarchy (owner, admin, member)

## Troubleshooting

### Invitations not appearing
- Check email matches exactly (case-insensitive)
- Verify invitation hasn't expired
- Check invitation status in database

### Cannot create teams under club
- Verify user is member of club (check `club_members` table)
- Check userClubs is populated in auth context
- Verify club_id in teams table

### RLS policy errors
- Verify user is authenticated
- Check user's role in `club_members` table
- Verify RLS policies are enabled

### Migration errors
- Check Supabase logs
- Verify no duplicate table/function names
- Ensure migrations run in order

## Support

For issues or questions:
1. Check this documentation
2. Review database logs in Supabase Dashboard
3. Check browser console for client errors
4. Verify RLS policies and permissions

## Summary

This implementation provides a complete club invitation and team assignment system while maintaining backward compatibility with existing independent teams. The design is secure, scalable, and follows the established patterns in the codebase.

**Key Achievements:**
✅ Club invitations separate from team invitations
✅ Club selection during team creation
✅ Independent teams remain fully supported
✅ Super admin club creation
✅ Secure token-based invitations
✅ Full RLS security
✅ Consistent UI/UX with existing components
✅ Backward compatible with existing data
