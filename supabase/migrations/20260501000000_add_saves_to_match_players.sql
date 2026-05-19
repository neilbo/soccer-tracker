alter table match_players
  add column if not exists saves int not null default 0;
