-- SQL Script to Create a Team for a User
-- Run this in Supabase SQL Editor

-- Option 1: Replace 'YOUR_EMAIL_HERE' with your actual email
-- Then uncomment and use this:
/*
DO $$
DECLARE
  v_user_id UUID;
  v_team_id UUID;
BEGIN
  -- Get user ID by email
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'YOUR_EMAIL_HERE';

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  -- Create a team
  INSERT INTO teams (title, club_id)
  VALUES ('My First Team', NULL)
  RETURNING id INTO v_team_id;

  -- Add user as team staff
  INSERT INTO team_members (team_id, user_id, role)
  VALUES (v_team_id, v_user_id, 'team_staff');

  RAISE NOTICE 'Team created with ID: %', v_team_id;
END $$;
*/

-- Option 2: Create team for the most recent user
DO $$
DECLARE
  v_user_id UUID;
  v_team_id UUID;
  v_user_email TEXT;
BEGIN
  -- Get the most recent user
  SELECT id, email INTO v_user_id, v_user_email
  FROM auth.users
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No users found';
  END IF;

  -- Check if user already has teams
  IF EXISTS (SELECT 1 FROM team_members WHERE user_id = v_user_id) THEN
    RAISE NOTICE 'User % already has teams', v_user_email;
  ELSE
    -- Create a team
    INSERT INTO teams (title, club_id)
    VALUES ('My First Team', NULL)
    RETURNING id INTO v_team_id;

    -- Add user as team staff
    INSERT INTO team_members (team_id, user_id, role)
    VALUES (v_team_id, v_user_id, 'team_staff');

    RAISE NOTICE 'Team "My First Team" created for user %', v_user_email;
  END IF;
END $$;
