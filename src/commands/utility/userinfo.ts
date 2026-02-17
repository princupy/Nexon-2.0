import {
  ContainerBuilder,
  TextDisplayBuilder,
} from "@discordjs/builders";
import {
  ActivityType,
  MessageFlags,
  PermissionFlagsBits,
  type GuildMember,
  type PresenceStatus,
  type User,
} from "discord.js";
import type { PrefixCommand, PrefixCommandContext } from "../../types/prefix-command";
import {
  buildBotContainerResponse,
  buildV2Section,
  buildV2Separator,
  getClientAvatarUrl,
} from "../../ui/component-v2/container-response";

const BADGE_LABELS: Record<string, string> = {
  ActiveDeveloper: "Active Developer",
  BugHunterLevel1: "Bug Hunter Level 1",
  BugHunterLevel2: "Bug Hunter Level 2",
  CertifiedModerator: "Certified Moderator",
  Collaborator: "Collaborator",
  DiscordCertifiedModerator: "Certified Moderator",
  HypeSquadOnlineHouse1: "HypeSquad Bravery",
  HypeSquadOnlineHouse2: "HypeSquad Brilliance",
  HypeSquadOnlineHouse3: "HypeSquad Balance",
  Hypesquad: "HypeSquad Events",
  Partner: "Discord Partner",
  PremiumEarlySupporter: "Early Supporter",
  Quarantined: "Quarantined",
  Spammer: "Spammer",
  Staff: "Discord Staff",
  TeamPseudoUser: "Team User",
  VerifiedBot: "Verified Bot",
  VerifiedDeveloper: "Early Verified Bot Developer",
};

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

function resolveTargetUserId(
  message: PrefixCommandContext["message"],
  rawValue?: string,
): string {
  const parsed = parseUserIdToken(rawValue);
  if (parsed) {
    return parsed;
  }

  const mention = message.mentions.users.first();
  return mention?.id ?? message.author.id;
}

function formatPresenceStatus(status: PresenceStatus | undefined): string {
  switch (status) {
    case "online":
      return "Online";
    case "idle":
      return "Idle";
    case "dnd":
      return "Do Not Disturb";
    case "invisible":
      return "Invisible";
    case "offline":
      return "Offline";
    default:
      return "Unknown";
  }
}

function formatActivityType(type: ActivityType): string {
  switch (type) {
    case ActivityType.Playing:
      return "Playing";
    case ActivityType.Streaming:
      return "Streaming";
    case ActivityType.Listening:
      return "Listening";
    case ActivityType.Watching:
      return "Watching";
    case ActivityType.Competing:
      return "Competing";
    case ActivityType.Custom:
      return "Custom";
    default:
      return "Activity";
  }
}

function formatActivitySummary(member: GuildMember | null): string {
  const activities = member?.presence?.activities ?? [];
  if (!activities.length) {
    return "No public activity.";
  }

  const rendered = activities.slice(0, 3).map((activity) => {
    if (activity.type === ActivityType.Custom) {
      return activity.state?.trim() || "Custom status";
    }

    const typeLabel = formatActivityType(activity.type);
    const activityName = activity.name?.trim() || "Unknown";
    const details = activity.details?.trim();

    return details
      ? `${typeLabel} ${activityName} (${details})`
      : `${typeLabel} ${activityName}`;
  });

  const overflowCount = Math.max(0, activities.length - rendered.length);
  return [
    ...rendered.map((line) => `- ${line}`),
    ...(overflowCount > 0 ? [`- ...and ${overflowCount} more activity item(s).`] : []),
  ].join("\n");
}

function humanizePermission(permission: string): string {
  return permission.replace(/([a-z])([A-Z])/g, "$1 $2");
}

function formatPermissionSummary(member: GuildMember | null): string {
  if (!member) {
    return "Member data unavailable in this server.";
  }

  if (member.permissions.has(PermissionFlagsBits.Administrator)) {
    return "Administrator (all permissions).";
  }

  const permissions = member.permissions
    .toArray()
    .filter((permission) => permission !== "Administrator")
    .map((permission) => humanizePermission(permission));

  if (!permissions.length) {
    return "No notable permissions.";
  }

  const visible = permissions.slice(0, 8);
  const overflowCount = Math.max(0, permissions.length - visible.length);

  return [
    visible.join(", "),
    ...(overflowCount > 0 ? [`(+${overflowCount} more)`] : []),
  ].join(" ");
}

function formatBadgeSummary(user: User): string {
  const badges = user.flags?.toArray().map((flag) => BADGE_LABELS[flag] ?? flag) ?? [];
  if (!badges.length) {
    return "None";
  }

  const visible = badges.slice(0, 6);
  const overflowCount = Math.max(0, badges.length - visible.length);

  return [
    visible.join(", "),
    ...(overflowCount > 0 ? [`(+${overflowCount} more)`] : []),
  ].join(" ");
}

