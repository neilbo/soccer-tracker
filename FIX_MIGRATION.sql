-- FIXED MIGRATION: Run this instead of the original
-- This version creates all tables FIRST, then adds RLS policies

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- STEP 1: CREATE ALL TABLES (NO POLICIES YET)
-- =====================================================

-- 1. Users table
CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL UNIQUE,
  full_name text,
  name text, -- Add name column for compatibility
  role text DEFAULT 'user', -- Add role column
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Clubs table
CREATE TABLE IF NOT EXISTS public.clubs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Teams table (recreate with UUID)
DROP TABLE IF EXISTS public.teams CASCADE;

CREATE TABLE public.teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid REFERENCES public.clubs(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Team members table
CREATE TABLE IF NOT EXISTS public.team_members (
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('team_staff', 'club_admin', 'super_admin')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (team_id, user_id)
);

-- 5. Club members table
CREATE TABLE IF NOT EXISTS public.club_members (
  club_id uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('club_admin', 'team_staff')) DEFAULT 'club_admin',
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (club_id, user_id)
);

-- 6. Players table
DROP TABLE IF EXISTS public.players CASCADE;

CREATE TABLE public.players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  name text NOT NULL,
  sort_order int DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 7. Matches table
DROP TABLE IF EXISTS public.matches CASCADE;

CREATE TABLE public.matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  opponent text,
  opponent_club_id uuid REFERENCES public.clubs(id) ON DELETE SET NULL,
  venue text DEFAULT 'home',
  date text,
  description text,
  tag text,
  status text DEFAULT 'setup',
  team_goals int DEFAULT 0,
  opponent_goals int DEFAULT 0,
  match_seconds int DEFAULT 0,
  match_running boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 8. Match players table
CREATE TABLE IF NOT EXISTS public.match_players (
  match_id uuid NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  player_id uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  player_name text NOT NULL,
  seconds int DEFAULT 0,
  starting boolean DEFAULT false,
  goals int DEFAULT 0,
  assists int DEFAULT 0,
  notes text,
  events jsonb DEFAULT '[]'::jsonb,
  position_role text,
  position_side text,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (match_id, player_id)
);

-- =====================================================
-- STEP 2: ENABLE RLS ON ALL TABLES
-- =====================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_players ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 3: CREATE RLS POLICIES (NOW ALL TABLES EXIST)
-- =====================================================

-- Users policies
CREATE POLICY "users_read_own" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Clubs policies
CREATE POLICY "clubs_member_read" ON public.clubs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.club_members WHERE club_id = id AND user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.teams t
      INNER JOIN public.team_members tm ON t.id = tm.team_id
      WHERE t.club_id = clubs.id AND tm.user_id = auth.uid()
    )
  );

CREATE POLICY "clubs_all_access" ON public.clubs
  FOR ALL USING (true); -- Temporary: allow all access

-- Teams policies
CREATE POLICY "teams_member_access" ON public.teams
  FOR ALL USING (
    id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid())
  );

-- Team members policies
CREATE POLICY "team_members_read_own" ON public.team_members
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "team_members_read_team" ON public.team_members
  FOR SELECT USING (
    team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid())
  );

-- Club members policies
CREATE POLICY "club_members_read_own" ON public.club_members
  FOR SELECT USING (user_id = auth.uid());

-- Players policies
CREATE POLICY "players_team_access" ON public.players
  FOR ALL USING (
    team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid())
  );

-- Matches policies
CREATE POLICY "matches_team_access" ON public.matches
  FOR ALL USING (
    team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid())
  );

-- Match players policies
CREATE POLICY "match_players_access" ON public.match_players
  FOR ALL USING (
    match_id IN (
      SELECT m.id FROM public.matches m
      INNER JOIN public.team_members tm ON m.team_id = tm.team_id
      WHERE tm.user_id = auth.uid()
    )
  );

-- =====================================================
-- STEP 4: CREATE FUNCTIONS
-- =====================================================

-- Function to check if user is super admin
CREATE OR REPLACE FUNCTION is_super_admin(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = user_id AND role = 'super_admin'
  );
END;
$$;

-- Function to get user's teams
CREATE OR REPLACE FUNCTION get_user_teams(user_id uuid)
RETURNS TABLE (
  team_id uuid,
  team_title text,
  club_id uuid,
  club_name text,
  role text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id as team_id,
    t.title as team_title,
    t.club_id,
    c.name as club_name,
    tm.role
  FROM public.teams t
  INNER JOIN public.team_members tm ON t.id = tm.team_id
  LEFT JOIN public.clubs c ON t.club_id = c.id
  WHERE tm.user_id = get_user_teams.user_id
  ORDER BY t.title;
END;
$$;

-- =====================================================
-- STEP 5: CREATE TRIGGER FOR USER SYNC
-- =====================================================

-- Trigger function to sync auth.users to public.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'full_name'
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    name = EXCLUDED.name,
    updated_at = now();
  RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- SUCCESS!
-- =====================================================

-- Verify all tables exist
SELECT 'Migration complete! Tables created:' as status;
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('users', 'clubs', 'teams', 'team_members', 'club_members', 'players', 'matches', 'match_players')
ORDER BY table_name;
