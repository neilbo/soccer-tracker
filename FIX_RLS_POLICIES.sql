-- Fix infinite recursion in team_members RLS policies
-- Run this in Supabase SQL Editor

-- Drop problematic policies
DROP POLICY IF EXISTS "team_members_read" ON public.team_members;
DROP POLICY IF EXISTS "team_members_read_own" ON public.team_members;
DROP POLICY IF EXISTS "team_members_read_team" ON public.team_members;
DROP POLICY IF EXISTS "team_members_write" ON public.team_members;

-- Create simple, non-recursive policies
-- Key: Don't reference team_members in team_members policies!

CREATE POLICY "team_members_select" ON public.team_members
  FOR SELECT
  USING (true); -- Allow users to see team members

CREATE POLICY "team_members_insert" ON public.team_members
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL); -- Allow authenticated users to insert

CREATE POLICY "team_members_update" ON public.team_members
  FOR UPDATE
  USING (user_id = auth.uid()); -- Only update own membership

CREATE POLICY "team_members_delete" ON public.team_members
  FOR DELETE
  USING (user_id = auth.uid()); -- Only delete own membership

-- Also simplify teams policy
DROP POLICY IF EXISTS "teams_member_access" ON public.teams;
DROP POLICY IF EXISTS "teams_staff_access" ON public.teams;
DROP POLICY IF EXISTS "teams_club_admin_read" ON public.teams;
DROP POLICY IF EXISTS "teams_super_admin_all" ON public.teams;

CREATE POLICY "teams_select" ON public.teams
  FOR SELECT
  USING (
    -- User is a team member
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = teams.id AND tm.user_id = auth.uid()
    )
  );

CREATE POLICY "teams_insert" ON public.teams
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL); -- Allow any authenticated user to create teams

CREATE POLICY "teams_update" ON public.teams
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = teams.id AND tm.user_id = auth.uid()
    )
  );

CREATE POLICY "teams_delete" ON public.teams
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = teams.id AND tm.user_id = auth.uid() AND tm.role = 'team_staff'
    )
  );

-- Verify policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename IN ('teams', 'team_members')
ORDER BY tablename, policyname;
