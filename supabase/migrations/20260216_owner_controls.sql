create table if not exists public.noprefix_users (
  user_id text primary key,
  added_by text null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.blacklist_users (
  user_id text primary key,
  added_by text null,
  created_at timestamptz not null default timezone('utc', now())
);
