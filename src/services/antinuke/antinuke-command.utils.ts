import type { Message } from "discord.js";
import type { NexonClient } from "../../core/nexon-client";
import {
  buildBotContainerResponse,
  getClientAvatarUrl,
} from "../../ui/component-v2/container-response";

export function parseUserIdToken(rawValue?: string): string | null {
  if (!rawValue) {
    return null;
  }

  const mentionMatch = /^<@!?(\d+)>$/.exec(rawValue.trim());
  if (mentionMatch?.[1]) {
    return mentionMatch[1];
  }

  const normalized = rawValue.replace(/[<@!>]/g, "").trim();
  return /^\d+$/.test(normalized) ? normalized : null;
}

export function resolveTargetUserId(
  message: Message<true>,
  rawValue?: string,
): string | null {
  const parsed = parseUserIdToken(rawValue);
  if (parsed) {
    return parsed;
  }

  return message.mentions.users.first()?.id ?? null;
}

export async function hasAntinukeCommandAccess(input: {
  client: NexonClient;
  guildId: string;
  guildOwnerId: string;
  userId: string;
}): Promise<boolean> {
  const { client, guildId, guildOwnerId, userId } = input;

  if (userId === guildOwnerId) {
    return true;
  }

  const config = await client.antinukeService.getConfig(guildId);
  if (config.extraOwnerId && config.extraOwnerId === userId) {
    return true;
  }

  return false;
}

export async function ensureAntinukeCommandAccess(input: {
  client: NexonClient;
  message: Message<true>;
  title?: string;
}): Promise<boolean> {
  const { client, message, title } = input;

  const guildId = message.guildId;
  if (!guildId) {
    return false;
  }

  const allowed = await hasAntinukeCommandAccess({
    client,
    guildId,
    guildOwnerId: message.guild.ownerId,
    userId: message.author.id,
  });

  if (allowed) {
    return true;
  }

  await message.reply(
    buildBotContainerResponse({
      avatarUrl: getClientAvatarUrl(client),
      title: title ?? "Nexon Security",
      body: "Only server owner or configured extra owner can use Antinuke commands.",
    }),
  );

  return false;
}
