# Documentation

This folder contains all documentation for the Soccer Tracker authentication and club management implementation.

## Phase Documentation

- **[AUTH_SETUP.md](./AUTH_SETUP.md)** - Initial authentication setup documentation
- **[PHASE_1_COMPLETE.md](./PHASE_1_COMPLETE.md)** - Phase 1: Auth schema and user management
- **[PHASE_2_COMPLETE.md](./PHASE_2_COMPLETE.md)** - Phase 2: Team invitations system
- **[PHASE_3_COMPLETE.md](./PHASE_3_COMPLETE.md)** - Phase 3: Club invitations and team assignment

## Implementation Guides

- **[CLUB_INVITATIONS_IMPLEMENTATION.md](./CLUB_INVITATIONS_IMPLEMENTATION.md)** - Complete technical documentation for club invitations feature
- **[TESTING_GUIDE.md](./TESTING_GUIDE.md)** - Step-by-step testing instructions for all features

## Utility Scripts

### Database Setup

- **[CLEAN_START.sql](./CLEAN_START.sql)** - Complete database reset and setup
  - ⚠️ WARNING: Deletes ALL data and recreates tables
  - Use only for development/testing or when starting fresh
  - Creates all tables, RLS policies, functions, and triggers

- **[CREATE_NORTH_STAR_FC_SIMPLE.sql](./CREATE_NORTH_STAR_FC_SIMPLE.sql)** - Quick setup (recommended)
  - Creates only North Star FC organization
  - Run this after CLEAN_START.sql
  - Simple and fast

- **[SETUP_NORTH_STAR_FC.sql](./SETUP_NORTH_STAR_FC.sql)** - Full setup
  - Creates all 13 organizations (Brighton Bulldogs, Coolum FC, etc.)
  - Only North Star FC shows in signup (frontend filtered)
  - Other clubs available for admin operations

### Recommended Setup Order

```sql
-- 1. First time setup (clean slate)
-- Run: CLEAN_START.sql

-- 2. Then create organization(s)
-- Option A: Quick (just North Star FC)
-- Run: CREATE_NORTH_STAR_FC_SIMPLE.sql

-- Option B: Full (all clubs in database)
-- Run: SETUP_NORTH_STAR_FC.sql
```

## Quick Reference

### User Roles
- `user` - Default user
- `team_staff` - Can manage teams
- `club_admin` - Can manage clubs and invite members
- `super_admin` - Full system access

### Key Tables
- `users` - User profiles
- `clubs` - Organizations
- `teams` - Teams (can belong to clubs or be independent)
- `team_members` - User-team relationships
- `club_members` - User-club relationships
- `invitations` - Team invitations
- `club_invitations` - Club invitations

### Common Tasks

**Make a user super admin:**
```sql
UPDATE public.users
SET role = 'super_admin'
WHERE email = 'user@example.com';
```

**Create a team for a user:**
```sql
INSERT INTO teams (title, club_id) VALUES ('Team Name', NULL);
INSERT INTO team_members (team_id, user_id, role)
VALUES ('<team-id>', '<user-id>', 'team_staff');
```

**Create a club:**
```sql
INSERT INTO clubs (name) VALUES ('Club Name');
```

**Add user to club:**
```sql
INSERT INTO club_members (club_id, user_id, role)
VALUES ('<club-id>', '<user-id>', 'club_admin');
```

## Support

For issues or questions, refer to the relevant documentation above.
