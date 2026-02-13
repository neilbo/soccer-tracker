-- Check where opposition clubs are actually stored
-- They're in app_state.data as JSON, not the clubs table!

-- 1. Check app_state for your team
SELECT
  id as team_id,
  data->'clubs' as opposition_clubs,
  data->'nextClubId' as next_club_id,
  updated_at
FROM public.app_state
ORDER BY updated_at DESC;

-- 2. To see the full app state data:
SELECT
  id as team_id,
  jsonb_pretty(data) as full_state
FROM public.app_state
LIMIT 1;

-- Note: The "clubs" database table is for ORGANIZATIONS (like North Star FC)
-- Opposition clubs are stored in app_state.data.clubs as JSON
