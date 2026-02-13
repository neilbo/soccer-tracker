-- Fix player ID conflicts by using sequences
-- This allows each team to have independent player IDs

-- 1. Create a sequence for player IDs
CREATE SEQUENCE IF NOT EXISTS players_id_seq;

-- 2. Set the sequence to start after the highest existing ID
SELECT setval('players_id_seq', COALESCE((SELECT MAX(id) FROM public.players), 0) + 1, false);

-- 3. Alter the players table to use the sequence as default
ALTER TABLE public.players
  ALTER COLUMN id SET DEFAULT nextval('players_id_seq');

-- 4. Now test - you should be able to insert without specifying ID
-- INSERT INTO public.players (team_id, name, sort_order)
-- VALUES ('YOUR_TEAM_ID', 'Test Player', 0);

-- 5. Verify the sequence is working
SELECT
  column_name,
  column_default,
  data_type
FROM information_schema.columns
WHERE table_name = 'players'
  AND column_name = 'id';
