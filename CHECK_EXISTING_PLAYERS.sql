-- Check what players currently exist in the database
SELECT
  p.id,
  p.name,
  p.team_id,
  t.title as team_name,
  p.sort_order
FROM public.players p
LEFT JOIN public.teams t ON p.team_id = t.id
ORDER BY p.id DESC
LIMIT 20;

-- Check for duplicate IDs
SELECT
  id,
  COUNT(*) as count
FROM public.players
GROUP BY id
HAVING COUNT(*) > 1;
