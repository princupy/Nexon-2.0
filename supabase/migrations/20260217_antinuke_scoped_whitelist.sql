alter table public.antinuke_configs
  add column if not exists log_channel_id text null;

alter table public.antinuke_whitelist_users
  add column if not exists features text[] not null default '{}'::text[];

update public.antinuke_whitelist_users
set features = array[
  'channel_delete',
  'role_delete',
  'member_ban',
  'member_kick',
  'emoji_delete',
  'webhook_create',
  'webhook_delete',
  'unverified_bot_add',
  'nightmode_channel_create',
  'nightmode_role_create'
]::text[]
where features is null
   or coalesce(array_length(features, 1), 0) = 0;
