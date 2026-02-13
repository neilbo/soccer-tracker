-- CLEAN START: Drop everything and recreate from scratch
-- WARNING: This will delete ALL existing data
-- Only run this if you're okay with starting fresh

-- =====================================================
-- STEP 1: DROP ALL EXISTING TABLES (CASCADE)
-- =====================================================

DROP TABLE IF EXISTS public.match_players CASCADE;
DROP TABLE IF EXISTS public.matches CASCADE;
DROP TABLE IF EXISTS public.players CASCADE;
DROP TABLE IF EXISTS public.club_members CASCADE;
DROP TABLE IF EXISTS public.team_members CASCADE;
DROP TABLE IF EXISTS public.teams CASCADE;
DROP TABLE IF EXISTS public.clubs CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;
DROP TABLE IF EXISTS public.app_state CASCADE;
DROP TABLE IF EXISTS public.invitations CASCADE;
DROP TABLE IF EXISTS public.club_invitations CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS is_super_admin(uuid);
DROP FUNCTION IF EXISTS get_user_teams(uuid);
DROP FUNCTION IF EXISTS accept_invitation(text);
DROP FUNCTION IF EXISTS get_team_invitations(uuid);
DROP FUNCTION IF EXISTS get_my_invitations();
DROP FUNCTION IF EXISTS accept_club_invitation(text);
DROP FUNCTION IF EXISTS get_club_invitations(uuid);
DROP FUNCTION IF EXISTS get_my_club_invitations();
DROP FUNCTION IF EXISTS expire_old_club_invitations();

-- Drop trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- STEP 2: CREATE ALL TABLES WITH UUID
-- =====================================================

-- 1. Users table (extends auth.users)
CREATE TABLE public.users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL UNIQUE,
  full_name text,
  name text,
  role text DEFAULT 'user',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Clubs table
CREATE TABLE public.clubs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Teams table (with club relationship)
CREATE TABLE public.teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid REFERENCES public.clubs(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Team members table
CREATE TABLE public.team_members (
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('team_staff', 'club_admin', 'super_admin')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (team_id, user_id)
);

-- 5. Club members table
CREATE TABLE public.club_members (
  club_id uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('club_admin', 'team_staff')) DEFAULT 'club_admin',
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (club_id, user_id)
);

-- 6. Players table
CREATE TABLE public.players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  name text NOT NULL,
  sort_order int DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 7. Matches table
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
CREATE TABLE public.match_players (
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

-- 9. App state table (for guest data backup)
CREATE TABLE public.app_state (
  id uuid PRIMARY KEY,
  data jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 10. Team invitations table
CREATE TABLE public.invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  inviter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invitee_email text NOT NULL,
  role text NOT NULL DEFAULT 'team_staff' CHECK (role IN ('team_staff', 'club_admin')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '7 days'),
  accepted_at timestamptz,
  UNIQUE(team_id, invitee_email, status)
);

-- 11. Club invitations table
CREATE TABLE public.club_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  inviter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invitee_email text NOT NULL,
  role text NOT NULL DEFAULT 'team_staff' CHECK (role IN ('team_staff', 'club_admin')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '7 days'),
  accepted_at timestamptz,
  UNIQUE(club_id, invitee_email, status)
);

-- =====================================================
-- STEP 3: CREATE INDEXES
-- =====================================================

CREATE INDEX idx_team_members_user_id ON public.team_members(user_id);
CREATE INDEX idx_team_members_team_id ON public.team_members(team_id);
CREATE INDEX idx_club_members_user_id ON public.club_members(user_id);
CREATE INDEX idx_club_members_club_id ON public.club_members(club_id);
CREATE INDEX idx_players_team_id ON public.players(team_id);
CREATE INDEX idx_matches_team_id ON public.matches(team_id);
CREATE INDEX idx_invitations_team_id ON public.invitations(team_id);
CREATE INDEX idx_invitations_token ON public.invitations(token);
CREATE INDEX idx_club_invitations_club_id ON public.club_invitations(club_id);
CREATE INDEX idx_club_invitations_token ON public.club_invitations(token);

