# Nexon

Discord all-in-one bot foundation in TypeScript with:

- `discord.js` + clean handlers/events architecture
- Supabase integration (`@supabase/supabase-js`)
- Discord Components V2-first messaging structure
- Default prefix `N!` + per-server custom prefix

## Quick Start

```bash
npm install
cp .env.example .env
```

Fill `.env`:

- `DISCORD_TOKEN`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Run SQL migration in Supabase:

- `supabase/migrations/20260214_guild_configs.sql`

Run in dev mode:

```bash
npm run dev
```

Build and start production:

```bash
npm run build
npm run start
```

## Folder Structure

```txt
src/
  commands/          # Prefix command modules (N!...)
  components/        # Button/select/modal handlers
  config/            # Environment configuration
  constants/         # Shared constants
  core/              # Client + logger
  events/            # Discord events
  handlers/          # Loaders + registries
  loaders/           # Generic dynamic module loader
  services/          # Supabase and repositories
  types/             # App contracts/interfaces
  ui/component-v2/   # Components V2 message builders
```

## Notes

- This setup is intentionally modular so we can add features one-by-one.
- Components V2 messages require `MessageFlags.IsComponentsV2` and are already wired in starter UI.
- This bot is configured as prefix-only (slash commands are disabled).
- Default server prefix: `N!`
- Prefix commands:
  - `N!ping`
  - `N!prefix`
  - `N!prefix set <newPrefix>` (`Manage Server` or `Administrator` required)
  - `N!prefix reset` (`Manage Server` or `Administrator` required)
