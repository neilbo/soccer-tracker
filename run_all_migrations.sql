-- Single row storing app state (matches, squad, team title, etc.) as JSON.
-- Run this in Supabase Dashboard → SQL Editor, or via Supabase CLI.
create table if not exists public.app_state (
  id text primary key default 'default',
  data jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

-- Insert the default row so the app can upsert.
insert into public.app_state (id, data)
values ('default', '{}')
on conflict (id) do nothing;

-- Allow anonymous read/write for the app (no auth required).
-- To restrict to logged-in users later, enable RLS and add policies on auth.uid().
alter table public.app_state enable row level security;

create policy "Allow read for anon"
  on public.app_state for select
  using (true);

create policy "Allow insert for anon"
  on public.app_state for insert
  with check (true);

create policy "Allow update for anon"
  on public.app_state for update
  using (true)
  with check (true);
-- Normalized tables for players, matches, and per-match player stats.
-- Run this after 20260211000000_create_app_state.sql in the SQL Editor (or run both in order).

-- One team per app instance (id = 'default').
create table if not exists public.teams (
  id text primary key default 'default',
  title text not null default '',
  updated_at timestamptz not null default now()
);

insert into public.teams (id, title)
values ('default', '')
on conflict (id) do update set title = excluded.title;

-- Squad: players belonging to the team (id = app player id).
create table if not exists public.players (
  id bigint primary key,
  team_id text not null default 'default' references public.teams(id) on delete cascade,
  name text not null,
  sort_order int not null default 0
);

alter table public.players enable row level security;
create policy "Allow all for players" on public.players for all using (true) with check (true);

-- Matches.
create table if not exists public.matches (
  id bigint primary key,
  team_id text not null default 'default' references public.teams(id) on delete cascade,
  opponent text not null,
  venue text not null check (venue in ('home', 'away')),
  date text not null,
  description text not null default '',
  tag text not null default '',
  status text not null check (status in ('setup', 'live', 'completed')),
  team_goals int not null default 0,
  opponent_goals int not null default 0,
  match_seconds int not null default 0,
  match_running boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.matches enable row level security;
create policy "Allow all for matches" on public.matches for all using (true) with check (true);

-- Per-match player stats (one row per player per match).
create table if not exists public.match_players (
  match_id bigint not null references public.matches(id) on delete cascade,
  player_id bigint not null,
  player_name text not null default '',
  seconds int not null default 0,
  starting boolean not null default false,
  goals int not null default 0,
  assists int not null default 0,
  notes text not null default '',
  events jsonb not null default '[]',
  primary key (match_id, player_id)
);

alter table public.match_players enable row level security;
create policy "Allow all for match_players" on public.match_players for all using (true) with check (true);

-- Indexes for common queries (dashboard, player stats).
create index if not exists idx_matches_team_date on public.matches(team_id, date desc);
create index if not exists idx_match_players_match on public.match_players(match_id);
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
-- Team invitations table
CREATE TABLE IF NOT EXISTS invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  inviter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invitee_email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('team_staff', 'club_admin')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '7 days'),
  accepted_at TIMESTAMPTZ,
  UNIQUE(team_id, invitee_email, status)
);

-- Create index for faster lookups
CREATE INDEX idx_invitations_team_id ON invitations(team_id);
CREATE INDEX idx_invitations_invitee_email ON invitations(invitee_email);
CREATE INDEX idx_invitations_token ON invitations(token);
CREATE INDEX idx_invitations_status ON invitations(status);

-- RLS policies for invitations
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- Policy: Team staff can view invitations for their team
CREATE POLICY "Team staff can view team invitations"
  ON invitations FOR SELECT
  USING (
    team_id IN (
      SELECT tm.team_id FROM team_members tm
      WHERE tm.user_id = auth.uid()
      AND tm.role = 'team_staff'
    )
    OR
    is_super_admin(auth.uid())
  );

-- Policy: Team staff can create invitations for their team
CREATE POLICY "Team staff can create invitations"
  ON invitations FOR INSERT
  WITH CHECK (
    team_id IN (
      SELECT tm.team_id FROM team_members tm
      WHERE tm.user_id = auth.uid()
      AND tm.role = 'team_staff'
    )
    OR
    is_super_admin(auth.uid())
  );

