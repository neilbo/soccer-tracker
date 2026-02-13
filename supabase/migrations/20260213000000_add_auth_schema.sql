-- Migration: Add authentication and authorization schema
-- Description: Creates tables for multi-tenant auth with roles and permissions

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL UNIQUE,
  full_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Users can read their own data
CREATE POLICY "users_read_own" ON public.users
  FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 2. Clubs table (parent organization with many teams)
CREATE TABLE IF NOT EXISTS public.clubs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on clubs
ALTER TABLE public.clubs ENABLE ROW LEVEL SECURITY;

-- Club members and super admins can see clubs
CREATE POLICY "clubs_member_read" ON public.clubs
  FOR SELECT
  USING (
    -- User is a club member
    EXISTS (
      SELECT 1 FROM public.club_members
      WHERE club_id = id AND user_id = auth.uid()
    )
    OR
    -- User is a team member of any team in this club
    EXISTS (
      SELECT 1 FROM public.teams t
      INNER JOIN public.team_members tm ON t.id = tm.team_id
      WHERE t.club_id = clubs.id AND tm.user_id = auth.uid()
    )
    OR
    -- User is a super admin
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE user_id = auth.uid() AND role = 'super_admin'
    )
  );

-- Only super admins can insert/update/delete clubs
CREATE POLICY "clubs_super_admin_all" ON public.clubs
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE user_id = auth.uid() AND role = 'super_admin'
    )
  );

-- 3. Recreate teams table with UUID and club relationship
-- First, drop existing teams table (will cascade to players, matches)
DROP TABLE IF EXISTS public.teams CASCADE;

CREATE TABLE public.teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid REFERENCES public.clubs(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on teams
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

-- Team staff can see/edit their teams
CREATE POLICY "teams_staff_access" ON public.teams
  FOR ALL
  USING (
    id IN (
      SELECT team_id FROM public.team_members
      WHERE user_id = auth.uid() AND role = 'team_staff'
    )
  );

-- Club admins can see (read-only) all teams in their club
CREATE POLICY "teams_club_admin_read" ON public.teams
  FOR SELECT
  USING (
    club_id IN (
      SELECT club_id FROM public.club_members
      WHERE user_id = auth.uid() AND role = 'club_admin'
    )
  );

-- Super admins can see/edit all teams
CREATE POLICY "teams_super_admin_all" ON public.teams
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE user_id = auth.uid() AND role = 'super_admin'
    )
  );

-- 4. Team members table (many-to-many: users can be on multiple teams)
CREATE TABLE IF NOT EXISTS public.team_members (
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('team_staff', 'club_admin', 'super_admin')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (team_id, user_id)
);

-- Enable RLS on team_members
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- Users can see their own team memberships
CREATE POLICY "team_members_read_own" ON public.team_members
  FOR SELECT
  USING (user_id = auth.uid());

-- Team staff can see other members of their teams
CREATE POLICY "team_members_read_team" ON public.team_members
  FOR SELECT
  USING (
    team_id IN (
      SELECT team_id FROM public.team_members
      WHERE user_id = auth.uid()
    )
  );

-- Super admins can manage all team memberships
CREATE POLICY "team_members_super_admin_all" ON public.team_members
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE user_id = auth.uid() AND role = 'super_admin'
    )
  );

-- 5. Club members table (for club admin assignments)
CREATE TABLE IF NOT EXISTS public.club_members (
  club_id uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role = 'club_admin') DEFAULT 'club_admin',
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (club_id, user_id)
);

-- Enable RLS on club_members
ALTER TABLE public.club_members ENABLE ROW LEVEL SECURITY;

-- Users can see their own club memberships
CREATE POLICY "club_members_read_own" ON public.club_members
  FOR SELECT
  USING (user_id = auth.uid());

-- Super admins can manage all club memberships
CREATE POLICY "club_members_super_admin_all" ON public.club_members
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE user_id = auth.uid() AND role = 'super_admin'
    )
  );

-- 6. Recreate players table with UUID team_id
DROP TABLE IF EXISTS public.players CASCADE;

CREATE TABLE public.players (
  id bigint PRIMARY KEY,
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  name text NOT NULL,
  sort_order int NOT NULL DEFAULT 0
);

-- Enable RLS on players
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;

-- Team staff can manage players on their teams
CREATE POLICY "players_staff_access" ON public.players
  FOR ALL
  USING (
    team_id IN (
      SELECT team_id FROM public.team_members
      WHERE user_id = auth.uid() AND role = 'team_staff'
    )
  );

-- Club admins can view players (read-only)
CREATE POLICY "players_club_admin_read" ON public.players
  FOR SELECT
  USING (
    team_id IN (
      SELECT t.id FROM public.teams t
      INNER JOIN public.club_members cm ON t.club_id = cm.club_id
      WHERE cm.user_id = auth.uid()
    )
  );

-- Super admins have full access
CREATE POLICY "players_super_admin_all" ON public.players
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE user_id = auth.uid() AND role = 'super_admin'
    )
  );

-- 7. Recreate matches table with UUID team_id
DROP TABLE IF EXISTS public.matches CASCADE;

