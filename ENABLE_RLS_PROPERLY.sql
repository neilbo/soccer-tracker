-- Re-enable RLS with proper security policies
-- Run this after confirming team creation works with RLS disabled

-- Re-enable RLS
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies first
DROP POLICY IF EXISTS "teams_all_access" ON public.teams;
DROP POLICY IF EXISTS "team_members_all_access" ON public.team_members;

-- Teams policies
-- Users can see teams they are members of
CREATE POLICY "teams_select" ON public.teams
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = teams.id
        AND tm.user_id = auth.uid()
    )
  );

-- Any authenticated user can create teams
CREATE POLICY "teams_insert" ON public.teams
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Users can update teams they are members of
CREATE POLICY "teams_update" ON public.teams
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = teams.id
        AND tm.user_id = auth.uid()
    )
  );

-- Only team staff can delete teams
CREATE POLICY "teams_delete" ON public.teams
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = teams.id
        AND tm.user_id = auth.uid()
        AND tm.role = 'team_staff'
    )
  );

-- Team members policies
-- Users can see all team members
CREATE POLICY "team_members_select" ON public.team_members
  FOR SELECT
  USING (true);

-- Any authenticated user can join teams (via invitations handled in app logic)
CREATE POLICY "team_members_insert" ON public.team_members
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Users can only update their own membership
CREATE POLICY "team_members_update" ON public.team_members
  FOR UPDATE
  USING (user_id = auth.uid());

-- Users can only delete their own membership
CREATE POLICY "team_members_delete" ON public.team_members
  FOR DELETE
  USING (user_id = auth.uid());

-- Verify policies are set up correctly
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
