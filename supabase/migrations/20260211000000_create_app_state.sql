-- Single row storing app state (matches, squad, team title, etc.) as JSON.
-- Run this in Supabase Dashboard → SQL Editor, or via Supabase CLI.
create table if not exists public.app_state (
  id text primary key default 'default',
  data jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

-- Insert the default row so the app can upsert.
insert into public.app_state (id, data)
values ('default', '{}')
on conflict (id) do nothing;

-- Allow anonymous read/write for the app (no auth required).
-- To restrict to logged-in users later, enable RLS and add policies on auth.uid().
alter table public.app_state enable row level security;

create policy "Allow read for anon"
  on public.app_state for select
  using (true);

create policy "Allow insert for anon"
  on public.app_state for insert
  with check (true);

create policy "Allow update for anon"
  on public.app_state for update
  using (true)
  with check (true);
