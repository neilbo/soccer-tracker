-- Quick Fix: Create a team for the most recent user
-- Copy and paste this into Supabase Dashboard > SQL Editor

DO $$
DECLARE
  v_user_id UUID;
  v_team_id UUID;
BEGIN
  -- Get the most recent user ID
  SELECT id INTO v_user_id
  FROM auth.users
  ORDER BY created_at DESC
  LIMIT 1;

  -- Create a team
  INSERT INTO teams (title, club_id)
  VALUES ('My First Team', NULL)
  RETURNING id INTO v_team_id;

  -- Add user as team staff
  INSERT INTO team_members (team_id, user_id, role)
  VALUES (v_team_id, v_user_id, 'team_staff');

  RAISE NOTICE 'Success! Team created with ID: %', v_team_id;
END $$;

-- After running this, refresh your browser