function formatRolesBlock(member: GuildMember | null): string {
  if (!member) {
    return "### Roles [0]\nMember data unavailable in this server.";
  }

  const roles = member.roles.cache
    .filter((role) => role.id !== role.guild.id)
    .sort((a, b) => b.position - a.position)
    .map((role) => role.toString());

  if (!roles.length) {
    return "### Roles [0]\nNo roles assigned.";
  }

  const visibleRoles = roles.slice(0, 20);
  const overflowCount = Math.max(0, roles.length - visibleRoles.length);

  return [
    `### Roles [${roles.length}]`,
    visibleRoles.join("\n"),
    ...(overflowCount > 0 ? [`...and ${overflowCount} more role(s).`] : []),
  ].join("\n");
}

const userinfoCommand: PrefixCommand = {
  name: "userinfo",
  aliases: ["ui", "whois"],
  description: "Shows complete information about a user in this server.",
  usage: "userinfo [@user|userId]",
  usages: ["userinfo", "userinfo <@user|userId>"],
  guildOnly: true,
  category: "Utility",
  group: "extra",
  async execute({ client, message, args }) {
    const guild = message.guild;
    const avatarUrl = getClientAvatarUrl(client);
    const targetUserId = resolveTargetUserId(message, args[0]);

    const targetUser = await client.users.fetch(targetUserId).catch(() => null);
    if (!targetUser) {
      await message.reply(
        buildBotContainerResponse({
          avatarUrl,
          title: "User Info",
          body: `Unable to find user with ID \`${targetUserId}\`.`,
        }),
      );
      return;
    }

    const userWithFlags = await targetUser.fetch(true).catch(() => targetUser);
    const member = await guild.members.fetch(targetUserId).catch(() => null);

    const createdUnix = Math.floor(userWithFlags.createdTimestamp / 1000);
    const joinedUnix = member?.joinedTimestamp
      ? Math.floor(member.joinedTimestamp / 1000)
      : null;
    const boostUnix = member?.premiumSinceTimestamp
      ? Math.floor(member.premiumSinceTimestamp / 1000)
      : null;
    const timeoutUnix = member?.communicationDisabledUntilTimestamp
      ? Math.floor(member.communicationDisabledUntilTimestamp / 1000)
      : null;

    const displayName = userWithFlags.globalName ?? userWithFlags.username;
    const nickname = member?.nickname ?? "None";
    const highestRole = member
      ? member.roles.highest.id === guild.id
        ? "@everyone"
        : member.roles.highest.toString()
      : "Not in this server";
    const roleCount = member
      ? member.roles.cache.filter((role) => role.id !== guild.id).size
      : 0;

    const aboutBlock = [
      "### User",
      `> **Username:** ${userWithFlags.username}`,
      `> **Display Name:** ${displayName}`,
      `> **Mention:** <@${userWithFlags.id}>`,
      `> **ID:** ${userWithFlags.id}`,
      `> **Type:** ${userWithFlags.bot ? "Bot Account" : "User Account"}`,
    ].join("\n");

    const accountBlock = [
      "### Account",
      `> **Created At:** <t:${createdUnix}:F>`,
      `> **Created:** <t:${createdUnix}:R>`,
      `> **Badges:** ${formatBadgeSummary(userWithFlags)}`,
    ].join("\n");

    const serverBlock = member
      ? [
          "### Server Profile",
          `> **Nickname:** ${nickname}`,
          `> **Joined At:** ${joinedUnix ? `<t:${joinedUnix}:F>` : "Unknown"}`,
          `> **Joined:** ${joinedUnix ? `<t:${joinedUnix}:R>` : "Unknown"}`,
          `> **Highest Role:** ${highestRole}`,
          `> **Role Count:** ${roleCount}`,
          `> **Status:** ${formatPresenceStatus(member.presence?.status)}`,
          `> **Boosting Since:** ${
            boostUnix ? `<t:${boostUnix}:F> (<t:${boostUnix}:R>)` : "Not boosting"
          }`,
          `> **Timeout:** ${
            timeoutUnix ? `Until <t:${timeoutUnix}:F> (<t:${timeoutUnix}:R>)` : "None"
          }`,
        ].join("\n")
      : [
          "### Server Profile",
          "User is not currently available as a guild member in this server.",
        ].join("\n");

    const permissionBlock = [
      "### Permissions",
      `> ${formatPermissionSummary(member)}`,
    ].join("\n");

    const activityBlock = [
      "### Activity",
      formatActivitySummary(member),
    ].join("\n");

    const container = new ContainerBuilder()
      .addSectionComponents(
        buildV2Section({
          text: ["## User Information", "Detailed account and server profile card."],
          accessory: {
            type: "thumbnail",
            url:
              userWithFlags.displayAvatarURL({
                extension: "png",
                size: 1024,
              }) ?? avatarUrl,
          },
        }),
      )
      .addSeparatorComponents(buildV2Separator())
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(aboutBlock))
      .addSeparatorComponents(buildV2Separator())
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(accountBlock))
      .addSeparatorComponents(buildV2Separator())
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(serverBlock))
      .addSeparatorComponents(buildV2Separator())
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(permissionBlock))
      .addSeparatorComponents(buildV2Separator())
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(activityBlock))
      .addSeparatorComponents(buildV2Separator())
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(formatRolesBlock(member)),
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

export default userinfoCommand;
