-- Make a user a Super Admin
-- Replace 'your-email@example.com' with the actual email

-- First, check current user roles
SELECT
  u.email,
  tm.role,
  t.title as team_name
FROM public.users u
LEFT JOIN public.team_members tm ON u.id = tm.user_id
LEFT JOIN public.teams t ON tm.team_id = t.id
WHERE u.email = 'your-email@example.com';

-- Update user to super_admin (replace email)
UPDATE public.team_members
SET role = 'super_admin'
WHERE user_id = (
  SELECT id FROM public.users WHERE email = 'your-email@example.com'
);

-- If user has no team memberships yet, you need to add them to a team first
-- Or create a dummy team membership with super_admin role

-- Verify the update
SELECT
  u.email,
  tm.role,
  t.title as team_name
FROM public.users u
LEFT JOIN public.team_members tm ON u.id = tm.user_id
LEFT JOIN public.teams t ON tm.team_id = t.id
WHERE u.email = 'your-email@example.com';
