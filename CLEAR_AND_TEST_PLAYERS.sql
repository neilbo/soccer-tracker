-- Clear all players and test if insert works

-- 1. Show current players
SELECT id, name, team_id FROM public.players;

-- 2. DELETE ALL PLAYERS (WARNING: This clears ALL players from ALL teams!)
-- Uncomment the next line to execute:
-- DELETE FROM public.players;

-- 3. Get your team ID
SELECT id, title FROM public.teams WHERE title LIKE '%U10%';

-- 4. Test insert (replace 'YOUR_TEAM_ID' with actual UUID from step 3)
-- Uncomment and update the next line:
-- INSERT INTO public.players (id, team_id, name, sort_order) VALUES (1, 'YOUR_TEAM_ID', 'Test Player', 0);

-- 5. If step 4 works, the RLS policies are fine and it's a data conflict issue
