-- Comprehensive RLS fix for ALL tables
-- This removes all complex policies and creates simple permissive ones

-- ============================================================================
-- 1. TEAMS & TEAM_MEMBERS (already fixed, but including for completeness)
-- ============================================================================

-- Drop all policies on teams
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'teams' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.teams';
    END LOOP;
END $$;

-- Drop all policies on team_members
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'team_members' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.team_members';
    END LOOP;
END $$;

-- Enable RLS
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- Simple policies for teams
CREATE POLICY "teams_all_access" ON public.teams
  FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Simple policies for team_members
CREATE POLICY "team_members_all_access" ON public.team_members
  FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================================
-- 2. PLAYERS
-- ============================================================================

-- Drop all policies on players
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'players' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.players';
    END LOOP;
END $$;

-- Enable RLS
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;

-- Simple policy for players - any authenticated user can do anything
CREATE POLICY "players_all_access" ON public.players
  FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================================
-- 3. MATCHES
-- ============================================================================

-- Drop all policies on matches
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'matches' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.matches';
    END LOOP;
END $$;

-- Enable RLS
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

-- Simple policy for matches - any authenticated user can do anything
CREATE POLICY "matches_all_access" ON public.matches
  FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================================
-- 4. MATCH_PLAYERS
-- ============================================================================

-- Drop all policies on match_players
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'match_players' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.match_players';
    END LOOP;
END $$;

-- Enable RLS
ALTER TABLE public.match_players ENABLE ROW LEVEL SECURITY;

-- Simple policy for match_players - any authenticated user can do anything
CREATE POLICY "match_players_all_access" ON public.match_players
  FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================================
-- 5. CLUBS & CLUB_MEMBERS
-- ============================================================================

-- Drop all policies on clubs
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'clubs' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.clubs';
    END LOOP;
END $$;

-- Drop all policies on club_members
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'club_members' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.club_members';
    END LOOP;
END $$;

-- Enable RLS
ALTER TABLE public.clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_members ENABLE ROW LEVEL SECURITY;

-- Simple policies for clubs
CREATE POLICY "clubs_all_access" ON public.clubs
  FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Simple policies for club_members
CREATE POLICY "club_members_all_access" ON public.club_members
  FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================================
-- 6. USERS
-- ============================================================================

-- Drop all policies on users
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'users' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.users';
    END LOOP;
END $$;

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Simple policies for users
CREATE POLICY "users_all_access" ON public.users
  FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================================
-- 7. APP_STATE (if exists)
-- ============================================================================

DO $$
DECLARE
    r RECORD;
BEGIN
    -- Only if table exists
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'app_state') THEN
        -- Drop all policies on app_state
        FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'app_state' AND schemaname = 'public') LOOP
            EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.app_state';
        END LOOP;

        -- Enable RLS
        ALTER TABLE public.app_state ENABLE ROW LEVEL SECURITY;

        -- Simple policy
        CREATE POLICY "app_state_all_access" ON public.app_state
          FOR ALL
          USING (auth.uid() IS NOT NULL)
          WITH CHECK (auth.uid() IS NOT NULL);
    END IF;
END $$;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Show all policies to verify
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
WHERE schemaname = 'public'
  AND tablename IN ('teams', 'team_members', 'players', 'matches', 'match_players', 'clubs', 'club_members', 'users', 'app_state')
ORDER BY tablename, policyname;

-- Show RLS status for all tables
SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('teams', 'team_members', 'players', 'matches', 'match_players', 'clubs', 'club_members', 'users', 'app_state')
ORDER BY tablename;
