-- Simple fix for player ID conflicts
-- First, let's check what type the id column actually is

-- 1. Check current column type
SELECT
  table_name,
  column_name,
  data_type,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'players'
  AND column_name = 'id';

-- 2. Check current data
SELECT id, team_id, name FROM public.players ORDER BY id DESC LIMIT 5;

-- 3. Create sequence
CREATE SEQUENCE IF NOT EXISTS players_id_seq START WITH 1000;

-- 4. Alter the column to use sequence
-- Note: Only run this if id is bigint (check step 1 first)
-- ALTER TABLE public.players ALTER COLUMN id SET DEFAULT nextval('players_id_seq');
