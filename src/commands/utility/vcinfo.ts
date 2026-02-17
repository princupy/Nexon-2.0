import {
  ContainerBuilder,
  TextDisplayBuilder,
} from "@discordjs/builders";
import {
  ChannelType,
  MessageFlags,
  OverwriteType,
  type Guild,
  type GuildMember,
  type StageChannel,
  type VoiceChannel,
} from "discord.js";
import type { PrefixCommand, PrefixCommandContext } from "../../types/prefix-command";
import {
  buildBotContainerResponse,
  buildV2Section,
  buildV2Separator,
  getClientAvatarUrl,
} from "../../ui/component-v2/container-response";

type VoiceLikeChannel = VoiceChannel | StageChannel;

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

function parseUserIdToken(rawValue?: string): string | null {
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

function isVoiceLikeChannel(channel: unknown): channel is VoiceLikeChannel {
  return (
    typeof channel === "object" &&
    channel !== null &&
    "type" in channel &&
    ((channel.type === ChannelType.GuildVoice) ||
      (channel.type === ChannelType.GuildStageVoice))
  );
}

function findVoiceChannelByName(guild: Guild, nameInput: string): VoiceLikeChannel | null {
  const normalized = nameInput.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  const exact = guild.channels.cache.find(
    (channel) =>
      isVoiceLikeChannel(channel) && channel.name.toLowerCase() === normalized,
  );

  if (exact && isVoiceLikeChannel(exact)) {
    return exact;
  }

  const partial = guild.channels.cache.find(
    (channel) =>
      isVoiceLikeChannel(channel) &&
      channel.name.toLowerCase().includes(normalized),
  );

  return partial && isVoiceLikeChannel(partial) ? partial : null;
}

function resolveMentionedVoiceChannel(
  guild: Guild,
  message: PrefixCommandContext["message"],
): VoiceLikeChannel | null {
  const mentioned = message.mentions.channels.first();
  if (!mentioned || !("guildId" in mentioned) || mentioned.guildId !== guild.id) {
    return null;
  }

  const channel = guild.channels.cache.get(mentioned.id);
  return channel && isVoiceLikeChannel(channel) ? channel : null;
}

async function resolveVoiceChannelByUserId(
  guild: Guild,
  userId: string,
): Promise<VoiceLikeChannel | null> {
  const voiceState = await guild.voiceStates.fetch(userId).catch(() => null);
  const channelId = voiceState?.channelId;
  if (!channelId) {
    return null;
  }

  const cachedChannel = guild.channels.cache.get(channelId);
  if (cachedChannel && isVoiceLikeChannel(cachedChannel)) {
    return cachedChannel;
  }

  const fetchedChannel = await guild.channels.fetch(channelId).catch(() => null);
  return fetchedChannel && isVoiceLikeChannel(fetchedChannel)
    ? fetchedChannel
    : null;
}

async function resolveTargetVoiceChannel(input: {
  guild: Guild;
  message: PrefixCommandContext["message"];
  args: string[];
}): Promise<VoiceLikeChannel | null> {
  const mentionedVoiceChannel = resolveMentionedVoiceChannel(input.guild, input.message);
  if (mentionedVoiceChannel) {
    return mentionedVoiceChannel;
  }

  const raw = input.args.join(" ").trim();

  if (raw.length > 0) {
    const parsedChannelId = parseChannelIdToken(raw);
    if (parsedChannelId) {
      const byId = input.guild.channels.cache.get(parsedChannelId);
      if (byId && isVoiceLikeChannel(byId)) {
        return byId;
      }
    }

    const byName = findVoiceChannelByName(input.guild, raw);
    if (byName) {
      return byName;
    }
  }

  const mentionedMember = input.message.mentions.members.first();
  if (mentionedMember) {
    const mentionedMemberChannel = mentionedMember.voice.channel;
    if (mentionedMemberChannel && isVoiceLikeChannel(mentionedMemberChannel)) {
      return mentionedMemberChannel;
    }

    const fetchedMentionedMemberChannel = await resolveVoiceChannelByUserId(
      input.guild,
      mentionedMember.id,
    );
    if (fetchedMentionedMemberChannel) {
      return fetchedMentionedMemberChannel;
    }
  }

  if (raw.length > 0) {
    const parsedUserId = parseUserIdToken(raw);
    if (parsedUserId) {
      const parsedUserChannel = await resolveVoiceChannelByUserId(
        input.guild,
        parsedUserId,
      );
      if (parsedUserChannel) {
        return parsedUserChannel;
      }
    }
  }

  const authorVoiceChannel = input.message.member?.voice.channel ?? null;
  if (authorVoiceChannel && isVoiceLikeChannel(authorVoiceChannel)) {
    return authorVoiceChannel;
  }

  return resolveVoiceChannelByUserId(input.guild, input.message.author.id);
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

function formatOverwriteSummary(channel: VoiceLikeChannel): string {
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

function resolveVoiceFlags(member: GuildMember): string {
  const states: string[] = [];

  if (member.voice.serverMute || member.voice.selfMute) {
    states.push("Muted");
  }
  if (member.voice.serverDeaf || member.voice.selfDeaf) {
    states.push("Deafened");
  }
  if (member.voice.streaming) {
    states.push("Streaming");
  }
  if (member.voice.selfVideo) {
    states.push("Video");
  }
  if (member.voice.suppress) {
    states.push("Suppressed");
  }

  return states.length ? states.join(", ") : "Active";
}

function formatMembersBlock(channel: VoiceLikeChannel): string {
  const members = [...channel.members.values()];
  if (!members.length) {
    return "### Connected Members [0]\nNo members connected right now.";
  }

  const visible = members.slice(0, 20).map((member, index) => {
    return `${index + 1}. ${member} - ${resolveVoiceFlags(member)}`;
  });

  const overflowCount = Math.max(0, members.length - visible.length);

  return [
    `### Connected Members [${members.length}]`,
    ...visible,
    ...(overflowCount > 0 ? [`...and ${overflowCount} more member(s).`] : []),
  ].join("\n");
}

function formatLiveStatsBlock(channel: VoiceLikeChannel): string {
  const members = [...channel.members.values()];
  const humans = members.filter((member) => !member.user.bot).length;
  const bots = members.length - humans;

  const muted = members.filter(
    (member) => member.voice.serverMute || member.voice.selfMute,
  ).length;
  const deafened = members.filter(
    (member) => member.voice.serverDeaf || member.voice.selfDeaf,
  ).length;
  const streaming = members.filter((member) => member.voice.streaming).length;
  const cameraOn = members.filter((member) => member.voice.selfVideo).length;

  return [
    "### Live Stats",
    `> **Connected:** ${members.length}`,
    `> **Humans:** ${humans}`,
    `> **Bots:** ${bots}`,
    `> **Muted:** ${muted}`,
    `> **Deafened:** ${deafened}`,
    `> **Streaming:** ${streaming}`,
    `> **Camera On:** ${cameraOn}`,
  ].join("\n");
}

const vcinfoCommand: PrefixCommand = {
  name: "vcinfo",
  aliases: ["vci", "voiceinfo"],
  description: "Shows complete information about a voice or stage channel.",
  usage: "vcinfo [#voiceChannel|channelId|channelName|@user]",
  usages: [
    "vcinfo",
    "vcinfo <#voiceChannel|channelId|channelName>",
    "vcinfo <@user>",
  ],
  guildOnly: true,
  category: "Utility",
  group: "extra",
  async execute({ client, message, args, prefix }) {
    const guild = message.guild;
    const avatarUrl = getClientAvatarUrl(client);

    const targetChannel = await resolveTargetVoiceChannel({
      guild,
      message,
      args,
    });

    if (!targetChannel) {
      await message.reply(
        buildBotContainerResponse({
          avatarUrl,
          title: "VC Info",
          body: [
            "No voice/stage channel found.",
            `Usage: \`${prefix}vcinfo <#voiceChannel|channelId|channelName|@user>\``,
            "Tip: If you run without args, bot will check your current voice channel.",
          ].join("\n"),
        }),
      );
      return;
    }

    const createdTimestamp = targetChannel.createdTimestamp;
    const createdUnix = createdTimestamp
      ? Math.floor(createdTimestamp / 1000)
      : null;

    const channelType = targetChannel.type === ChannelType.GuildStageVoice
      ? "Stage Channel"
      : "Voice Channel";

    const aboutBlock = [
      "### Voice Channel",
      `> **Name:** ${targetChannel.name}`,
      `> **Mention:** ${targetChannel.toString()}`,
      `> **ID:** ${targetChannel.id}`,
      `> **Type:** ${channelType}`,
      `> **Category:** ${targetChannel.parent ? targetChannel.parent.toString() : "None"}`,
      `> **Position:** ${targetChannel.position}`,
      `> **Created At:** ${createdUnix ? `<t:${createdUnix}:F>` : "Unknown"}`,
      `> **Created:** ${createdUnix ? `<t:${createdUnix}:R>` : "Unknown"}`,
    ].join("\n");

    const settingsBlock = [
      "### Voice Settings",
      `> **Topic:** ${targetChannel.type === ChannelType.GuildStageVoice ? (targetChannel.topic ?? "None") : "N/A"}`,
      `> **Bitrate:** ${(targetChannel.bitrate / 1000).toFixed(0)} kbps`,
      `> **User Limit:** ${targetChannel.userLimit > 0 ? targetChannel.userLimit : "Unlimited"}`,
      `> **RTC Region:** ${targetChannel.rtcRegion ?? "Auto"}`,
      `> **Video Quality:** ${formatVideoQualityMode(targetChannel.videoQualityMode ?? null)}`,
      `> **NSFW:** ${targetChannel.nsfw ? "Yes" : "No"}`,
      `> **Slowmode:** ${formatSeconds(targetChannel.rateLimitPerUser)}`,
      `> **Full:** ${targetChannel.full ? "Yes" : "No"}`,
      `> **Joinable:** ${targetChannel.joinable ? "Yes" : "No"}`,
      `> **Viewable:** ${targetChannel.viewable ? "Yes" : "No"}`,
      `> **Manageable:** ${targetChannel.manageable ? "Yes" : "No"}`,
    ].join("\n");

    const container = new ContainerBuilder()
      .addSectionComponents(
        buildV2Section({
          text: ["## VC Information", "Detailed voice channel configuration and live status card."],
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
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(settingsBlock))
      .addSeparatorComponents(buildV2Separator())
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(formatLiveStatsBlock(targetChannel)),
      )
      .addSeparatorComponents(buildV2Separator())
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(formatMembersBlock(targetChannel)),
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

export default vcinfoCommand;

