import {
  ContainerBuilder,
  TextDisplayBuilder,
} from "@discordjs/builders";
import {
  ChannelType,
  MessageFlags,
  OverwriteType,
  type Guild,
  type GuildBasedChannel,
} from "discord.js";
import type { PrefixCommand } from "../../types/prefix-command";
import {
  buildBotContainerResponse,
  buildV2Section,
  buildV2Separator,
  getClientAvatarUrl,
} from "../../ui/component-v2/container-response";

function parseChannelIdToken(rawValue?: string): string | null {
  if (!rawValue) {
    return null;
  }

  const mentionMatch = /^<#(\d+)>$/.exec(rawValue.trim());
  if (mentionMatch?.[1]) {
    return mentionMatch[1];
  }

  const normalized = rawValue.replace(/[<#>]/g, "").trim();
  return /^\d+$/.test(normalized) ? normalized : null;
}

function findChannelByName(guild: Guild, nameInput: string): GuildBasedChannel | null {
  const normalized = nameInput.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  const exact = guild.channels.cache.find(
    (channel) => channel.name.toLowerCase() === normalized,
  );
  if (exact) {
    return exact;
  }

  return (
    guild.channels.cache.find((channel) =>
      channel.name.toLowerCase().includes(normalized),
    ) ?? null
  );
}

function resolveTargetChannel(
  guild: Guild,
  args: string[],
  mentionedChannel: GuildBasedChannel | null,
  fallbackChannelId: string,
): GuildBasedChannel | null {
  if (mentionedChannel) {
    return mentionedChannel;
  }

  const raw = args.join(" ").trim();
  const parsedId = parseChannelIdToken(raw);
  if (parsedId) {
    const byId = guild.channels.cache.get(parsedId);
    if (byId) {
      return byId;
    }
  }

  if (raw.length > 0) {
    const byName = findChannelByName(guild, raw);
    if (byName) {
      return byName;
    }
  }

  return guild.channels.cache.get(fallbackChannelId) ?? null;
}

function formatChannelType(type: ChannelType): string {
  switch (type) {
    case ChannelType.GuildText:
      return "Text Channel";
    case ChannelType.GuildVoice:
      return "Voice Channel";
    case ChannelType.GuildCategory:
      return "Category";
    case ChannelType.GuildAnnouncement:
      return "Announcement Channel";
    case ChannelType.AnnouncementThread:
      return "Announcement Thread";
    case ChannelType.PublicThread:
      return "Public Thread";
    case ChannelType.PrivateThread:
      return "Private Thread";
    case ChannelType.GuildStageVoice:
      return "Stage Channel";
    case ChannelType.GuildForum:
      return "Forum Channel";
    case ChannelType.GuildMedia:
      return "Media Channel";
    default:
      return "Unknown";
  }
}

function formatSeconds(value: number | null | undefined): string {
  if (!value || value <= 0) {
    return "Off";
  }

  const days = Math.floor(value / 86_400);
  const hours = Math.floor((value % 86_400) / 3_600);
  const minutes = Math.floor((value % 3_600) / 60);
  const seconds = value % 60;

  const parts: string[] = [];
  if (days > 0) {
    parts.push(`${days}d`);
  }
  if (hours > 0 || parts.length > 0) {
    parts.push(`${hours}h`);
  }
  if (minutes > 0 || parts.length > 0) {
    parts.push(`${minutes}m`);
  }
  if (seconds > 0 || parts.length === 0) {
    parts.push(`${seconds}s`);
  }

  return parts.join(" ");
}

function formatMinutes(value: number | null | undefined): string {
  if (!value || value <= 0) {
    return "Off";
  }

  if (value % 1_440 === 0) {
    const days = value / 1_440;
    return `${days} day${days === 1 ? "" : "s"}`;
  }

  if (value % 60 === 0) {
    const hours = value / 60;
    return `${hours} hour${hours === 1 ? "" : "s"}`;
  }

  return `${value} minutes`;
}

function formatOverwriteSummary(channel: GuildBasedChannel): string {
  if (!("permissionOverwrites" in channel)) {
    return "### Permission Overwrites\n> Not available for this channel type.";
  }

  const entries = [...channel.permissionOverwrites.cache.values()];
  const roleCount = entries.filter((entry) => entry.type === OverwriteType.Role).length;
  const memberCount = entries.filter((entry) => entry.type === OverwriteType.Member).length;

  if (!entries.length) {
    return [
      "### Permission Overwrites",
      "> **Total:** 0",
      "> Uses server/category default permissions.",
    ].join("\n");
  }

  const visible = entries.slice(0, 8).map((entry) => {
    const target = entry.type === OverwriteType.Role
      ? `<@&${entry.id}>`
      : `<@${entry.id}>`;
    const allowCount = entry.allow.toArray().length;
    const denyCount = entry.deny.toArray().length;

    return `- ${target} (Allow: ${allowCount}, Deny: ${denyCount})`;
  });

  const overflowCount = Math.max(0, entries.length - visible.length);

  return [
    "### Permission Overwrites",
    `> **Total:** ${entries.length} (Roles: ${roleCount}, Members: ${memberCount})`,
    ...visible,
    ...(overflowCount > 0 ? [`- ...and ${overflowCount} more overwrite(s).`] : []),
  ].join("\n");
}

function formatSortOrder(sortOrder: number | null | undefined): string {
  if (sortOrder === null || sortOrder === undefined) {
    return "Default";
  }

  if (sortOrder === 0) {
    return "Latest Activity";
  }

  if (sortOrder === 1) {
    return "Creation Date";
  }

  return String(sortOrder);
}

function formatForumLayout(layout: number | null | undefined): string {
  if (layout === null || layout === undefined) {
    return "Default";
  }

  if (layout === 0) {
    return "Not Set";
  }

  if (layout === 1) {
    return "List View";
  }

  if (layout === 2) {
    return "Gallery View";
  }

  return String(layout);
}

function formatVideoQualityMode(mode: number | null | undefined): string {
  if (mode === null || mode === undefined) {
    return "Auto";
  }

  if (mode === 1) {
    return "Auto";
  }

  if (mode === 2) {
    return "Full";
  }

  return String(mode);
}

function formatChannelSpecificBlock(channel: GuildBasedChannel): string {
  switch (channel.type) {
    case ChannelType.GuildText:
    case ChannelType.GuildAnnouncement: {
      return [
        "### Text Settings",
        `> **Topic:** ${channel.topic ?? "None"}`,
        `> **NSFW:** ${channel.nsfw ? "Yes" : "No"}`,
        `> **Slowmode:** ${formatSeconds(channel.rateLimitPerUser)}`,
        `> **Default Thread Slowmode:** ${formatSeconds(channel.defaultThreadRateLimitPerUser)}`,
        `> **Default Auto Archive:** ${formatMinutes(channel.defaultAutoArchiveDuration ?? null)}`,
        `> **Active Threads (Cached):** ${channel.threads.cache.size}`,
      ].join("\n");
    }

    case ChannelType.GuildVoice:
    case ChannelType.GuildStageVoice: {
      const stageTopic = channel.type === ChannelType.GuildStageVoice
        ? channel.topic ?? "None"
        : "N/A";

      return [
        "### Voice Settings",
        `> **Topic:** ${stageTopic}`,
        `> **Bitrate:** ${(channel.bitrate / 1000).toFixed(0)} kbps`,
        `> **User Limit:** ${channel.userLimit > 0 ? channel.userLimit : "Unlimited"}`,
        `> **RTC Region:** ${channel.rtcRegion ?? "Auto"}`,
        `> **Video Quality:** ${formatVideoQualityMode(channel.videoQualityMode ?? null)}`,
        `> **Connected Members:** ${channel.members.size}`,
        `> **NSFW:** ${channel.nsfw ? "Yes" : "No"}`,
        `> **Slowmode:** ${formatSeconds(channel.rateLimitPerUser)}`,
      ].join("\n");
    }

    case ChannelType.GuildForum:
    case ChannelType.GuildMedia: {
      const tagNames = channel.availableTags.map((tag) => tag.name);
      const visibleTags = tagNames.slice(0, 8);
      const tagOverflowCount = Math.max(0, tagNames.length - visibleTags.length);

      const defaultReaction = channel.defaultReactionEmoji
        ? (channel.defaultReactionEmoji.name ?? channel.defaultReactionEmoji.id ?? "None")
        : "None";

      const baseLines = [
        "### Forum Settings",
        `> **Topic:** ${channel.topic ?? "None"}`,
        `> **NSFW:** ${channel.nsfw ? "Yes" : "No"}`,
        `> **Available Tags:** ${tagNames.length}`,
        `> **Default Reaction:** ${defaultReaction}`,
        `> **Post Slowmode:** ${formatSeconds(channel.rateLimitPerUser)}`,
        `> **Default Thread Slowmode:** ${formatSeconds(channel.defaultThreadRateLimitPerUser)}`,
        `> **Default Auto Archive:** ${formatMinutes(channel.defaultAutoArchiveDuration)}`,
        `> **Sort Order:** ${formatSortOrder(channel.defaultSortOrder)}`,
        `> **Active Threads (Cached):** ${channel.threads.cache.size}`,
      ];

      if (visibleTags.length) {
        baseLines.push(`> **Top Tags:** ${visibleTags.join(", ")}`);
      }

      if (tagOverflowCount > 0) {
        baseLines.push(`> ...and ${tagOverflowCount} more tag(s).`);
      }

      if (channel.type === ChannelType.GuildForum) {
        baseLines.push(`> **Forum Layout:** ${formatForumLayout(channel.defaultForumLayout)}`);
      }

      return baseLines.join("\n");
    }

    case ChannelType.GuildCategory: {
      return [
        "### Category Settings",
        `> **Child Channels (Cached):** ${channel.children.cache.size}`,
        `> **Permissions Synced:** ${channel.permissionsLocked === null ? "No Parent" : channel.permissionsLocked ? "Yes" : "No"}`,
      ].join("\n");
    }

    case ChannelType.PublicThread:
    case ChannelType.PrivateThread:
    case ChannelType.AnnouncementThread: {
      return [
        "### Thread Settings",
        `> **Parent:** ${channel.parent ? channel.parent.toString() : "None"}`,
        `> **Owner:** <@${channel.ownerId}>`,
        `> **Archived:** ${channel.archived ? "Yes" : "No"}`,
        `> **Locked:** ${channel.locked ? "Yes" : "No"}`,
        `> **Invitable:** ${channel.invitable === null ? "N/A" : channel.invitable ? "Yes" : "No"}`,
        `> **Auto Archive:** ${formatMinutes(channel.autoArchiveDuration)}`,
        `> **Slowmode:** ${formatSeconds(channel.rateLimitPerUser)}`,
        `> **Messages (Cached):** ${channel.messageCount ?? 0}`,
        `> **Members (Cached):** ${channel.memberCount ?? 0}`,
        `> **Applied Tags:** ${channel.appliedTags.length}`,
      ].join("\n");
    }

    default:
      return "### Channel Settings\n> No additional settings available for this channel type.";
  }
}

const channelinfoCommand: PrefixCommand = {
  name: "channelinfo",
  aliases: ["ci", "cinfo"],
  description: "Shows complete information about a channel.",
  usage: "channelinfo [#channel|channelId|channelName]",
  usages: [
    "channelinfo",
    "channelinfo <#channel|channelId|channelName>",
  ],
  guildOnly: true,
  category: "Utility",
  group: "extra",
  async execute({ client, message, args, prefix }) {
    const guild = message.guild;
    const avatarUrl = getClientAvatarUrl(client);

    const mentionedChannel = message.mentions.channels.first();
    const guildMentionedChannel =
      mentionedChannel && "guildId" in mentionedChannel && mentionedChannel.guildId === guild.id
        ? (guild.channels.cache.get(mentionedChannel.id) ?? null)
        : null;

    const targetChannel = resolveTargetChannel(
      guild,
      args,
      guildMentionedChannel,
      message.channelId,
    );

    if (!targetChannel) {
      await message.reply(
        buildBotContainerResponse({
          avatarUrl,
          title: "Channel Info",
          body: [
            "Unable to find that channel.",
            `Usage: \`${prefix}channelinfo <#channel|channelId|channelName>\``,
          ].join("\n"),
        }),
      );
      return;
    }

    const createdTimestamp = targetChannel.createdTimestamp;
    const createdUnix = createdTimestamp ? Math.floor(createdTimestamp / 1000) : null;
    const position = "position" in targetChannel ? String(targetChannel.position) : "N/A";
    const permissionsLocked = "permissionsLocked" in targetChannel
      ? (targetChannel.permissionsLocked === null
        ? "No Parent"
        : targetChannel.permissionsLocked
          ? "Yes"
          : "No")
      : "N/A";

    const parentLabel = targetChannel.parent
      ? targetChannel.parent.toString()
      : "None";
    const viewable = "viewable" in targetChannel
      ? (targetChannel.viewable ? "Yes" : "No")
      : "Unknown";
    const manageable = "manageable" in targetChannel
      ? (targetChannel.manageable ? "Yes" : "No")
      : "Unknown";

    const flagList = targetChannel.flags.toArray();
    const flagsLabel = flagList.length ? flagList.join(", ") : "None";

    const aboutBlock = [
      "### Channel",
      `> **Name:** ${targetChannel.name}`,
      `> **Mention:** ${targetChannel.toString()}`,
      `> **ID:** ${targetChannel.id}`,
      `> **Type:** ${formatChannelType(targetChannel.type)}`,
      `> **Category:** ${parentLabel}`,
      `> **Position:** ${position}`,
      `> **Created At:** ${createdUnix ? `<t:${createdUnix}:F>` : "Unknown"}`,
      `> **Created:** ${createdUnix ? `<t:${createdUnix}:R>` : "Unknown"}`,
      `> **Jump URL:** ${targetChannel.url}`,
    ].join("\n");

    const accessBlock = [
      "### Access",
      `> **Viewable:** ${viewable}`,
      `> **Manageable:** ${manageable}`,
      `> **Permissions Synced:** ${permissionsLocked}`,
      `> **Flags:** ${flagsLabel}`,
    ].join("\n");

    const container = new ContainerBuilder()
      .addSectionComponents(
        buildV2Section({
          text: ["## Channel Information", "Detailed channel configuration and access card."],
          accessory: {
            type: "thumbnail",
            url:
              guild.iconURL({ extension: "png", size: 1024 }) ??
              avatarUrl,
          },
        }),
      )
      .addSeparatorComponents(buildV2Separator())
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(aboutBlock))
      .addSeparatorComponents(buildV2Separator())
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(accessBlock))
      .addSeparatorComponents(buildV2Separator())
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(formatChannelSpecificBlock(targetChannel)),
      )
      .addSeparatorComponents(buildV2Separator())
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(formatOverwriteSummary(targetChannel)),
      )
      .addSeparatorComponents(buildV2Separator())
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`Requested by <@${message.author.id}>`),
      );

    await message.reply({
      flags: MessageFlags.IsComponentsV2,
      components: [container],
    });
  },
};

export default channelinfoCommand;

