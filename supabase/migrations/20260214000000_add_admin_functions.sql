-- Super Admin Dashboard Functions
-- Provides system-wide user, invitation, and statistics management for super admins

-- Helper function to check if current user is a super admin
CREATE OR REPLACE FUNCTION is_super_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.team_members
    WHERE team_members.user_id = is_super_admin.user_id
    AND role = 'super_admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 1. Get all users with their team and club memberships
CREATE OR REPLACE FUNCTION get_all_users_admin()
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  full_name TEXT,
  created_at TIMESTAMPTZ,
  team_memberships JSONB,
  club_memberships JSONB,
  is_super_admin BOOLEAN
) AS $$
BEGIN
  -- Check if caller is super admin
  IF NOT is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied. Super admin privileges required.';
  END IF;

  RETURN QUERY
  SELECT
    u.id AS user_id,
    u.email,
    u.full_name,
    u.created_at,
    COALESCE(
      (SELECT jsonb_agg(
        jsonb_build_object(
          'team_id', tm.team_id,
          'team_name', t.title,
          'club_id', t.club_id,
          'club_name', c.name,
          'role', tm.role,
          'joined_at', tm.created_at
        )
      )
      FROM public.team_members tm
      JOIN public.teams t ON tm.team_id = t.id
      LEFT JOIN public.clubs c ON t.club_id = c.id
      WHERE tm.user_id = u.id),
      '[]'::jsonb
    ) AS team_memberships,
    COALESCE(
      (SELECT jsonb_agg(
        jsonb_build_object(
          'club_id', cm.club_id,
          'club_name', c.name,
          'role', cm.role,
          'joined_at', cm.created_at
        )
      )
      FROM public.club_members cm
      JOIN public.clubs c ON cm.club_id = c.id
      WHERE cm.user_id = u.id),
      '[]'::jsonb
    ) AS club_memberships,
    EXISTS (
      SELECT 1 FROM public.team_members tm2
      WHERE tm2.user_id = u.id AND tm2.role = 'super_admin'
    ) AS is_super_admin
  FROM public.users u
  ORDER BY u.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Get all invitations (team and club) system-wide
CREATE OR REPLACE FUNCTION get_all_invitations_admin()
RETURNS TABLE (
  invitation_id UUID,
  invitation_type TEXT,
  invitee_email TEXT,
  inviter_name TEXT,
  inviter_email TEXT,
  team_id UUID,
  team_name TEXT,
  club_id UUID,
  club_name TEXT,
  status TEXT,
  role TEXT,
  created_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ
) AS $$
BEGIN
  -- Check if caller is super admin
  IF NOT is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied. Super admin privileges required.';
  END IF;

  RETURN QUERY
  -- Team invitations
  SELECT
    i.id AS invitation_id,
    'team'::TEXT AS invitation_type,
    i.email AS invitee_email,
    u.full_name AS inviter_name,
    u.email AS inviter_email,
    i.team_id,
    t.title AS team_name,
    t.club_id,
    c.name AS club_name,
    i.status,
    i.role,
    i.created_at,
    i.expires_at
  FROM public.invitations i
  JOIN public.users u ON i.invited_by = u.id
  JOIN public.teams t ON i.team_id = t.id
  LEFT JOIN public.clubs c ON t.club_id = c.id

  UNION ALL

  -- Club invitations
  SELECT
    ci.id AS invitation_id,
    'club'::TEXT AS invitation_type,
    ci.email AS invitee_email,
    u.full_name AS inviter_name,
    u.email AS inviter_email,
    NULL::UUID AS team_id,
    NULL::TEXT AS team_name,
    ci.club_id,
    c.name AS club_name,
    ci.status,
    ci.role,
    ci.created_at,
    ci.expires_at
  FROM public.club_invitations ci
  JOIN public.users u ON ci.invited_by = u.id
  JOIN public.clubs c ON ci.club_id = c.id

  ORDER BY created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Remove user from a team
CREATE OR REPLACE FUNCTION remove_user_from_team_admin(p_user_id UUID, p_team_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if caller is super admin
  IF NOT is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied. Super admin privileges required.';
  END IF;

  -- Delete the team membership
  DELETE FROM public.team_members
  WHERE user_id = p_user_id AND team_id = p_team_id;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Remove user from a club
CREATE OR REPLACE FUNCTION remove_user_from_club_admin(p_user_id UUID, p_club_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if caller is super admin
  IF NOT is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied. Super admin privileges required.';
  END IF;

  -- Delete the club membership
  DELETE FROM public.club_members
  WHERE user_id = p_user_id AND club_id = p_club_id;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Update user role in a team
CREATE OR REPLACE FUNCTION update_user_role_admin(p_user_id UUID, p_team_id UUID, p_new_role TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if caller is super admin
  IF NOT is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied. Super admin privileges required.';
  END IF;

  -- Validate role
  IF p_new_role NOT IN ('team_staff', 'club_admin', 'super_admin') THEN
    RAISE EXCEPTION 'Invalid role. Must be team_staff, club_admin, or super_admin.';
  END IF;

  -- Update the role
  UPDATE public.team_members
  SET role = p_new_role
  WHERE user_id = p_user_id AND team_id = p_team_id;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Get system statistics
CREATE OR REPLACE FUNCTION get_system_stats_admin()
RETURNS JSONB AS $$
DECLARE
  stats JSONB;
BEGIN
  -- Check if caller is super admin
  IF NOT is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied. Super admin privileges required.';
  END IF;

  SELECT jsonb_build_object(
    'total_users', (SELECT COUNT(*) FROM public.users),
    'total_teams', (SELECT COUNT(*) FROM public.teams),
    'total_clubs', (SELECT COUNT(*) FROM public.clubs),
    'total_matches', (SELECT COUNT(*) FROM public.matches),
    'active_matches', (SELECT COUNT(*) FROM public.matches WHERE status = 'active'),
    'completed_matches', (SELECT COUNT(*) FROM public.matches WHERE status = 'completed'),
    'pending_team_invitations', (SELECT COUNT(*) FROM public.invitations WHERE status = 'pending'),
    'pending_club_invitations', (SELECT COUNT(*) FROM public.club_invitations WHERE status = 'pending'),
    'total_invitations', (
      SELECT COUNT(*) FROM (
        SELECT id FROM public.invitations
        UNION ALL
        SELECT id FROM public.club_invitations
      ) all_invites
    ),
    'super_admins', (
      SELECT COUNT(DISTINCT user_id) FROM public.team_members WHERE role = 'super_admin'
    ),
    'last_updated', NOW()
  ) INTO stats;

  RETURN stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions to authenticated users (functions handle their own security)
GRANT EXECUTE ON FUNCTION is_super_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_users_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_invitations_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION remove_user_from_team_admin(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION remove_user_from_club_admin(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_role_admin(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_system_stats_admin() TO authenticated;
