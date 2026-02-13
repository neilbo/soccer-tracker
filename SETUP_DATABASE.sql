-- =============================================================================
-- COMPLETE DATABASE SETUP FOR SOCCER TRACKER
-- Run this in Supabase Dashboard > SQL Editor
-- This will create all necessary tables and set up the auth system
-- =============================================================================

-- Step 1: Read the auth migration
\i supabase/migrations/20260213000000_add_auth_schema.sql

-- Step 2: Read the invitations migration
\i supabase/migrations/20260213100000_add_invitations.sql

-- Step 3: Read the club invitations migration
\i supabase/migrations/20260213200000_add_club_invitations.sql

-- =============================================================================
-- After running this, run the create_test_team.sql to create a team
-- =============================================================================
