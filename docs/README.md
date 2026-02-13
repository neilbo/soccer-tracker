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

- **[CLEAN_START.sql](./CLEAN_START.sql)** - Database reset script (drops and recreates all tables)
  - ⚠️ WARNING: This will delete ALL data
  - Use only for development/testing or when you need to start fresh

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
