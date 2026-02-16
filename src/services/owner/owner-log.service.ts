import type { TextBasedChannel, User } from "discord.js";
import { env } from "../../config/env";
import { logger } from "../../core/logger";
import type { NexonClient } from "../../core/nexon-client";
import { getClientAvatarUrl } from "../../ui/component-v2/container-response";
import { buildNoPrefixLogCardMessage } from "../../ui/component-v2/no-prefix-log-card";

type SendableTextChannel = TextBasedChannel & {
  send: (payload: unknown) => Promise<unknown>;
};

function resolveLogChannelId(): string | null {
  const raw = env.NOPREFIX_LOG_CHANNEL_ID.trim();
  if (!/^\d+$/.test(raw)) {
    return null;
  }

  return raw;
}

async function resolveUser(client: NexonClient, userId: string): Promise<User | null> {
  const cached = client.users.cache.get(userId);
  if (cached) {
    return cached;
  }

  return client.users.fetch(userId).catch(() => null);
}

function toUserLabel(user: User | null, userId: string): string {
  if (!user) {
    return `<@${userId}> (${userId})`;
  }

  return `${user.username} <@${userId}>`;
}

function toExpiryLabel(value?: string | null): string {
  if (!value) {
    return "Lifetime";
  }

  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) {
    return value;
  }

  const unix = Math.floor(timestamp / 1000);
  return `<t:${unix}:F> (<t:${unix}:R>)`;
}

async function resolveLogChannel(client: NexonClient): Promise<SendableTextChannel | null> {
  const channelId = resolveLogChannelId();
  if (!channelId) {
    return null;
  }

  const channel =
    client.channels.cache.get(channelId) ??
    (await client.channels.fetch(channelId).catch(() => null));

  if (!channel?.isTextBased() || channel.isDMBased()) {
    return null;
  }

  return channel as SendableTextChannel;
}

export async function sendNoPrefixLog(input: {
  client: NexonClient;
  action: string;
  guildId: string;
  moderatorId: string;
  targetUserId: string;
  previousExpiry?: string | null;
  updatedExpiry?: string | null;
  durationLabel?: string | null;
  note?: string;
}): Promise<void> {
  try {
    const channel = await resolveLogChannel(input.client);
    if (!channel) {
      return;
    }

    const [guild, targetUser, moderatorUser] = await Promise.all([
      input.client.guilds.fetch(input.guildId).catch(() => null),
      resolveUser(input.client, input.targetUserId),
      resolveUser(input.client, input.moderatorId),
    ]);

    const loggedAtUnix = Math.floor(Date.now() / 1000);

    await channel.send(
      buildNoPrefixLogCardMessage({
        avatarUrl: getClientAvatarUrl(input.client),
        action: input.action,
        guildLabel: guild ? `${guild.name} (${guild.id})` : input.guildId,
        userLabel: toUserLabel(targetUser, input.targetUserId),
        moderatorLabel: toUserLabel(moderatorUser, input.moderatorId),
        previousExpiry: toExpiryLabel(input.previousExpiry),
        updatedExpiry: toExpiryLabel(input.updatedExpiry),
        durationLabel: input.durationLabel ?? "N/A",
        ...(input.note ? { note: input.note } : {}),
        loggedAtUnix,
      }),
    );
  } catch (error) {
    logger.warn("Failed to send no-prefix log message.", error);
  }
}
