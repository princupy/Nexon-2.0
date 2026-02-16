import { ButtonBuilder, ButtonStyle, type TextBasedChannel, type User } from "discord.js";
import { env } from "../../config/env";
import { logger } from "../../core/logger";
import type { NexonClient } from "../../core/nexon-client";
import type { NoPrefixUserRow } from "../supabase/repositories/noprefix-user.repository";
import {
  buildBotContainerResponse,
  getClientAvatarUrl,
} from "../../ui/component-v2/container-response";

const NOPREFIX_EXPIRY_SWEEP_MS = 60_000;

type SendableTextChannel = TextBasedChannel & {
  send: (payload: unknown) => Promise<unknown>;
};

function resolveOwnerMention(client: NexonClient): string {
  const ownerId = [...client.botOwnerIds][0];
  return ownerId ? `<@${ownerId}>` : "the bot owner";
}

function buildContactButton(): ButtonBuilder {
  return new ButtonBuilder()
    .setLabel("Contact Support")
    .setStyle(ButtonStyle.Link)
    .setURL(env.SUPPORT_SERVER_INVITE_URL);
}

function buildNoPrefixExpiryDmMessage(input: {
  client: NexonClient;
  ownerMention: string;
}) {
  return buildBotContainerResponse({
    avatarUrl: getClientAvatarUrl(input.client),
    title: "No Prefix Expired",
    body: [
      "Your no-prefix access has expired.",
      `Please contact ${input.ownerMention} to renew access.`,
    ].join("\n"),
    actionRows: [[buildContactButton()]],
  });
}

function buildNoPrefixExpiryFallbackMessage(input: {
  client: NexonClient;
  userId: string;
  ownerMention: string;
}) {
  return buildBotContainerResponse({
    avatarUrl: getClientAvatarUrl(input.client),
    title: "No Prefix Expired",
    body: [
      `<@${input.userId}> your no-prefix access has expired.`,
      `Please contact ${input.ownerMention} to renew access.`,
      "Direct message could not be delivered, so this is posted here.",
    ].join("\n"),
    actionRows: [[buildContactButton()]],
  });
}

async function resolveUser(client: NexonClient, userId: string): Promise<User | null> {
  const cached = client.users.cache.get(userId);
  if (cached) {
    return cached;
  }

  return client.users.fetch(userId).catch(() => null);
}

async function resolveFallbackChannel(
  client: NexonClient,
  row: NoPrefixUserRow,
): Promise<SendableTextChannel | null> {
  const channelId = row.added_channel_id?.trim();
  if (!channelId || !/^\d+$/.test(channelId)) {
    return null;
  }

  const channel =
    client.channels.cache.get(channelId) ??
    (await client.channels.fetch(channelId).catch(() => null));

  if (!channel?.isTextBased() || channel.isDMBased()) {
    return null;
  }

  if (
    row.added_guild_id &&
    "guildId" in channel &&
    typeof channel.guildId === "string" &&
    channel.guildId !== row.added_guild_id
  ) {
    return null;
  }

  return channel as SendableTextChannel;
}

async function notifyNoPrefixExpiry(
  client: NexonClient,
  row: NoPrefixUserRow,
): Promise<void> {
  const ownerMention = resolveOwnerMention(client);
  const user = await resolveUser(client, row.user_id);

  if (user) {
    try {
      await user.send(
        buildNoPrefixExpiryDmMessage({
          client,
          ownerMention,
        }),
      );
      return;
    } catch {
      // Fall back to source channel below.
    }
  }

  const fallbackChannel = await resolveFallbackChannel(client, row);
  if (!fallbackChannel) {
    return;
  }

  await fallbackChannel.send(
    buildNoPrefixExpiryFallbackMessage({
      client,
      userId: row.user_id,
      ownerMention,
    }),
  );
}

async function runNoPrefixExpirySweep(client: NexonClient): Promise<void> {
  const expiredRows = await client.ownerControlService.consumeExpiredNoPrefixUsers();
  if (!expiredRows.length) {
    return;
  }

  for (const row of expiredRows) {
    try {
      await notifyNoPrefixExpiry(client, row);
    } catch (error) {
      logger.warn(`Failed to send no-prefix expiry notice for ${row.user_id}.`, error);
    }
  }

  logger.info(`Processed ${expiredRows.length} expired no-prefix user(s).`);
}

let isSweepRunning = false;

async function sweepNoPrefixExpiries(client: NexonClient): Promise<void> {
  if (isSweepRunning) {
    return;
  }

  isSweepRunning = true;
  try {
    await runNoPrefixExpirySweep(client);
  } finally {
    isSweepRunning = false;
  }
}

export function startNoPrefixExpiryNotifier(client: NexonClient): void {
  void sweepNoPrefixExpiries(client);

  const timer = setInterval(() => {
    void sweepNoPrefixExpiries(client);
  }, NOPREFIX_EXPIRY_SWEEP_MS);

  timer.unref();
}
