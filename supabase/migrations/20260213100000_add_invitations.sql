-- Team invitations table
CREATE TABLE IF NOT EXISTS invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  inviter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invitee_email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('team_staff', 'club_admin')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '7 days'),
  accepted_at TIMESTAMPTZ,
  UNIQUE(team_id, invitee_email, status)
);

-- Create index for faster lookups
CREATE INDEX idx_invitations_team_id ON invitations(team_id);
CREATE INDEX idx_invitations_invitee_email ON invitations(invitee_email);
CREATE INDEX idx_invitations_token ON invitations(token);
CREATE INDEX idx_invitations_status ON invitations(status);

-- RLS policies for invitations
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- Policy: Team staff can view invitations for their team
CREATE POLICY "Team staff can view team invitations"
  ON invitations FOR SELECT
  USING (
    team_id IN (
      SELECT tm.team_id FROM team_members tm
      WHERE tm.user_id = auth.uid()
      AND tm.role = 'team_staff'
    )
    OR
    is_super_admin(auth.uid())
  );

-- Policy: Team staff can create invitations for their team
CREATE POLICY "Team staff can create invitations"
  ON invitations FOR INSERT
  WITH CHECK (
    team_id IN (
      SELECT tm.team_id FROM team_members tm
      WHERE tm.user_id = auth.uid()
      AND tm.role = 'team_staff'
    )
    OR
    is_super_admin(auth.uid())
  );

-- Policy: Users can view invitations sent to their email
CREATE POLICY "Users can view their own invitations"
  ON invitations FOR SELECT
  USING (
    invitee_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- Policy: Users can update (accept/decline) their own invitations
CREATE POLICY "Users can accept/decline their invitations"
  ON invitations FOR UPDATE
  USING (
    invitee_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    AND status = 'pending'
  );

-- Function to accept an invitation
CREATE OR REPLACE FUNCTION accept_invitation(invitation_token TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  invitation_record invitations;
  user_email TEXT;
  result JSON;
BEGIN
  -- Get current user's email
  SELECT email INTO user_email FROM auth.users WHERE id = auth.uid();

  IF user_email IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Get invitation
  SELECT * INTO invitation_record
  FROM invitations
  WHERE token = invitation_token
  AND status = 'pending'
  AND invitee_email = user_email
  AND expires_at > now();

  IF invitation_record.id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Invalid or expired invitation');
  END IF;

  -- Add user to team
  INSERT INTO team_members (team_id, user_id, role)
  VALUES (invitation_record.team_id, auth.uid(), invitation_record.role)
  ON CONFLICT (team_id, user_id) DO UPDATE
  SET role = EXCLUDED.role;

  -- Mark invitation as accepted
  UPDATE invitations
  SET status = 'accepted', accepted_at = now()
  WHERE id = invitation_record.id;

  RETURN json_build_object(
    'success', true,
    'team_id', invitation_record.team_id,
    'role', invitation_record.role
  );
END;
$$;

-- Function to get invitations for a team
CREATE OR REPLACE FUNCTION get_team_invitations(p_team_id UUID)
RETURNS TABLE (
  id UUID,
  invitee_email TEXT,
  role TEXT,
  status TEXT,
  created_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  inviter_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    i.id,
    i.invitee_email,
    i.role,
    i.status,
    i.created_at,
    i.expires_at,
    COALESCE(u.full_name, u.email) as inviter_name
  FROM invitations i
  LEFT JOIN users u ON i.inviter_id = u.id
  WHERE i.team_id = p_team_id
  AND (
    -- Team staff can see all invitations
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.team_id = p_team_id
      AND tm.user_id = auth.uid()
      AND tm.role = 'team_staff'
    )
    OR
    is_super_admin(auth.uid())
  )
  ORDER BY i.created_at DESC;
END;
$$;

-- Function to get user's pending invitations
CREATE OR REPLACE FUNCTION get_my_invitations()
RETURNS TABLE (
  id UUID,
  team_id UUID,
  team_name TEXT,
  role TEXT,
  created_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  inviter_name TEXT,
  token TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_email TEXT;
BEGIN
  -- Get current user's email
  SELECT email INTO user_email FROM auth.users WHERE id = auth.uid();

  IF user_email IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    i.id,
    i.team_id,
    t.title as team_name,
    i.role,
    i.created_at,
    i.expires_at,
    COALESCE(u.full_name, u.email) as inviter_name,
    i.token
  FROM invitations i
  JOIN teams t ON i.team_id = t.id
  LEFT JOIN users u ON i.inviter_id = u.id
  WHERE i.invitee_email = user_email
  AND i.status = 'pending'
  AND i.expires_at > now()
  ORDER BY i.created_at DESC;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION accept_invitation(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_team_invitations(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_my_invitations() TO authenticated;
