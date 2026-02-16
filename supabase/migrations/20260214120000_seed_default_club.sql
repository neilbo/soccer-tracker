-- Migration: Seed default club organization
-- Description: Adds "North Star FC" as the default club for new signups

-- Insert default club if it doesn't exist
-- Using a fixed UUID so this migration is idempotent
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

-- Add comment for documentation
COMMENT ON TABLE public.clubs IS 'Parent organizations that contain multiple teams. North Star FC is the default club.';
