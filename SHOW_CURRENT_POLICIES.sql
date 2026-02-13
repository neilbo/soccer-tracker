-- Show all current policies on the tables
SELECT
  tablename,
  policyname,
  cmd,
  permissive,
  roles,
  SUBSTRING(qual::text, 1, 100) as using_clause,
  SUBSTRING(with_check::text, 1, 100) as with_check_clause
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('players', 'teams', 'team_members', 'matches', 'match_players')
ORDER BY tablename, policyname;
