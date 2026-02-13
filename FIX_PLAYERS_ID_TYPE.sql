-- Fix players.id column type if it was changed to UUID

-- First, check what it currently is
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'players' AND column_name = 'id';

-- If the result shows "uuid", run these commands:

-- 1. Drop the table and recreate with correct types
DROP TABLE IF EXISTS public.players CASCADE;

CREATE TABLE public.players (
  id bigint PRIMARY KEY,
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  name text NOT NULL,
  sort_order int NOT NULL DEFAULT 0
);

-- 2. Enable RLS
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;

-- 3. Create simple policy
CREATE POLICY "players_all_access" ON public.players
  FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- 4. Verify
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'players'
ORDER BY ordinal_position;