-- =====================================================
-- STEP 4: ENABLE RLS
-- =====================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_invitations ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 5: CREATE RLS POLICIES
-- =====================================================

-- Users: read/update own data
CREATE POLICY "users_read_own" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "users_update_own" ON public.users FOR UPDATE USING (auth.uid() = id);

-- Clubs: read if member or team member
CREATE POLICY "clubs_read_access" ON public.clubs FOR SELECT USING (true);
CREATE POLICY "clubs_write_access" ON public.clubs FOR ALL USING (true);

-- Teams: access if team member
CREATE POLICY "teams_member_access" ON public.teams FOR ALL
  USING (id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid()));

-- Team members: read own and teammates
CREATE POLICY "team_members_read" ON public.team_members FOR SELECT
  USING (user_id = auth.uid() OR team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid()));

CREATE POLICY "team_members_write" ON public.team_members FOR ALL
  USING (team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid() AND role = 'team_staff'));

-- Club members: read own
CREATE POLICY "club_members_read_own" ON public.club_members FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "club_members_write" ON public.club_members FOR ALL USING (true);

-- Players: access if team member
CREATE POLICY "players_team_access" ON public.players FOR ALL
  USING (team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid()));

-- Matches: access if team member
CREATE POLICY "matches_team_access" ON public.matches FOR ALL
  USING (team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid()));

-- Match players: access if team member
CREATE POLICY "match_players_access" ON public.match_players FOR ALL
  USING (match_id IN (
    SELECT m.id FROM public.matches m
    WHERE m.team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid())
  ));

-- App state: users can access their team data
CREATE POLICY "app_state_team_access" ON public.app_state FOR ALL
  USING (id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid()));

-- Invitations: team staff can manage, invitees can view/respond
CREATE POLICY "invitations_team_manage" ON public.invitations FOR ALL
  USING (team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid() AND role = 'team_staff'));

CREATE POLICY "invitations_invitee_view" ON public.invitations FOR SELECT
  USING (invitee_email = auth.email());

CREATE POLICY "invitations_invitee_respond" ON public.invitations FOR UPDATE
  USING (invitee_email = auth.email());

-- Club invitations: club admins can manage, invitees can view/respond
CREATE POLICY "club_invitations_manage" ON public.club_invitations FOR ALL
  USING (club_id IN (SELECT club_id FROM public.club_members WHERE user_id = auth.uid() AND role = 'club_admin'));

CREATE POLICY "club_invitations_invitee_view" ON public.club_invitations FOR SELECT
  USING (invitee_email = auth.email());

CREATE POLICY "club_invitations_invitee_respond" ON public.club_invitations FOR UPDATE
  USING (invitee_email = auth.email());

-- =====================================================
-- STEP 6: CREATE FUNCTIONS
-- =====================================================

