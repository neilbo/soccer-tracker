-- Check all tables with player ID columns

-- Players table
SELECT 'players' as table_name, column_name, data_type
FROM information_schema.columns
WHERE table_name = 'players'
ORDER BY ordinal_position;

-- Match_players table
SELECT 'match_players' as table_name, column_name, data_type
FROM information_schema.columns
WHERE table_name = 'match_players'
ORDER BY ordinal_position;

-- Expected results:
-- players.id = bigint
-- players.team_id = uuid
-- match_players.player_id = bigint
-- match_players.match_id = bigint

-- If any player_id shows as "uuid", that's the problem!
