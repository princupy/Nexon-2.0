import {
  ContainerBuilder,
  TextDisplayBuilder,
} from "@discordjs/builders";
import {
  ChannelType,
  GuildVerificationLevel,
  MessageFlags,
  type Guild,
} from "discord.js";
import type { PrefixCommand } from "../../types/prefix-command";
import {
  buildV2Section,
  buildV2Separator,
  getClientAvatarUrl,
} from "../../ui/component-v2/container-response";

const FEATURE_LABELS: Record<string, string> = {
  ANIMATED_BANNER: "Animated banner",
  ANIMATED_ICON: "Animated icon",
  AUTO_MODERATION: "Auto moderation",
  BANNER: "Server banner",
  COMMUNITY: "Community",
  DEVELOPER_SUPPORT_SERVER: "Developer support server",
  DISCOVERABLE: "Discoverable",
  FEATURABLE: "Featurable",
  INVITES_DISABLED: "Invites disabled",
  MEMBER_VERIFICATION_GATE_ENABLED: "Membership screening",
  MONETIZATION_ENABLED: "Monetization enabled",
  MORE_STICKERS: "More stickers",
  NEW_THREAD_PERMISSIONS: "New thread permissions",
  PARTNERED: "Partnered",
  PREVIEW_ENABLED: "Preview enabled",
  PRIVATE_THREADS: "Private threads",
  ROLE_ICONS: "Role icons",
  SEVEN_DAY_THREAD_ARCHIVE: "7-day thread archive",
  TEXT_IN_VOICE_ENABLED: "Text in voice",
  THREE_DAY_THREAD_ARCHIVE: "3-day thread archive",
  TICKETED_EVENTS_ENABLED: "Ticketed events",
  VANITY_URL: "Vanity URL",
  VERIFIED: "Verified",
  VIP_REGIONS: "VIP voice regions",
  WELCOME_SCREEN_ENABLED: "Welcome screen",
};

function formatVerificationLevel(level: GuildVerificationLevel): string {
  switch (level) {
    case GuildVerificationLevel.None:
      return "none";
    case GuildVerificationLevel.Low:
      return "low";
    case GuildVerificationLevel.Medium:
      return "medium";
    case GuildVerificationLevel.High:
      return "high";
    case GuildVerificationLevel.VeryHigh:
      return "very high";
    default:
      return "unknown";
  }
}

function startCase(value: string): string {
  return value
    .toLowerCase()
    .split("_")
    .filter((chunk) => chunk.length > 0)
    .map((chunk) => `${chunk[0]?.toUpperCase() ?? ""}${chunk.slice(1)}`)
    .join(" ");
}

function formatFeature(feature: string): string {
  return FEATURE_LABELS[feature] ?? startCase(feature);
}

function resolveEmojiLimitPerType(premiumTier: number): number {
  switch (premiumTier) {
    case 1:
      return 100;
    case 2:
      return 150;
    case 3:
      return 250;
    default:
      return 50;
  }
}

function resolveChannelBreakdown(guild: Guild): {
  total: number;
  text: number;
  voice: number;
  category: number;
} {
  let text = 0;
  let voice = 0;
  let category = 0;

  for (const channel of guild.channels.cache.values()) {
    if (channel.type === ChannelType.GuildCategory) {
      category += 1;
      continue;
    }

    if (
      channel.type === ChannelType.GuildVoice ||
      channel.type === ChannelType.GuildStageVoice
    ) {
      voice += 1;
      continue;
    }

    if (
      channel.type === ChannelType.GuildText ||
      channel.type === ChannelType.GuildAnnouncement ||
      channel.type === ChannelType.GuildForum ||
      channel.type === ChannelType.GuildMedia
    ) {
      text += 1;
    }
  }

  return {
    total: guild.channels.cache.size,
    text,
    voice,
    category,
  };
}

