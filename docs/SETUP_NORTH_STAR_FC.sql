-- Setup Organizations (All clubs available in backend)
-- Note: Only "North Star FC" will be shown in signup dropdown (frontend filter)
-- But all clubs are available for admin operations and future use

-- Step 1: Delete all existing clubs (optional - only if starting fresh)
-- WARNING: This will delete ALL clubs and their associated data
-- DELETE FROM public.clubs;

-- Step 2: Create all organizations
INSERT INTO public.clubs (name) VALUES
  ('North Star FC'),          -- Only this will show in signup
  ('Brighton Bulldogs'),
  ('Coolum FC'),
  ('Grange Thistle'),
  ('Ipswich Knights'),
  ('Moreton City Excelsior'),
  ('Noosa Lions'),
  ('North Lakes United'),
  ('Pine Hills FC'),
  ('Samford Rangers'),
  ('SWQ Thunder'),
  ('The Gap FC'),
  ('UQFC')
ON CONFLICT DO NOTHING;

-- Step 3: Verify all clubs were created
SELECT id, name, created_at
FROM public.clubs
ORDER BY name;

-- Expected result: All 13 clubs shown
-- But signup will only allow "North Star FC" selection
