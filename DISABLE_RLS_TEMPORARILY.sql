-- Temporarily disable RLS for testing team creation
-- WARNING: This disables security! Only use for testing!
-- Run ENABLE_RLS_PROPERLY.sql after confirming team creation works

-- Disable RLS on teams and team_members
ALTER TABLE public.teams DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members DISABLE ROW LEVEL SECURITY;

-- Verify RLS is disabled
SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename IN ('teams', 'team_members')
  AND schemaname = 'public';
