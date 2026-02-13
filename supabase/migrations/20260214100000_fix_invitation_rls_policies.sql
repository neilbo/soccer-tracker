-- Fix RLS policies for invitations to allow super admins
-- The super admin check was looking at the wrong table

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Super admins have full access to club invitations" ON public.club_invitations;
DROP POLICY IF EXISTS "Club admins can manage club invitations" ON public.club_invitations;

-- Recreate club_invitations policies with correct super admin check
CREATE POLICY "Club admins can manage club invitations"
  ON public.club_invitations
  FOR ALL
  USING (
    club_id IN (
      SELECT club_id FROM public.club_members
      WHERE user_id = auth.uid() AND role = 'club_admin'
    )
    OR
    is_super_admin(auth.uid())
  )
  WITH CHECK (
    club_id IN (
      SELECT club_id FROM public.club_members
      WHERE user_id = auth.uid() AND role = 'club_admin'
    )
    OR
    is_super_admin(auth.uid())
  );

-- Fix team invitations policy if it exists
DO $$
BEGIN
  -- Check if the policy needs updating for team invitations
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'invitations'
    AND policyname = 'Team staff can create invitations'
  ) THEN
    -- Drop and recreate with proper WITH CHECK clause
    DROP POLICY IF EXISTS "Team staff can create invitations" ON public.invitations;

    CREATE POLICY "Team staff can create invitations"
      ON public.invitations FOR INSERT
      WITH CHECK (
        team_id IN (
          SELECT tm.team_id FROM public.team_members tm
          WHERE tm.user_id = auth.uid()
          AND tm.role = 'team_staff'
        )
        OR
        is_super_admin(auth.uid())
      );
  END IF;
END $$;
