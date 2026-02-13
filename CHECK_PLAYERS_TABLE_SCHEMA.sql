-- Check the actual column types in the players table

SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'players'
ORDER BY ordinal_position;

-- Expected:
-- id should be "bigint"
-- team_id should be "uuid"

-- If id shows as "uuid", that's the problem!
