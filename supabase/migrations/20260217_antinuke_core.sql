create table if not exists public.antinuke_configs (
  guild_id text primary key,
  enabled boolean not null default false,
  nightmode_enabled boolean not null default false,
  extra_owner_id text null,
  updated_by text null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.antinuke_whitelist_users (
  guild_id text not null,
  user_id text not null,
  added_by text null,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (guild_id, user_id)
);

create index if not exists idx_antinuke_whitelist_users_guild_id
  on public.antinuke_whitelist_users (guild_id);
