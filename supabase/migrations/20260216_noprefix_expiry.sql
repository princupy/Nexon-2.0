alter table public.noprefix_users
  add column if not exists expires_at timestamptz null;

create index if not exists idx_noprefix_users_expires_at
  on public.noprefix_users (expires_at);
