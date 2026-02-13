-- Create North Star FC organization
-- Copy and paste this into Supabase SQL Editor and run it

INSERT INTO public.clubs (name)
VALUES ('North Star FC')
ON CONFLICT DO NOTHING;

-- Verify it was created
SELECT * FROM public.clubs WHERE name = 'North Star FC';
