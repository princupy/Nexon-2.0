create table if not exists public.afk_entries (
  user_id text not null,
  scope text not null check (scope in ('global', 'server')),
  guild_id text not null,
  reason text null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, scope, guild_id),
  constraint afk_scope_guild_rule check (
    (scope = 'global' and guild_id = 'global') or
    (scope = 'server' and guild_id <> 'global')
  )
);

create index if not exists idx_afk_entries_user_id
  on public.afk_entries (user_id);

create index if not exists idx_afk_entries_scope_guild
  on public.afk_entries (scope, guild_id);
