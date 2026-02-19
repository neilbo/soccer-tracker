-- Migration: Allow unauthenticated users to read clubs for signup
-- Description: Adds a policy so users can see available organizations during signup

-- Add policy to allow anonymous users to read clubs (for signup flow)
CREATE POLICY "clubs_anonymous_read" ON public.clubs
  FOR SELECT
  TO anon
  USING (true);

-- Add policy to allow authenticated users without membership to read clubs (for team creation)
CREATE POLICY "clubs_authenticated_read" ON public.clubs
  FOR SELECT
  TO authenticated
  USING (true);

-- Comment for documentation
COMMENT ON POLICY "clubs_anonymous_read" ON public.clubs IS 'Allows unauthenticated users to see available clubs during signup';
COMMENT ON POLICY "clubs_authenticated_read" ON public.clubs IS 'Allows all authenticated users to see clubs for team creation';