const serverinfoCommand: PrefixCommand = {
  name: "serverinfo",
  aliases: ["si", "guildinfo"],
  description: "Shows complete server-related information.",
  usage: "serverinfo",
  usages: ["serverinfo"],
  guildOnly: true,
  category: "Utility",
  group: "extra",
  async execute({ client, message }) {
    const guild = message.guild;

    const owner = await guild.fetchOwner().catch(() => null);
    const createdUnix = Math.floor(guild.createdTimestamp / 1000);
    const ownerMention = owner ? `<@${owner.id}>` : "Unknown";

    const channels = resolveChannelBreakdown(guild);

    const roles = guild.roles.cache
      .sort((a, b) => b.position - a.position)
      .map((role) => role.toString());

    const visibleRoles = roles.slice(0, 20);
    const roleOverflowCount = Math.max(0, roles.length - visibleRoles.length);

    const emojis = guild.emojis.cache;
    const regularEmojis = emojis.filter((emoji) => !emoji.animated).size;
    const animatedEmojis = emojis.filter((emoji) => emoji.animated).size;
    const disabledRegular = emojis.filter(
      (emoji) => !emoji.animated && emoji.available === false,
    ).size;
    const disabledAnimated = emojis.filter(
      (emoji) => emoji.animated && emoji.available === false,
    ).size;

    const emojiLimitPerType = resolveEmojiLimitPerType(guild.premiumTier);
    const totalEmojiLimit = emojiLimitPerType * 2;

    const features = guild.features.length
      ? guild.features.map((feature) => `- [x] ${formatFeature(feature)}`).join("\n")
      : "- No special features enabled.";

    const requestedUnix = Math.floor(Date.now() / 1000);

    const aboutBlock = [
      "### About",
      `> **Name:** ${guild.name}`,
      `> **ID:** ${guild.id}`,
      `> **Owner:** ${ownerMention}`,
      `> **Created At:** <t:${createdUnix}:F>` ,
      `> **Members:** ${guild.memberCount.toLocaleString("en-US")}`,
    ].join("\n");

    const generalStatsBlock = [
      "### General Stats",
      `> **Verification Level:** ${formatVerificationLevel(guild.verificationLevel)}`,
      `> **Channels:** ${channels.total}`,
      `> **Roles:** ${guild.roles.cache.size}`,
      `> **Emojis:** ${emojis.size}`,
      `> **Boost Status:** Level ${guild.premiumTier} (Boosts: ${guild.premiumSubscriptionCount ?? 0})`,
    ].join("\n");

    const channelsBlock = [
      "### Channels",
      `> **Total:** ${channels.total}`,
      `> **Channels:** ${channels.text} text, ${channels.voice} voice, ${channels.category} categories`,
    ].join("\n");

    const emojisBlock = [
      "### Emoji Info",
      `> **Regular:** ${regularEmojis}/${emojiLimitPerType}`,
      `> **Animated:** ${animatedEmojis}/${emojiLimitPerType}`,
      `> **Disabled:** ${disabledRegular} regular, ${disabledAnimated} animated`,
      `> **Total Emoji:** ${emojis.size}/${totalEmojiLimit}`,
    ].join("\n");

    const boostBlock = [
      "### Boost Status",
      `> **Level:** ${guild.premiumTier} (${guild.premiumSubscriptionCount ?? 0} boosts)`,
    ].join("\n");

    const rolesBlock = [
      `### Server Roles [${guild.roles.cache.size}]`,
      visibleRoles.length ? visibleRoles.join("\n") : "No roles found.",
      ...(roleOverflowCount > 0 ? [`...and ${roleOverflowCount} more roles.`] : []),
    ].join("\n");

    const footerText = `Requested By ${message.author} - <t:${requestedUnix}:F>`;

    const container = new ContainerBuilder()
      .addSectionComponents(
        buildV2Section({
          text: [`## ${guild.name}'s Information`],
          accessory: {
            type: "thumbnail",
            url: guild.iconURL({ extension: "png", size: 1024 }) ?? getClientAvatarUrl(client),
          },
        }),
      )
      .addSeparatorComponents(buildV2Separator())
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(aboutBlock))
      .addSeparatorComponents(buildV2Separator())
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(generalStatsBlock))
      .addSeparatorComponents(buildV2Separator())
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(["### Features", features].join("\n")),
      )
      .addSeparatorComponents(buildV2Separator())
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(channelsBlock))
      .addSeparatorComponents(buildV2Separator())
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(emojisBlock))
      .addSeparatorComponents(buildV2Separator())
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(boostBlock))
      .addSeparatorComponents(buildV2Separator())
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(rolesBlock))
      .addSeparatorComponents(buildV2Separator())
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(footerText));

    await message.reply({
      flags: MessageFlags.IsComponentsV2,
      components: [container],
    });
  },
};

export default serverinfoCommand;