CREATE TABLE public.matches (
  id bigint PRIMARY KEY,
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  opponent text NOT NULL,
  venue text NOT NULL CHECK (venue IN ('home', 'away')),
  date text NOT NULL,
  description text NOT NULL DEFAULT '',
  tag text NOT NULL DEFAULT '',
  status text NOT NULL CHECK (status IN ('setup', 'live', 'completed')),
  team_goals int NOT NULL DEFAULT 0,
  opponent_goals int NOT NULL DEFAULT 0,
  match_seconds int NOT NULL DEFAULT 0,
  match_running boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_matches_team_date ON public.matches(team_id, date DESC);

-- Enable RLS on matches
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

-- Team staff can manage matches on their teams
CREATE POLICY "matches_staff_access" ON public.matches
  FOR ALL
  USING (
    team_id IN (
      SELECT team_id FROM public.team_members
      WHERE user_id = auth.uid() AND role = 'team_staff'
    )
  );

-- Club admins can view matches (read-only)
CREATE POLICY "matches_club_admin_read" ON public.matches
  FOR SELECT
  USING (
    team_id IN (
      SELECT t.id FROM public.teams t
      INNER JOIN public.club_members cm ON t.club_id = cm.club_id
      WHERE cm.user_id = auth.uid()
    )
  );

-- Super admins have full access
CREATE POLICY "matches_super_admin_all" ON public.matches
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE user_id = auth.uid() AND role = 'super_admin'
    )
  );

-- 8. Recreate match_players table with position columns
DROP TABLE IF EXISTS public.match_players CASCADE;

CREATE TABLE public.match_players (
  match_id bigint NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  player_id bigint NOT NULL,
  player_name text NOT NULL DEFAULT '',
  seconds int NOT NULL DEFAULT 0,
  starting boolean NOT NULL DEFAULT false,
  goals int NOT NULL DEFAULT 0,
  assists int NOT NULL DEFAULT 0,
  notes text NOT NULL DEFAULT '',
  events jsonb NOT NULL DEFAULT '[]',
  position_role text,
  position_side text,
  PRIMARY KEY (match_id, player_id)
);

CREATE INDEX idx_match_players_match ON public.match_players(match_id);

-- Enable RLS on match_players
ALTER TABLE public.match_players ENABLE ROW LEVEL SECURITY;

-- Team staff can manage match players
CREATE POLICY "match_players_staff_access" ON public.match_players
  FOR ALL
  USING (
    match_id IN (
      SELECT m.id FROM public.matches m
      INNER JOIN public.team_members tm ON m.team_id = tm.team_id
      WHERE tm.user_id = auth.uid() AND tm.role = 'team_staff'
    )
  );

-- Club admins can view match players (read-only)
CREATE POLICY "match_players_club_admin_read" ON public.match_players
  FOR SELECT
  USING (
    match_id IN (
      SELECT m.id FROM public.matches m
      INNER JOIN public.teams t ON m.team_id = t.id
      INNER JOIN public.club_members cm ON t.club_id = cm.club_id
      WHERE cm.user_id = auth.uid()
    )
  );

-- Super admins have full access
CREATE POLICY "match_players_super_admin_all" ON public.match_players
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE user_id = auth.uid() AND role = 'super_admin'
    )
  );

-- 9. Recreate app_state table (now stores state per team, not per user)
DROP TABLE IF EXISTS public.app_state CASCADE;

CREATE TABLE public.app_state (
  id uuid PRIMARY KEY REFERENCES public.teams(id) ON DELETE CASCADE,
  data jsonb NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on app_state
ALTER TABLE public.app_state ENABLE ROW LEVEL SECURITY;

-- Team staff can manage their team's app state
CREATE POLICY "app_state_staff_access" ON public.app_state
  FOR ALL
  USING (
    id IN (
      SELECT team_id FROM public.team_members
      WHERE user_id = auth.uid() AND role = 'team_staff'
    )
  );

-- Club admins can view app state (read-only)
CREATE POLICY "app_state_club_admin_read" ON public.app_state
  FOR SELECT
  USING (
    id IN (
      SELECT t.id FROM public.teams t
      INNER JOIN public.club_members cm ON t.club_id = cm.club_id
      WHERE cm.user_id = auth.uid()
    )
  );

-- Super admins have full access
CREATE POLICY "app_state_super_admin_all" ON public.app_state
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE user_id = auth.uid() AND role = 'super_admin'
    )
  );

-- 10. Create function to automatically create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 11. Create helper function to check if user is super admin
CREATE OR REPLACE FUNCTION public.is_super_admin(user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.team_members
    WHERE team_members.user_id = $1 AND role = 'super_admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. Create helper function to get user's teams
CREATE OR REPLACE FUNCTION public.get_user_teams(user_id uuid)
RETURNS TABLE (
  team_id uuid,
  team_title text,
  club_id uuid,
  club_name text,
  role text
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id as team_id,
    t.title as team_title,
    t.club_id,
    c.name as club_name,
    tm.role
  FROM public.team_members tm
  INNER JOIN public.teams t ON tm.team_id = t.id
  LEFT JOIN public.clubs c ON t.club_id = c.id
  WHERE tm.user_id = $1
  ORDER BY t.title;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions on helper functions
GRANT EXECUTE ON FUNCTION public.is_super_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_teams(uuid) TO authenticated;

-- Comments for documentation
COMMENT ON TABLE public.users IS 'User profiles (extends auth.users)';
COMMENT ON TABLE public.clubs IS 'Parent organizations that contain multiple teams';
COMMENT ON TABLE public.teams IS 'Individual teams within clubs';
COMMENT ON TABLE public.team_members IS 'Many-to-many relationship between users and teams with roles';
COMMENT ON TABLE public.club_members IS 'Club admins assigned to clubs for read-only access';
COMMENT ON FUNCTION public.handle_new_user() IS 'Automatically creates user profile on signup';
COMMENT ON FUNCTION public.is_super_admin(uuid) IS 'Helper to check if user has super admin privileges';
COMMENT ON FUNCTION public.get_user_teams(uuid) IS 'Returns all teams a user has access to';
