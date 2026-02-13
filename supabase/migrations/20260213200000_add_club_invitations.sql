-- Create club_invitations table
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
  accepted_at TIMESTAMPTZ,
  UNIQUE(club_id, invitee_email, status) WHERE status = 'pending'
);

-- Add indexes for performance
CREATE INDEX idx_club_invitations_club_id ON club_invitations(club_id);
CREATE INDEX idx_club_invitations_invitee_email ON club_invitations(invitee_email);
CREATE INDEX idx_club_invitations_token ON club_invitations(token);
CREATE INDEX idx_club_invitations_status ON club_invitations(status);

-- Enable RLS
ALTER TABLE club_invitations ENABLE ROW LEVEL SECURITY;

-- Club admins can view and create invitations for their clubs
CREATE POLICY "Club admins can manage club invitations"
  ON club_invitations
  FOR ALL
  USING (
    club_id IN (
      SELECT club_id FROM club_members
      WHERE user_id = auth.uid() AND role = 'club_admin'
    )
  );

-- Users can view invitations sent to their email
CREATE POLICY "Users can view their own invitations"
  ON club_invitations
  FOR SELECT
  USING (invitee_email = auth.email());

-- Users can update (accept/decline) their own invitations
CREATE POLICY "Users can respond to their invitations"
  ON club_invitations
  FOR UPDATE
  USING (invitee_email = auth.email())
  WITH CHECK (invitee_email = auth.email());

-- Super admins have full access
CREATE POLICY "Super admins have full access to club invitations"
  ON club_invitations
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- Function to accept club invitation
CREATE OR REPLACE FUNCTION accept_club_invitation(invitation_token TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_invitation club_invitations;
  v_club_member_id UUID;
BEGIN
  -- Get the invitation
  SELECT * INTO v_invitation
  FROM club_invitations
  WHERE token = invitation_token
    AND status = 'pending'
    AND invitee_email = auth.email()
    AND expires_at > now();

  -- Check if invitation exists and is valid
  IF v_invitation.id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Invalid or expired invitation'
    );
  END IF;

  -- Check if user is already a member
  IF EXISTS (
    SELECT 1 FROM club_members
    WHERE club_id = v_invitation.club_id
      AND user_id = auth.uid()
  ) THEN
    -- Update invitation status
    UPDATE club_invitations
    SET status = 'accepted',
        accepted_at = now()
    WHERE id = v_invitation.id;

    RETURN json_build_object(
      'success', true,
      'message', 'Already a member of this club'
    );
  END IF;

  -- Add user to club_members
  INSERT INTO club_members (club_id, user_id, role)
  VALUES (v_invitation.club_id, auth.uid(), v_invitation.role)
  RETURNING id INTO v_club_member_id;

  -- Update invitation status
  UPDATE club_invitations
  SET status = 'accepted',
      accepted_at = now()
  WHERE id = v_invitation.id;

  RETURN json_build_object(
    'success', true,
    'club_member_id', v_club_member_id,
    'club_id', v_invitation.club_id
  );
END;
$$;

-- Function to get club invitations (for club admins)
CREATE OR REPLACE FUNCTION get_club_invitations(p_club_id UUID)
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
  -- Check if user is a club admin
  IF NOT EXISTS (
    SELECT 1 FROM club_members
    WHERE club_id = p_club_id
      AND user_id = auth.uid()
      AND role = 'club_admin'
  ) AND NOT EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
      AND role = 'super_admin'
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Only club admins can view invitations';
  END IF;

  RETURN QUERY
  SELECT
    ci.id,
    ci.invitee_email,
    ci.role,
    ci.status,
    ci.created_at,
    ci.expires_at,
    u.name as inviter_name
  FROM club_invitations ci
  LEFT JOIN users u ON u.id = ci.inviter_id
  WHERE ci.club_id = p_club_id
  ORDER BY ci.created_at DESC;
END;
$$;

-- Function to get my club invitations
CREATE OR REPLACE FUNCTION get_my_club_invitations()
RETURNS TABLE (
  id UUID,
  club_id UUID,
  club_name TEXT,
  role TEXT,
  status TEXT,
  created_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  inviter_name TEXT,
  token TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ci.id,
    ci.club_id,
    c.name as club_name,
    ci.role,
    ci.status,
    ci.created_at,
    ci.expires_at,
    u.name as inviter_name,
    ci.token
  FROM club_invitations ci
  LEFT JOIN clubs c ON c.id = ci.club_id
  LEFT JOIN users u ON u.id = ci.inviter_id
  WHERE ci.invitee_email = auth.email()
    AND ci.status = 'pending'
    AND ci.expires_at > now()
  ORDER BY ci.created_at DESC;
END;
$$;

-- Function to expire old invitations (can be run as a cron job)
CREATE OR REPLACE FUNCTION expire_old_club_invitations()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE club_invitations
  SET status = 'expired'
  WHERE status = 'pending'
    AND expires_at < now();

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;
