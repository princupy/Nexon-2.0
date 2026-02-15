import type { Message } from "discord.js";
import type { NexonClient } from "../core/nexon-client";

export interface PrefixCommandContext {
  client: NexonClient;
  message: Message<true>;
  args: string[];
  prefix: string;
}

export interface PrefixCommand {
  name: string;
  aliases?: string[];
  description: string;
  guildOnly?: boolean;
  adminOnly?: boolean;
  execute: (context: PrefixCommandContext) => Promise<void>;
}
