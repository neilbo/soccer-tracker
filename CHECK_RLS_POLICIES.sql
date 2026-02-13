-- Check if RLS policies were updated correctly

-- 1. Check players policies (should have "players_all_access")
SELECT
  tablename,
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'players' AND schemaname = 'public';

-- 2. Check if RLS is enabled (should be true)
SELECT
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename = 'players' AND schemaname = 'public';

-- Expected result:
-- Should see ONE policy named "players_all_access" with cmd = "ALL"
-- rowsecurity should be true
