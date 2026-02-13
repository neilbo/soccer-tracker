-- Secure Organizations (clubs table) for Super Admin only access
-- Run this in Supabase SQL Editor

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "clubs_all_access" ON public.clubs;

-- Allow all authenticated users to read organizations (for signup/team creation)
CREATE POLICY "clubs_select_authenticated" ON public.clubs
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Only super admins can create organizations
CREATE POLICY "clubs_insert_super_admin" ON public.clubs
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE user_id = auth.uid() AND role = 'super_admin'
    )
  );

-- Only super admins can update organizations
CREATE POLICY "clubs_update_super_admin" ON public.clubs
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE user_id = auth.uid() AND role = 'super_admin'
    )
  );

-- Only super admins can delete organizations
CREATE POLICY "clubs_delete_super_admin" ON public.clubs
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE user_id = auth.uid() AND role = 'super_admin'
    )
  );

-- Verify the policies
SELECT
  tablename,
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'clubs' AND schemaname = 'public'
ORDER BY policyname;
