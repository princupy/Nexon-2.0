import {
  Client,
  Collection,
  GatewayIntentBits,
  Partials,
  type Snowflake,
} from "discord.js";
import { env } from "../config/env";
import { AntinukeService } from "../services/antinuke/antinuke.service";
import { AfkService } from "../services/general/afk.service";
import { OwnerControlService } from "../services/owner/owner-control.service";
import { PrefixService } from "../services/prefix/prefix-service";
import { supabase } from "../services/supabase/client";
import { AntinukeConfigRepository } from "../services/supabase/repositories/antinuke-config.repository";
import { AntinukeWhitelistUserRepository } from "../services/supabase/repositories/antinuke-whitelist-user.repository";
import { AfkEntryRepository } from "../services/supabase/repositories/afk-entry.repository";
import { BlacklistUserRepository } from "../services/supabase/repositories/blacklist-user.repository";
import { GreetConfigRepository } from "../services/supabase/repositories/greet-config.repository";
import { GuildConfigRepository } from "../services/supabase/repositories/guild-config.repository";
import { NoPrefixUserRepository } from "../services/supabase/repositories/noprefix-user.repository";
import type {
  ButtonComponentHandler,
  ModalComponentHandler,
  SelectMenuComponentHandler,
} from "../types/component";
import type { PrefixCommand } from "../types/prefix-command";
import type { GreetEditorSession } from "../services/welcome/greet-editor.service";

function parseOwnerIds(rawValue: string): Set<string> {
  const ownerIds = new Set<string>();

  for (const token of rawValue.split(",")) {
    const normalized = token.trim();
    if (/^\d+$/.test(normalized)) {
      ownerIds.add(normalized);
    }
  }

  return ownerIds;
}

export class NexonClient extends Client {
  public readonly prefixCommands = new Collection<string, PrefixCommand>();
  public readonly greetEditorSessions = new Collection<string, GreetEditorSession>();

  public readonly buttonHandlers = new Collection<
    string,
    ButtonComponentHandler
  >();
  public readonly buttonRegexHandlers: ButtonComponentHandler[] = [];

  public readonly selectMenuHandlers = new Collection<
    string,
    SelectMenuComponentHandler
  >();
  public readonly selectMenuRegexHandlers: SelectMenuComponentHandler[] = [];

  public readonly modalHandlers = new Collection<string, ModalComponentHandler>();
  public readonly modalRegexHandlers: ModalComponentHandler[] = [];

  public readonly supabase = supabase;
  public readonly repositories = {
    guildConfig: new GuildConfigRepository(this.supabase),
    greetConfig: new GreetConfigRepository(this.supabase),
    noPrefixUser: new NoPrefixUserRepository(this.supabase),
    blacklistUser: new BlacklistUserRepository(this.supabase),
    antinukeConfig: new AntinukeConfigRepository(this.supabase),
    antinukeWhitelistUser: new AntinukeWhitelistUserRepository(this.supabase),
    afkEntry: new AfkEntryRepository(this.supabase),
  };

  public readonly prefixService = new PrefixService(this.repositories.guildConfig);
  public readonly ownerControlService = new OwnerControlService(
    this.repositories.noPrefixUser,
    this.repositories.blacklistUser,
  );
  public readonly antinukeService = new AntinukeService(
    this.repositories.antinukeConfig,
    this.repositories.antinukeWhitelistUser,
  );
  public readonly afkService = new AfkService(this.repositories.afkEntry);

  public readonly cooldowns = new Collection<string, Collection<Snowflake, number>>();

  private readonly configuredOwnerIds: Set<string>;
  public readonly botOwnerIds: Set<string>;
  private ownerIdsHydrated = false;

  public constructor() {
    super({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildModeration,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
      ],
      partials: [Partials.Channel],
    });

    this.configuredOwnerIds = parseOwnerIds(env.BOT_OWNER_IDS);
    this.botOwnerIds = new Set(this.configuredOwnerIds);
  }

  public async isBotOwner(userId: string): Promise<boolean> {
    await this.hydrateBotOwnerIds();
    return this.botOwnerIds.has(userId);
  }

  private async hydrateBotOwnerIds(): Promise<void> {
    if (this.ownerIdsHydrated) {
      return;
    }

    const application = this.application;
    if (!application) {
      return;
    }

    this.ownerIdsHydrated = true;

    const resolvedApplication = await application.fetch().catch(() => application);
    const owner = resolvedApplication.owner;

    if (!owner) {
      return;
    }

    if ("members" in owner) {
      for (const member of owner.members.values()) {
        this.botOwnerIds.add(member.id);
      }
      return;
    }

    this.botOwnerIds.add(owner.id);
  }
}
