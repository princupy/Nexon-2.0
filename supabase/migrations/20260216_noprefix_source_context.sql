alter table public.noprefix_users
  add column if not exists added_guild_id text null,
  add column if not exists added_channel_id text null;
