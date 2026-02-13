-- Function to get invitation details by token (for public invitation links)
-- This function bypasses RLS to allow non-authenticated or any user to view invitation details
CREATE OR REPLACE FUNCTION get_invitation_by_token(invitation_token TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
  team_invite_record RECORD;
  club_invite_record RECORD;
BEGIN
  -- Try to find team invitation first
  SELECT
    i.id,
    i.team_id,
    i.invitee_email,
    i.role,
    i.status,
    i.created_at,
    i.expires_at,
    i.token,
    t.title as team_name,
    COALESCE(u.full_name, u.email) as inviter_name
  INTO team_invite_record
  FROM invitations i
  JOIN teams t ON i.team_id = t.id
  LEFT JOIN users u ON i.inviter_id = u.id
  WHERE i.token = invitation_token
  AND i.status = 'pending'
  AND i.expires_at > now();

  IF team_invite_record.id IS NOT NULL THEN
    RETURN json_build_object(
      'type', 'team',
      'id', team_invite_record.id,
      'team_id', team_invite_record.team_id,
      'team_name', team_invite_record.team_name,
      'invitee_email', team_invite_record.invitee_email,
      'role', team_invite_record.role,
      'status', team_invite_record.status,
      'created_at', team_invite_record.created_at,
      'expires_at', team_invite_record.expires_at,
      'inviter_name', team_invite_record.inviter_name,
      'token', team_invite_record.token
    );
  END IF;

  -- Try to find club invitation
  SELECT
    i.id,
    i.club_id,
    i.invitee_email,
    i.role,
    i.status,
    i.created_at,
    i.expires_at,
    i.token,
    c.name as club_name,
    COALESCE(u.full_name, u.email) as inviter_name
  INTO club_invite_record
  FROM club_invitations i
  JOIN clubs c ON i.club_id = c.id
  LEFT JOIN users u ON i.inviter_id = u.id
  WHERE i.token = invitation_token
  AND i.status = 'pending'
  AND i.expires_at > now();

  IF club_invite_record.id IS NOT NULL THEN
    RETURN json_build_object(
      'type', 'club',
      'id', club_invite_record.id,
      'club_id', club_invite_record.club_id,
      'club_name', club_invite_record.club_name,
      'invitee_email', club_invite_record.invitee_email,
      'role', club_invite_record.role,
      'status', club_invite_record.status,
      'created_at', club_invite_record.created_at,
      'expires_at', club_invite_record.expires_at,
      'inviter_name', club_invite_record.inviter_name,
      'token', club_invite_record.token
    );
  END IF;

  -- No invitation found
  RETURN json_build_object('error', 'Invitation not found or expired');
END;
$$;

-- Grant execute permission to all users (authenticated and anonymous)
-- This is safe because the function only returns public invitation info
GRANT EXECUTE ON FUNCTION get_invitation_by_token(TEXT) TO authenticated, anon;

-- Add comment
COMMENT ON FUNCTION get_invitation_by_token IS 'Get invitation details by token for public invitation links. Bypasses RLS for read-only access.';
