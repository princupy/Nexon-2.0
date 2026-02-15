create table if not exists public.guild_configs (
  guild_id text primary key,
  prefix text not null default 'N!',
  locale text null,
  premium_tier integer null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.guild_configs
  add column if not exists prefix text not null default 'N!';

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists trg_guild_configs_updated_at on public.guild_configs;

create trigger trg_guild_configs_updated_at
before update on public.guild_configs
for each row
execute function public.set_updated_at();
