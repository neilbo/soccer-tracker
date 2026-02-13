-- Complete RLS reset for teams and team_members
-- This creates very permissive policies to ensure team creation works

-- Drop ALL existing policies completely
DO $$
DECLARE
    r RECORD;
BEGIN
    -- Drop all policies on teams table
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'teams' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.teams';
    END LOOP;

    -- Drop all policies on team_members table
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'team_members' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.team_members';
    END LOOP;
END $$;

-- Ensure RLS is enabled
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- Create super permissive policies for teams
-- Any authenticated user can do anything (we'll tighten this later)
CREATE POLICY "teams_all_access" ON public.teams
  FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Create super permissive policies for team_members
-- Any authenticated user can do anything (we'll tighten this later)
CREATE POLICY "team_members_all_access" ON public.team_members
  FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Verify the policies were created
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename IN ('teams', 'team_members')
ORDER BY tablename, policyname;
