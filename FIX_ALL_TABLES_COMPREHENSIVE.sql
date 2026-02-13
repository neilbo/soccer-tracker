-- Comprehensive fix: Drop and recreate ALL data tables with correct types
-- WARNING: This will delete all matches, players, and match_players data!

-- ============================================================================
-- 1. Drop tables in correct order (to handle foreign keys)
-- ============================================================================

DROP TABLE IF EXISTS public.match_players CASCADE;
DROP TABLE IF EXISTS public.matches CASCADE;
DROP TABLE IF EXISTS public.players CASCADE;

-- ============================================================================
-- 2. Recreate PLAYERS table (id=bigint, team_id=uuid)
-- ============================================================================

CREATE TABLE public.players (
  id bigint PRIMARY KEY,
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  name text NOT NULL,
  sort_order int NOT NULL DEFAULT 0
);

ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "players_all_access" ON public.players
  FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================================
-- 3. Recreate MATCHES table (id=bigint, team_id=uuid)
-- ============================================================================

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

ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "matches_all_access" ON public.matches
  FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================================
-- 4. Recreate MATCH_PLAYERS table (match_id=bigint, player_id=bigint)
-- ============================================================================

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

ALTER TABLE public.match_players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "match_players_all_access" ON public.match_players
  FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================================
-- 5. Verify the schema
-- ============================================================================

SELECT
  t.table_name,
  c.column_name,
  c.data_type,
  c.is_nullable
FROM information_schema.tables t
JOIN information_schema.columns c ON t.table_name = c.table_name
WHERE t.table_schema = 'public'
  AND t.table_name IN ('players', 'matches', 'match_players')
  AND c.column_name LIKE '%id%'
ORDER BY t.table_name, c.ordinal_position;

-- Expected output:
-- players.id = bigint
-- players.team_id = uuid
-- matches.id = bigint
-- matches.team_id = uuid
-- match_players.match_id = bigint
-- match_players.player_id = bigint
