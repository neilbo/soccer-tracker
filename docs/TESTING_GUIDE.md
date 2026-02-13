# Club Invitations Testing Guide

## Prerequisites

Before testing, you need to run the database migration:

```bash
# Option 1: Using Supabase CLI (recommended)
cd /Users/neil/Downloads/Repos/soccer-tracker
supabase migration up

# Option 2: Using Supabase Dashboard
# 1. Go to SQL Editor in Supabase Dashboard
# 2. Copy contents of supabase/migrations/20260213200000_add_club_invitations.sql
# 3. Run the SQL
```

## Test Scenarios

### Scenario 1: Super Admin Creates Club

**Goal:** Verify super admins can create clubs

**Steps:**
1. Login as a super admin user
2. (Optional) Navigate to ClubListView or use CreateClubModal directly
3. Click "Create Club"
4. Enter club name (e.g., "Test FC")
5. Submit

**Expected:**
- ✅ Club created successfully
- ✅ No errors in console
- ✅ Club appears in database

**Verify in Database:**
```sql
SELECT * FROM clubs WHERE name = 'Test FC';
```

---

### Scenario 2: Club Admin Sends Invitation

**Goal:** Verify club admins can invite members

**Prerequisites:**
- You need a club admin user
- If you don't have one, manually add to club_members:
  ```sql
  INSERT INTO club_members (club_id, user_id, role)
  VALUES ('<club-uuid>', '<user-uuid>', 'club_admin');
  ```

**Steps:**
1. Login as club admin
2. Navigate to TeamSelector
3. (Or use ClubListView if implemented)
4. Click "Invite Members" or similar button
5. Enter invitee email (use a test email you can access)
6. Select role (team_staff or club_admin)
7. Click "Send Invitation"

**Expected:**
- ✅ Success message shown
- ✅ Invitation appears in list
- ✅ Status shows "Pending"
- ✅ Expiration date shown (7 days from now)

**Verify in Database:**
```sql
SELECT * FROM club_invitations WHERE invitee_email = 'test@example.com';
```

---

### Scenario 3: User Accepts Club Invitation

**Goal:** Verify users can accept invitations and join clubs

**Prerequisites:**
- Club invitation sent to your test email
- You can see the invitation token in database

**Steps:**
1. Login as the invited user (or create account with invited email)
2. Look for purple "Club Invitations" banner at top
3. Verify invitation details (club name, inviter, role)
4. Click "Accept"

**Expected:**
- ✅ Success message or auto-refresh
- ✅ Invitation removed from banner
- ✅ User added to club
- ✅ User can now see club in dropdown

**Verify in Database:**
```sql
-- Check user is club member
SELECT * FROM club_members
WHERE user_id = '<user-uuid>' AND club_id = '<club-uuid>';

-- Check invitation status
SELECT status FROM club_invitations WHERE id = '<invitation-uuid>';
-- Should show 'accepted'
```

---

### Scenario 4: Create Team Under Club

**Goal:** Verify users can create teams under clubs they belong to

**Prerequisites:**
- User is a member of at least one club