-- Policy: Users can view invitations sent to their email
CREATE POLICY "Users can view their own invitations"
  ON invitations FOR SELECT
  USING (
    invitee_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- Policy: Users can update (accept/decline) their own invitations
CREATE POLICY "Users can accept/decline their invitations"
  ON invitations FOR UPDATE
  USING (
    invitee_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    AND status = 'pending'
  );

-- Function to accept an invitation
CREATE OR REPLACE FUNCTION accept_invitation(invitation_token TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  invitation_record invitations;
  user_email TEXT;
  result JSON;
BEGIN
  -- Get current user's email
  SELECT email INTO user_email FROM auth.users WHERE id = auth.uid();

  IF user_email IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Get invitation
  SELECT * INTO invitation_record
  FROM invitations
  WHERE token = invitation_token
  AND status = 'pending'
  AND invitee_email = user_email
  AND expires_at > now();

  IF invitation_record.id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Invalid or expired invitation');
  END IF;

  -- Add user to team
  INSERT INTO team_members (team_id, user_id, role)
  VALUES (invitation_record.team_id, auth.uid(), invitation_record.role)
  ON CONFLICT (team_id, user_id) DO UPDATE
  SET role = EXCLUDED.role;

  -- Mark invitation as accepted
  UPDATE invitations
  SET status = 'accepted', accepted_at = now()
  WHERE id = invitation_record.id;

  RETURN json_build_object(
    'success', true,
    'team_id', invitation_record.team_id,
    'role', invitation_record.role
  );
END;
$$;

-- Function to get invitations for a team
CREATE OR REPLACE FUNCTION get_team_invitations(p_team_id UUID)
RETURNS TABLE (
  id UUID,
  invitee_email TEXT,
  role TEXT,
  status TEXT,
  created_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  inviter_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    i.id,
    i.invitee_email,
    i.role,
    i.status,
    i.created_at,
    i.expires_at,
    COALESCE(u.full_name, u.email) as inviter_name
  FROM invitations i
  LEFT JOIN users u ON i.inviter_id = u.id
  WHERE i.team_id = p_team_id
  AND (
    -- Team staff can see all invitations
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.team_id = p_team_id
      AND tm.user_id = auth.uid()
      AND tm.role = 'team_staff'
    )
    OR
    is_super_admin(auth.uid())
  )
  ORDER BY i.created_at DESC;
END;
$$;

-- Function to get user's pending invitations
CREATE OR REPLACE FUNCTION get_my_invitations()
RETURNS TABLE (
  id UUID,
  team_id UUID,
  team_name TEXT,
  role TEXT,
  created_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  inviter_name TEXT,
  token TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_email TEXT;
BEGIN
  -- Get current user's email
  SELECT email INTO user_email FROM auth.users WHERE id = auth.uid();

  IF user_email IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    i.id,
    i.team_id,
    t.title as team_name,
    i.role,
    i.created_at,
    i.expires_at,
    COALESCE(u.full_name, u.email) as inviter_name,
    i.token
  FROM invitations i
  JOIN teams t ON i.team_id = t.id
  LEFT JOIN users u ON i.inviter_id = u.id
  WHERE i.invitee_email = user_email
  AND i.status = 'pending'
  AND i.expires_at > now()
  ORDER BY i.created_at DESC;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION accept_invitation(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_team_invitations(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_my_invitations() TO authenticated;
-- Create club_invitations table
CREATE TABLE club_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  inviter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invitee_email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'team_staff' CHECK (role IN ('team_staff', 'club_admin')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '7 days'),
  accepted_at TIMESTAMPTZ,
  UNIQUE(club_id, invitee_email, status) WHERE status = 'pending'
);

-- Add indexes for performance
CREATE INDEX idx_club_invitations_club_id ON club_invitations(club_id);
CREATE INDEX idx_club_invitations_invitee_email ON club_invitations(invitee_email);
CREATE INDEX idx_club_invitations_token ON club_invitations(token);
CREATE INDEX idx_club_invitations_status ON club_invitations(status);

-- Enable RLS
ALTER TABLE club_invitations ENABLE ROW LEVEL SECURITY;

-- Club admins can view and create invitations for their clubs
CREATE POLICY "Club admins can manage club invitations"
  ON club_invitations
  FOR ALL
  USING (
    club_id IN (
      SELECT club_id FROM club_members
      WHERE user_id = auth.uid() AND role = 'club_admin'
    )
  );

-- Users can view invitations sent to their email
CREATE POLICY "Users can view their own invitations"
  ON club_invitations
  FOR SELECT
  USING (invitee_email = auth.email());

-- Users can update (accept/decline) their own invitations
CREATE POLICY "Users can respond to their invitations"
  ON club_invitations
  FOR UPDATE
  USING (invitee_email = auth.email())
  WITH CHECK (invitee_email = auth.email());

-- Super admins have full access
CREATE POLICY "Super admins have full access to club invitations"
  ON club_invitations
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- Function to accept club invitation
CREATE OR REPLACE FUNCTION accept_club_invitation(invitation_token TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_invitation club_invitations;
  v_club_member_id UUID;
BEGIN
  -- Get the invitation
  SELECT * INTO v_invitation
  FROM club_invitations
  WHERE token = invitation_token
    AND status = 'pending'
    AND invitee_email = auth.email()
    AND expires_at > now();

  -- Check if invitation exists and is valid
  IF v_invitation.id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Invalid or expired invitation'
    );
  END IF;

  -- Check if user is already a member
  IF EXISTS (
    SELECT 1 FROM club_members
    WHERE club_id = v_invitation.club_id
      AND user_id = auth.uid()
  ) THEN
    -- Update invitation status
    UPDATE club_invitations
    SET status = 'accepted',
        accepted_at = now()
    WHERE id = v_invitation.id;

    RETURN json_build_object(
      'success', true,
      'message', 'Already a member of this club'
    );
  END IF;

  -- Add user to club_members
  INSERT INTO club_members (club_id, user_id, role)
  VALUES (v_invitation.club_id, auth.uid(), v_invitation.role)
  RETURNING id INTO v_club_member_id;

  -- Update invitation status
  UPDATE club_invitations
  SET status = 'accepted',
      accepted_at = now()
  WHERE id = v_invitation.id;

  RETURN json_build_object(
    'success', true,
    'club_member_id', v_club_member_id,
    'club_id', v_invitation.club_id
  );
END;
$$;

-- Function to get club invitations (for club admins)
CREATE OR REPLACE FUNCTION get_club_invitations(p_club_id UUID)
RETURNS TABLE (
  id UUID,
  invitee_email TEXT,
  role TEXT,
  status TEXT,
  created_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  inviter_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user is a club admin
  IF NOT EXISTS (
    SELECT 1 FROM club_members
    WHERE club_id = p_club_id
      AND user_id = auth.uid()
      AND role = 'club_admin'
  ) AND NOT EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
      AND role = 'super_admin'
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Only club admins can view invitations';
  END IF;

  RETURN QUERY
  SELECT
    ci.id,
    ci.invitee_email,
    ci.role,
    ci.status,
    ci.created_at,
    ci.expires_at,
    u.name as inviter_name
  FROM club_invitations ci
  LEFT JOIN users u ON u.id = ci.inviter_id
  WHERE ci.club_id = p_club_id
  ORDER BY ci.created_at DESC;
END;
$$;

-- Function to get my club invitations
CREATE OR REPLACE FUNCTION get_my_club_invitations()
RETURNS TABLE (
  id UUID,
  club_id UUID,
  club_name TEXT,
  role TEXT,
  status TEXT,
  created_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  inviter_name TEXT,
  token TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ci.id,
    ci.club_id,
    c.name as club_name,
    ci.role,
    ci.status,
    ci.created_at,
    ci.expires_at,
    u.name as inviter_name,
    ci.token
  FROM club_invitations ci
  LEFT JOIN clubs c ON c.id = ci.club_id
  LEFT JOIN users u ON u.id = ci.inviter_id
  WHERE ci.invitee_email = auth.email()
    AND ci.status = 'pending'
    AND ci.expires_at > now()
  ORDER BY ci.created_at DESC;
END;
$$;

-- Function to expire old invitations (can be run as a cron job)
CREATE OR REPLACE FUNCTION expire_old_club_invitations()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE club_invitations
  SET status = 'expired'
  WHERE status = 'pending'
    AND expires_at < now();

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;


-- SUCCESS! All migrations combined
