-- Migration: Seed default club organizations
-- Description: Adds "Guest" organization (for guest users) and "North Star FC" (for signups)

-- Insert Guest organization (for guest user data isolation)
-- Using a fixed UUID so this migration is idempotent
INSERT INTO public.clubs (id, name, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000000'::uuid,
  'Guest',
  now(),
  now()
)
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  updated_at = now();

-- Insert North Star FC organization (default for new signups)
INSERT INTO public.clubs (id, name, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  'North Star FC',
  now(),
  now()
)
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  updated_at = now();

-- Create Guest Team under Guest organization
INSERT INTO public.teams (id, club_id, title, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000010'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'Guest Team',
  now(),
  now()
)
ON CONFLICT (id) DO UPDATE
SET
  club_id = EXCLUDED.club_id,
  title = EXCLUDED.title,
  updated_at = now();

-- Add comment for documentation
COMMENT ON TABLE public.clubs IS 'Parent organizations that contain multiple teams. Guest organization is for guest users. North Star FC is the default club for signups.';
