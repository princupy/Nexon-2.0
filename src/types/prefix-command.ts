import type { Message } from "discord.js";
import type { NexonClient } from "../core/nexon-client";

export type PrefixCommandGroup = "main" | "extra";

export interface PrefixCommandHelpItem {
  title: string;
  description: string;
  usage?: string;
  usages?: string[];
  aliases?: string[];
}

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
  usage?: string;
  usages?: string[];
  helpItems?: PrefixCommandHelpItem[];
  category?: string;
  group?: PrefixCommandGroup;
  execute: (context: PrefixCommandContext) => Promise<void>;
}
