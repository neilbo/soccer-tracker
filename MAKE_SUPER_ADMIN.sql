-- Make the current/most recent user a super admin

-- Option 1: Make the most recent user a super admin
UPDATE public.users
SET role = 'super_admin',
    updated_at = now()
WHERE id = (
  SELECT id FROM auth.users
  ORDER BY created_at DESC
  LIMIT 1
);

-- Verify it worked
SELECT
  'Success! You are now a super admin!' as status,
  email,
  name,
  role,
  created_at
FROM public.users
WHERE role = 'super_admin'
ORDER BY created_at DESC;