**Steps:**
1. Login as user who is club member
2. Click TeamSelector dropdown
3. Click "Create New Team"
4. Enter team name (e.g., "U12 Thunderbolts")
5. Select club from dropdown (should show user's clubs)
6. Click "Create"

**Expected:**
- ✅ Team created successfully
- ✅ Team appears in TeamSelector list
- ✅ Team shows club name underneath
- ✅ Team has correct club_id

**Verify in Database:**
```sql
SELECT id, title, club_id FROM teams
WHERE title = 'U12 Thunderbolts';
-- club_id should match selected club
```

---

### Scenario 5: Create Independent Team

**Goal:** Verify users can still create independent teams (backward compatibility)

**Steps:**
1. Login as any authenticated user
2. Click TeamSelector dropdown
3. Click "Create New Team"
4. Enter team name (e.g., "Independent Rangers")
5. Leave dropdown on "Independent Team"
6. Click "Create"

**Expected:**
- ✅ Team created successfully
- ✅ Team appears in TeamSelector list
- ✅ No club name shown (since independent)
- ✅ Team has club_id = null

**Verify in Database:**
```sql
SELECT id, title, club_id FROM teams
WHERE title = 'Independent Rangers';
-- club_id should be NULL
```

---

### Scenario 6: Decline Club Invitation

**Goal:** Verify users can decline invitations

**Prerequisites:**
- Club invitation sent to test email

**Steps:**
1. Login as invited user
2. See purple "Club Invitations" banner
3. Click "Decline" instead of "Accept"

**Expected:**
- ✅ Invitation removed from banner
- ✅ Status updated in database
- ✅ User NOT added to club_members

**Verify in Database:**
```sql
SELECT status FROM club_invitations WHERE id = '<invitation-uuid>';
-- Should show 'declined'
```

---

### Scenario 7: Cancel Pending Invitation

**Goal:** Verify club admins can cancel invitations

**Steps:**
1. Login as club admin
2. Open ClubInvitationManager
3. Find a pending invitation
4. Click "Cancel"

**Expected:**
- ✅ Invitation removed from list
- ✅ Deleted from database
- ✅ Invitee can no longer accept

**Verify in Database:**
```sql
SELECT * FROM club_invitations WHERE id = '<invitation-uuid>';
-- Should return no rows (deleted)
```

---

### Scenario 8: Expired Invitation

**Goal:** Verify expired invitations are handled correctly

**Setup:**
```sql
-- Manually expire an invitation for testing
UPDATE club_invitations
SET expires_at = now() - interval '1 day'
WHERE id = '<invitation-uuid>';
```

**Steps:**
1. Login as invited user
2. Check PendingClubInvitations banner

**Expected:**
- ✅ Expired invitation NOT shown
- ✅ Function filters out expired invites

**Cleanup:**
```sql
-- Run cleanup function
SELECT expire_old_club_invitations();
-- Should mark invitation as 'expired'
```

---

## Security Testing

### Test 1: Non-Club-Admin Cannot Send Invitations

**Steps:**
1. Login as regular user (not club admin)
2. Try to call createClubInvitation() via console:
   ```javascript
   // This should fail with RLS error
   await supabase.from('club_invitations').insert({
     club_id: '<some-club-id>',
     inviter_id: '<user-id>',
     invitee_email: 'test@example.com',
     role: 'team_staff'
   });
   ```

**Expected:**
- ❌ RLS policy blocks insertion
- ❌ Error message about permissions

### Test 2: Cannot Accept Someone Else's Invitation

**Steps:**
1. Login as User A
2. Try to accept invitation sent to User B's email
3. Use token from database

**Expected:**
- ❌ accept_club_invitation() returns error
- ❌ Email doesn't match, so rejection

### Test 3: Cannot View Other Clubs' Invitations

**Steps:**
1. Login as Club A admin
2. Try to query Club B's invitations:
   ```javascript
   await supabase.rpc('get_club_invitations', {
     p_club_id: '<club-b-id>'
   });
   ```

**Expected:**
- ❌ RLS blocks query or returns empty
- ❌ Only own club invitations visible

---

## UI/UX Testing

### Test 1: Empty State - No Clubs

**Steps:**
1. Login as new user (no club memberships)
2. Open TeamSelector → "Create New Team"
3. Look at club dropdown

**Expected:**
- ✅ Dropdown shows only "Independent Team"
- ✅ Helper text: "You are not a member of any clubs yet"

### Test 2: Multiple Clubs Display

**Steps:**
1. Login as user in multiple clubs
2. Open TeamSelector → "Create New Team"
3. Check club dropdown

**Expected:**
- ✅ All clubs listed
- ✅ "Independent Team" at top
- ✅ Club names displayed correctly

### Test 3: Pending Invitations Banner

**Steps:**
1. Have 2-3 pending club invitations
2. Login and view app

**Expected:**
- ✅ Purple banner at top
- ✅ Shows count: "Club Invitations (3)"
- ✅ Each invitation has club name, inviter, role
- ✅ Accept/Decline buttons work
- ✅ Banner disappears when all accepted/declined

### Test 4: Team List Shows Club Names

**Steps:**
1. Create teams under different clubs
2. Create some independent teams
3. Open TeamSelector dropdown

**Expected:**
- ✅ Teams under clubs show club name
- ✅ Independent teams show no club name
- ✅ List is readable and well-formatted

---

## Database Verification Queries

### Check All Club Invitations
```sql
SELECT
  ci.id,
  c.name as club_name,
  ci.invitee_email,
  ci.role,
  ci.status,
  ci.expires_at,
  u.name as inviter_name
FROM club_invitations ci
JOIN clubs c ON c.id = ci.club_id
LEFT JOIN users u ON u.id = ci.inviter_id
ORDER BY ci.created_at DESC;
```

### Check User's Clubs
```sql
SELECT
  cm.user_id,
  u.name as user_name,
  c.name as club_name,
  cm.role,
  cm.created_at
FROM club_members cm
JOIN clubs c ON c.id = cm.club_id
JOIN users u ON u.id = cm.user_id
WHERE cm.user_id = '<user-uuid>';
```

### Check Teams with Clubs
```sql
SELECT
  t.id,
  t.title as team_name,
  c.name as club_name,
  t.club_id
FROM teams t
LEFT JOIN clubs c ON c.id = t.club_id
ORDER BY t.title;
```

### Check Invitation Statistics
```sql
-- Count by status
SELECT status, COUNT(*)
FROM club_invitations
GROUP BY status;

-- Count by club
SELECT c.name, COUNT(ci.*) as invitation_count
FROM clubs c
LEFT JOIN club_invitations ci ON ci.club_id = c.id
GROUP BY c.id, c.name
ORDER BY invitation_count DESC;
```

---

## Common Issues & Solutions

### Issue: "Cannot read property 'map' of undefined"

**Cause:** userClubs not loaded yet

**Solution:** Check useAuth hook is properly loading clubs
```javascript
// In useAuth.jsx, verify loadUserClubsData() is called
```

### Issue: RLS policy error when sending invitation

**Cause:** User is not a club admin

**Solution:** Verify club_members entry:
```sql
SELECT * FROM club_members
WHERE user_id = '<user-id>' AND role = 'club_admin';
```

### Issue: Invitation not appearing for user

**Cause:** Email mismatch or expired

**Solution:** Check exact email:
```sql
SELECT invitee_email, expires_at, status
FROM club_invitations
WHERE invitee_email ILIKE '%user-email%';
```

### Issue: Cannot create team under club

**Cause:** User not a member

**Solution:** Verify membership:
```sql
SELECT * FROM club_members WHERE user_id = '<user-id>';
```

---

## Performance Testing

### Load Test: Many Invitations

1. Create 50+ club invitations
2. Login as invited user
3. Check page load time
4. Verify pagination/scrolling works

### Load Test: Many Clubs

1. Create 20+ clubs
2. Add user to all clubs
3. Open TeamSelector → "Create New Team"
4. Check dropdown performance

---

## Checklist

### Database
- [ ] Migration runs without errors
- [ ] Table `club_invitations` exists
- [ ] All 4 RPC functions exist
- [ ] RLS policies work correctly
- [ ] Indexes created

### API Functions
- [ ] All 9 functions work
- [ ] Error handling correct
- [ ] Returns expected data structures

### UI Components
- [ ] PendingClubInvitations displays
- [ ] ClubInvitationManager works
- [ ] CreateClubModal functional
- [ ] TeamSelector shows clubs
- [ ] ClubListView optional component works

### User Flows
- [ ] Invite → Accept → Join flow works
- [ ] Create team under club works
- [ ] Create independent team works
- [ ] Decline invitation works
- [ ] Cancel invitation works

### Security
- [ ] RLS policies enforced
- [ ] Email validation works
- [ ] Role enforcement works
- [ ] Token security verified

### Edge Cases
- [ ] Expired invitations handled
- [ ] Duplicate invitations blocked
- [ ] Empty states shown correctly
- [ ] Error messages displayed

---

## Success Criteria

✅ All test scenarios pass
✅ No console errors
✅ Database queries return expected results
✅ UI is responsive and intuitive
✅ Security policies enforced
✅ Backward compatibility maintained

---

## Support

If tests fail:
1. Check browser console for errors
2. Check Supabase logs
3. Verify migration ran successfully
4. Review RLS policies
5. Check user roles and permissions
6. Refer to CLUB_INVITATIONS_IMPLEMENTATION.md
