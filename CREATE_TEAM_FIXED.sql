-- Step 1: Sync all existing auth.users to public.users
INSERT INTO public.users (id, email, full_name, name)
SELECT
  id,
  email,
  raw_user_meta_data->>'full_name',
  raw_user_meta_data->>'full_name'
FROM auth.users
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  name = EXCLUDED.name,
  updated_at = now();

-- Step 2: Create team for the most recent user
DO $$
DECLARE
  v_user_id UUID;
  v_team_id UUID;
  v_email TEXT;
BEGIN
  -- Get the most recent user from auth.users
  SELECT id, email INTO v_user_id, v_email
  FROM auth.users
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No users found';
  END IF;

  -- Verify user exists in public.users (should exist now after step 1)
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = v_user_id) THEN
    RAISE EXCEPTION 'User not synced to public.users table';
  END IF;

  -- Create a team
  INSERT INTO teams (title, club_id)
  VALUES ('My First Team', NULL)
  RETURNING id INTO v_team_id;

  -- Add user as team staff
  INSERT INTO team_members (team_id, user_id, role)
  VALUES (v_team_id, v_user_id, 'team_staff');

  RAISE NOTICE 'Success! Team created for user: %', v_email;
  RAISE NOTICE 'Team ID: %', v_team_id;
END $$;

-- Step 3: Verify the setup
SELECT
  'Setup complete!' as status,
  u.email,
  t.title as team_name,
  tm.role
FROM team_members tm
JOIN users u ON u.id = tm.user_id
JOIN teams t ON t.id = tm.team_id
ORDER BY tm.created_at DESC
LIMIT 5;
