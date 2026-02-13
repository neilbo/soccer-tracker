-- Improve error messages for invitation acceptance
-- This migration updates the accept_invitation and accept_club_invitation functions
-- to provide more specific error messages for better UX

-- Update team invitation acceptance function
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

  -- Get invitation (first check if it exists at all)
  SELECT * INTO invitation_record
  FROM invitations
  WHERE token = invitation_token;

  IF invitation_record.id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Invitation not found');
  END IF;

  -- Check if already accepted
  IF invitation_record.status = 'accepted' THEN
    RETURN json_build_object('success', false, 'error', 'This invitation has already been accepted');
  END IF;

  -- Check if declined
  IF invitation_record.status = 'declined' THEN
    RETURN json_build_object('success', false, 'error', 'This invitation has been declined');
  END IF;

  -- Check if expired
  IF invitation_record.expires_at <= now() THEN
    RETURN json_build_object('success', false, 'error', 'This invitation has expired');
  END IF;

  -- Check if email matches
  IF invitation_record.invitee_email != user_email THEN
    RETURN json_build_object(
      'success', false,
      'error', 'This invitation was sent to ' || invitation_record.invitee_email || '. Please log in with that email address.'
    );
  END IF;

  -- All checks passed, add user to team
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

-- Update club invitation acceptance function
CREATE OR REPLACE FUNCTION accept_club_invitation(invitation_token TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_invitation club_invitations;
  v_club_member_id UUID;
  user_email TEXT;
BEGIN
  -- Get current user's email
  SELECT email INTO user_email FROM auth.users WHERE id = auth.uid();

  IF user_email IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Get the invitation (first check if it exists at all)
  SELECT * INTO v_invitation
  FROM club_invitations
  WHERE token = invitation_token;

  -- Check if invitation exists
  IF v_invitation.id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Invitation not found');
  END IF;

  -- Check if already accepted
  IF v_invitation.status = 'accepted' THEN
    RETURN json_build_object('success', false, 'error', 'This invitation has already been accepted');
  END IF;

  -- Check if declined
  IF v_invitation.status = 'declined' THEN
    RETURN json_build_object('success', false, 'error', 'This invitation has been declined');
  END IF;

  -- Check if expired
  IF v_invitation.expires_at <= now() THEN
    RETURN json_build_object('success', false, 'error', 'This invitation has expired');
  END IF;

  -- Check if email matches
  IF v_invitation.invitee_email != user_email THEN
    RETURN json_build_object(
      'success', false,
      'error', 'This invitation was sent to ' || v_invitation.invitee_email || '. Please log in with that email address.'
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

-- Add comments
COMMENT ON FUNCTION accept_invitation IS 'Accept a team invitation with improved error messages';
COMMENT ON FUNCTION accept_club_invitation IS 'Accept a club invitation with improved error messages';
