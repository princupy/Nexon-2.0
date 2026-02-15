create table if not exists public.greet_configs (
  guild_id text primary key,
  enabled boolean not null default false,
  style text not null default 'normal' check (style in ('normal', 'colored')),
  channel_id text null,
  message_template text null,
  auto_delete_seconds integer null check (
    auto_delete_seconds is null
    or auto_delete_seconds between 5 and 86400
  ),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists trg_greet_configs_updated_at on public.greet_configs;

create trigger trg_greet_configs_updated_at
before update on public.greet_configs
for each row
execute function public.set_updated_at();