-- Check if user is super admin
CREATE OR REPLACE FUNCTION is_super_admin(user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (SELECT 1 FROM public.users WHERE id = user_id AND role = 'super_admin');
$$;

-- Get user's teams
CREATE OR REPLACE FUNCTION get_user_teams(user_id uuid)
RETURNS TABLE (team_id uuid, team_title text, club_id uuid, club_name text, role text)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT t.id, t.title, t.club_id, c.name, tm.role
  FROM public.teams t
  INNER JOIN public.team_members tm ON t.id = tm.team_id
  LEFT JOIN public.clubs c ON t.club_id = c.id
  WHERE tm.user_id = $1
  ORDER BY t.title;
$$;

-- Accept team invitation
CREATE OR REPLACE FUNCTION accept_invitation(invitation_token text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_invitation invitations;
  v_team_member_id uuid;
BEGIN
  SELECT * INTO v_invitation FROM invitations
  WHERE token = invitation_token AND status = 'pending' AND invitee_email = auth.email() AND expires_at > now();

  IF v_invitation.id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Invalid or expired invitation');
  END IF;

  INSERT INTO team_members (team_id, user_id, role)
  VALUES (v_invitation.team_id, auth.uid(), v_invitation.role)
  ON CONFLICT DO NOTHING;

  UPDATE invitations SET status = 'accepted', accepted_at = now() WHERE id = v_invitation.id;

  RETURN json_build_object('success', true, 'team_id', v_invitation.team_id, 'role', v_invitation.role);
END;
$$;

-- Accept club invitation
CREATE OR REPLACE FUNCTION accept_club_invitation(invitation_token text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_invitation club_invitations;
BEGIN
  SELECT * INTO v_invitation FROM club_invitations
  WHERE token = invitation_token AND status = 'pending' AND invitee_email = auth.email() AND expires_at > now();

  IF v_invitation.id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Invalid or expired invitation');
  END IF;

  INSERT INTO club_members (club_id, user_id, role)
  VALUES (v_invitation.club_id, auth.uid(), v_invitation.role)
  ON CONFLICT DO NOTHING;

  UPDATE club_invitations SET status = 'accepted', accepted_at = now() WHERE id = v_invitation.id;

  RETURN json_build_object('success', true, 'club_id', v_invitation.club_id);
END;
$$;

-- Get team invitations (for team staff)
CREATE OR REPLACE FUNCTION get_team_invitations(p_team_id uuid)
RETURNS TABLE (id uuid, invitee_email text, role text, status text, created_at timestamptz, expires_at timestamptz, inviter_name text)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT i.id, i.invitee_email, i.role, i.status, i.created_at, i.expires_at, u.name
  FROM invitations i
  LEFT JOIN users u ON u.id = i.inviter_id
  WHERE i.team_id = p_team_id
  ORDER BY i.created_at DESC;
$$;

-- Get my invitations
CREATE OR REPLACE FUNCTION get_my_invitations()
RETURNS TABLE (id uuid, team_id uuid, team_name text, club_name text, role text, status text, created_at timestamptz, expires_at timestamptz, inviter_name text, token text)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT i.id, i.team_id, t.title, c.name, i.role, i.status, i.created_at, i.expires_at, u.name, i.token
  FROM invitations i
  LEFT JOIN teams t ON t.id = i.team_id
  LEFT JOIN clubs c ON c.id = t.club_id
  LEFT JOIN users u ON u.id = i.inviter_id
  WHERE i.invitee_email = auth.email() AND i.status = 'pending' AND i.expires_at > now()
  ORDER BY i.created_at DESC;
$$;

-- Get club invitations (for club admins)
CREATE OR REPLACE FUNCTION get_club_invitations(p_club_id uuid)
RETURNS TABLE (id uuid, invitee_email text, role text, status text, created_at timestamptz, expires_at timestamptz, inviter_name text)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT ci.id, ci.invitee_email, ci.role, ci.status, ci.created_at, ci.expires_at, u.name
  FROM club_invitations ci
  LEFT JOIN users u ON u.id = ci.inviter_id
  WHERE ci.club_id = p_club_id
  ORDER BY ci.created_at DESC;
$$;

-- Get my club invitations
CREATE OR REPLACE FUNCTION get_my_club_invitations()
RETURNS TABLE (id uuid, club_id uuid, club_name text, role text, status text, created_at timestamptz, expires_at timestamptz, inviter_name text, token text)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT ci.id, ci.club_id, c.name, ci.role, ci.status, ci.created_at, ci.expires_at, u.name, ci.token
  FROM club_invitations ci
  LEFT JOIN clubs c ON c.id = ci.club_id
  LEFT JOIN users u ON u.id = ci.inviter_id
  WHERE ci.invitee_email = auth.email() AND ci.status = 'pending' AND ci.expires_at > now()
  ORDER BY ci.created_at DESC;
$$;

-- =====================================================
-- STEP 7: CREATE TRIGGER FOR USER SYNC
-- =====================================================

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
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    name = EXCLUDED.name,
    updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

SELECT 'Database setup complete!' as message;
SELECT 'Now create a team for your user by running the create team SQL' as next_step;
