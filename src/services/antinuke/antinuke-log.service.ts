import {
  ChannelType,
  PermissionFlagsBits,
  type Guild,
  type GuildBasedChannel,
  type GuildTextBasedChannel,
} from "discord.js";
import { env } from "../../config/env";
import { logger } from "../../core/logger";
import type { NexonClient } from "../../core/nexon-client";
import {
  buildBotContainerResponse,
  getClientAvatarUrl,
} from "../../ui/component-v2/container-response";

const ANTINUKE_LOG_CHANNEL_NAME = "nexon-antinuke-logs";

type SendableGuildTextChannel = GuildTextBasedChannel & {
  send: (payload: unknown) => Promise<unknown>;
};

function isSendableGuildChannel(
  channel: GuildBasedChannel | null,
): channel is SendableGuildTextChannel {
  return Boolean(channel && channel.isTextBased());
}

function canBotSend(guild: Guild, channel: GuildTextBasedChannel): boolean {
  const botMember = guild.members.me;
  if (!botMember || !("permissionsFor" in channel)) {
    return true;
  }

  const permissions = channel.permissionsFor(botMember);
  return Boolean(
    permissions?.has(PermissionFlagsBits.ViewChannel) &&
      permissions.has(PermissionFlagsBits.SendMessages),
  );
}

async function resolveChannelById(
  guild: Guild,
  channelId: string,
): Promise<SendableGuildTextChannel | null> {
  const cached = guild.channels.cache.get(channelId) ?? null;
  if (cached && isSendableGuildChannel(cached) && canBotSend(guild, cached)) {
    return cached;
  }

  const fetched = await guild.channels.fetch(channelId).catch(() => null);
  if (fetched && isSendableGuildChannel(fetched) && canBotSend(guild, fetched)) {
    return fetched;
  }

  return null;
}

async function persistLogChannelId(input: {
  client: NexonClient;
  guildId: string;
  channelId: string;
  requestedById: string;
}): Promise<void> {
  try {
    await input.client.antinukeService.setLogChannelId(
      input.guildId,
      input.channelId,
      input.requestedById,
    );
  } catch (error) {
    logger.debug("Failed to persist antinuke log channel id.", error);
  }
}

async function createHiddenLogChannel(input: {
  client: NexonClient;
  guild: Guild;
  requestedById: string;
}): Promise<SendableGuildTextChannel | null> {
  const { client, guild, requestedById } = input;
  const config = await client.antinukeService.getConfig(guild.id);
  const me = guild.members.me ?? (await guild.members.fetchMe().catch(() => null));

  if (!me) {
    return null;
  }

  const permissionOverwrites = [
    {
      id: guild.roles.everyone.id,
      deny: [PermissionFlagsBits.ViewChannel],
    },
    {
      id: me.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
      ],
    },
    {
      id: guild.ownerId,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
      ],
    },
    ...(config.extraOwnerId
      ? [
          {
            id: config.extraOwnerId,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.ReadMessageHistory,
            ],
          },
        ]
      : []),
  ];

  const created = await guild.channels
    .create({
      name: ANTINUKE_LOG_CHANNEL_NAME,
      type: ChannelType.GuildText,
      topic: "Nexon antinuke security and configuration logs.",
      reason: "Auto-created for antinuke security logging.",
      permissionOverwrites,
    })
    .catch(() => null);

  if (!created || !isSendableGuildChannel(created) || !canBotSend(guild, created)) {
    return null;
  }

  await persistLogChannelId({
    client,
    guildId: guild.id,
    channelId: created.id,
    requestedById,
  });

  return created;
}

export async function resolveAntinukeLogChannel(input: {
  client: NexonClient;
  guild: Guild;
  createIfMissing?: boolean;
  requestedById?: string;
}): Promise<SendableGuildTextChannel | null> {
  const { client, guild, createIfMissing = false } = input;
  const requestedById = input.requestedById ?? guild.ownerId;

  const config = await client.antinukeService.getConfig(guild.id);

  if (config.logChannelId && /^\d+$/.test(config.logChannelId)) {
    const configured = await resolveChannelById(guild, config.logChannelId);
    if (configured) {
      return configured;
    }
  }

  const envChannelId = env.ANTINUKE_LOG_CHANNEL_ID.trim();
  if (envChannelId.length > 0) {
    const envChannel = await resolveChannelById(guild, envChannelId);
    if (envChannel) {
      await persistLogChannelId({
        client,
        guildId: guild.id,
        channelId: envChannel.id,
        requestedById,
      });
      return envChannel;
    }
  }

  const namedChannel = guild.channels.cache.find((channel) =>
    channel.type === ChannelType.GuildText && channel.name === ANTINUKE_LOG_CHANNEL_NAME,
  );

  if (namedChannel && isSendableGuildChannel(namedChannel) && canBotSend(guild, namedChannel)) {
    await persistLogChannelId({
      client,
      guildId: guild.id,
      channelId: namedChannel.id,
      requestedById,
    });
    return namedChannel;
  }

  if (!createIfMissing) {
    return null;
  }

  return createHiddenLogChannel({
    client,
    guild,
    requestedById,
  });
}

export async function ensureAntinukeLogChannel(input: {
  client: NexonClient;
  guild: Guild;
  requestedById: string;
}): Promise<SendableGuildTextChannel | null> {
  return resolveAntinukeLogChannel({
    client: input.client,
    guild: input.guild,
    createIfMissing: true,
    requestedById: input.requestedById,
  });
}

export async function sendAntinukeLogCard(input: {
  client: NexonClient;
  guild: Guild;
  title: string;
  bodyLines: string[];
  requestedById?: string;
  createChannelIfMissing?: boolean;
}): Promise<void> {
  try {
    const channel = await resolveAntinukeLogChannel({
      client: input.client,
      guild: input.guild,
      createIfMissing: input.createChannelIfMissing === true,
      ...(input.requestedById ? { requestedById: input.requestedById } : {}),
    });

    if (!channel) {
      return;
    }

    await channel.send(
      buildBotContainerResponse({
        avatarUrl: getClientAvatarUrl(input.client),
        title: input.title,
        body: input.bodyLines.join("\n"),
      }),
    );
  } catch (error) {
    logger.debug("Failed to send antinuke log card.", error);
  }
}

export async function grantAntinukeLogChannelAccess(input: {
  client: NexonClient;
  guild: Guild;
  userId: string;
  requestedById: string;
}): Promise<void> {
  try {
    const channel = await resolveAntinukeLogChannel({
      client: input.client,
      guild: input.guild,
      createIfMissing: false,
      requestedById: input.requestedById,
    });

    if (!channel || !("permissionOverwrites" in channel)) {
      return;
    }

    await channel.permissionOverwrites.edit(input.userId, {
      ViewChannel: true,
      SendMessages: true,
      ReadMessageHistory: true,
    }).catch(() => null);
  } catch (error) {
    logger.debug("Failed to grant antinuke log channel access.", error);
  }
}

export async function revokeAntinukeLogChannelAccess(input: {
  client: NexonClient;
  guild: Guild;
  userId: string;
  requestedById: string;
}): Promise<void> {
  try {
    const channel = await resolveAntinukeLogChannel({
      client: input.client,
      guild: input.guild,
      createIfMissing: false,
      requestedById: input.requestedById,
    });

    if (!channel || !("permissionOverwrites" in channel)) {
      return;
    }

    await channel.permissionOverwrites.delete(input.userId).catch(() => null);
  } catch (error) {
    logger.debug("Failed to revoke antinuke log channel access.", error);
  }
}
