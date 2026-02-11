-- Normalized tables for players, matches, and per-match player stats.
-- Run this after 20260211000000_create_app_state.sql in the SQL Editor (or run both in order).

-- One team per app instance (id = 'default').
create table if not exists public.teams (
  id text primary key default 'default',
  title text not null default '',
  updated_at timestamptz not null default now()
);

insert into public.teams (id, title)
values ('default', '')
on conflict (id) do update set title = excluded.title;

-- Squad: players belonging to the team (id = app player id).
create table if not exists public.players (
  id bigint primary key,
  team_id text not null default 'default' references public.teams(id) on delete cascade,
  name text not null,
  sort_order int not null default 0
);

alter table public.players enable row level security;
create policy "Allow all for players" on public.players for all using (true) with check (true);

-- Matches.
create table if not exists public.matches (
  id bigint primary key,
  team_id text not null default 'default' references public.teams(id) on delete cascade,
  opponent text not null,
  venue text not null check (venue in ('home', 'away')),
  date text not null,
  description text not null default '',
  tag text not null default '',
  status text not null check (status in ('setup', 'live', 'completed')),
  team_goals int not null default 0,
  opponent_goals int not null default 0,
  match_seconds int not null default 0,
  match_running boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.matches enable row level security;
create policy "Allow all for matches" on public.matches for all using (true) with check (true);

-- Per-match player stats (one row per player per match).
create table if not exists public.match_players (
  match_id bigint not null references public.matches(id) on delete cascade,
  player_id bigint not null,
  player_name text not null default '',
  seconds int not null default 0,
  starting boolean not null default false,
  goals int not null default 0,
  assists int not null default 0,
  notes text not null default '',
  events jsonb not null default '[]',
  primary key (match_id, player_id)
);

alter table public.match_players enable row level security;
create policy "Allow all for match_players" on public.match_players for all using (true) with check (true);

-- Indexes for common queries (dashboard, player stats).
create index if not exists idx_matches_team_date on public.matches(team_id, date desc);
create index if not exists idx_match_players_match on public.match_players(match_id);
