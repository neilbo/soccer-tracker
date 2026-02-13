-- Comprehensive fix for players and match_players tables
-- This ensures all column types are correct

-- ============================================================================
-- 1. Drop and recreate PLAYERS table with correct types
-- ============================================================================

DROP TABLE IF EXISTS public.players CASCADE;

CREATE TABLE public.players (
  id bigint PRIMARY KEY,
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  name text NOT NULL,
  sort_order int NOT NULL DEFAULT 0
);

-- Enable RLS
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;

-- Create simple policy
CREATE POLICY "players_all_access" ON public.players
  FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================================
-- 2. Drop and recreate MATCH_PLAYERS table with correct types
-- ============================================================================

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

-- Enable RLS
ALTER TABLE public.match_players ENABLE ROW LEVEL SECURITY;

-- Create simple policy
CREATE POLICY "match_players_all_access" ON public.match_players
  FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================================
-- 3. Verify the schema
-- ============================================================================

-- Check players table
SELECT 'players' as table_name, column_name, data_type
FROM information_schema.columns
WHERE table_name = 'players'
ORDER BY ordinal_position;

-- Check match_players table
SELECT 'match_players' as table_name, column_name, data_type
FROM information_schema.columns
WHERE table_name = 'match_players'
ORDER BY ordinal_position;

-- Expected output:
-- players.id = bigint
-- players.team_id = uuid
-- match_players.match_id = bigint
-- match_players.player_id = bigint
