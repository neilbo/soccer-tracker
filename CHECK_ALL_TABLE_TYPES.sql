-- Check ALL table ID column types to understand current state

-- Teams table
SELECT 'teams' as table_name, column_name, data_type
FROM information_schema.columns
WHERE table_name = 'teams' AND column_name IN ('id', 'club_id')
ORDER BY ordinal_position;

-- Players table
SELECT 'players' as table_name, column_name, data_type
FROM information_schema.columns
WHERE table_name = 'players' AND column_name IN ('id', 'team_id')
ORDER BY ordinal_position;

-- Matches table
SELECT 'matches' as table_name, column_name, data_type
FROM information_schema.columns
WHERE table_name = 'matches' AND column_name IN ('id', 'team_id')
ORDER BY ordinal_position;

-- Match_players table
SELECT 'match_players' as table_name, column_name, data_type
FROM information_schema.columns
WHERE table_name = 'match_players' AND column_name IN ('match_id', 'player_id')
ORDER BY ordinal_position;

-- SUMMARY: What we expect
-- teams.id = uuid ✓
-- players.id = bigint (app uses numeric IDs)
-- players.team_id = uuid (references teams.id)
-- matches.id = bigint (app uses numeric IDs)
-- matches.team_id = uuid (references teams.id)
-- match_players.match_id = bigint (references matches.id)
-- match_players.player_id = bigint (references players.id)
