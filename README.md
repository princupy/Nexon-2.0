# Nexon

Nexon is a Discord bot project built with TypeScript, Discord Components V2, and Supabase.

## Project Status

**In Active Development**

This repository currently contains the core architecture and foundational modules.  
Features are being added incrementally, tested, and refined.

## Current Foundation

- Prefix-based command system (default: `N!`)
- Per-server custom prefix management
- Components V2 response framework
- Centralized handlers/loaders/events architecture
- Supabase integration for persistent guild configuration

## Current Commands

- `N!ping`
- `N!prefix`
- `N!prefix set <newPrefix>` (`Manage Server` or `Administrator` required)
- `N!prefix reset` (`Manage Server` or `Administrator` required)

## Planned Expansion

- Moderation modules
- Utility and server-management tools
- Ticketing and automation systems
- Additional dashboard-style Components V2 interfaces

## Quick Start

```bash
npm install
cp .env.example .env
```

Populate `.env`:

- `DISCORD_TOKEN`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Run Supabase migration:

- `supabase/migrations/20260214_guild_configs.sql`

Run in development:

```bash
npm run dev
```

Build and run:

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

- Components V2 messages require `MessageFlags.IsComponentsV2`.
- Slash commands are currently disabled.
