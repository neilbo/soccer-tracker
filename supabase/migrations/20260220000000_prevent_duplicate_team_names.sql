-- Migration: Prevent duplicate team names within the same club
-- Description: Adds a unique constraint to ensure team names are unique within each club

-- Add unique constraint on (club_id, title) to prevent duplicate team names
-- NULL club_ids are allowed to be duplicated (independent teams can have same names)
CREATE UNIQUE INDEX unique_team_name_per_club
ON public.teams (club_id, title)
WHERE club_id IS NOT NULL;

-- Add comment for documentation
COMMENT ON INDEX unique_team_name_per_club IS 'Ensures team names are unique within each club. Independent teams (null club_id) can have duplicate names.';
