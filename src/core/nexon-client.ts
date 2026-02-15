import {
  Client,
  Collection,
  GatewayIntentBits,
  Partials,
  type Snowflake,
} from "discord.js";
import { PrefixService } from "../services/prefix/prefix-service";
import { supabase } from "../services/supabase/client";
import { GreetConfigRepository } from "../services/supabase/repositories/greet-config.repository";
import { GuildConfigRepository } from "../services/supabase/repositories/guild-config.repository";
import type {
  ButtonComponentHandler,
  ModalComponentHandler,
  SelectMenuComponentHandler,
} from "../types/component";
import type { PrefixCommand } from "../types/prefix-command";
import type { GreetEditorSession } from "../services/welcome/greet-editor.service";

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
  };
  public readonly prefixService = new PrefixService(this.repositories.guildConfig);

  public readonly cooldowns = new Collection<string, Collection<Snowflake, number>>();

  public constructor() {
    super({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
      ],
      partials: [Partials.Channel],
    });
  }
}
