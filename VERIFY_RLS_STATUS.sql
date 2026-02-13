-- Check if RLS policies were actually updated

-- 1. Show all current policies on players table
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'players' AND schemaname = 'public';

-- 2. Check RLS is enabled
SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename = 'players' AND schemaname = 'public';

-- 3. Test if we can insert a player (replace with your actual team_id)
-- First, get your team_id:
SELECT id, title FROM public.teams;

-- Try inserting a test player (replace 'YOUR_TEAM_ID' with actual UUID from above)
-- INSERT INTO public.players (id, team_id, name, sort_order)
-- VALUES (9999, 'YOUR_TEAM_ID', 'Test Player', 999);

-- 4. Check players table structure
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'players'
ORDER BY ordinal_position;

-- 5. Check for any constraints that might be failing
SELECT
  conname AS constraint_name,
  contype AS constraint_type,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.players'::regclass;
