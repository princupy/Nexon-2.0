import {
  ContainerBuilder,
  TextDisplayBuilder,
} from "@discordjs/builders";
import {
  MessageFlags,
  PermissionFlagsBits,
  type Guild,
  type Role,
} from "discord.js";
import type { PrefixCommand } from "../../types/prefix-command";
import {
  buildBotContainerResponse,
  buildV2Section,
  buildV2Separator,
  getClientAvatarUrl,
} from "../../ui/component-v2/container-response";

function parseRoleIdToken(rawValue?: string): string | null {
  if (!rawValue) {
    return null;
  }

  const mentionMatch = /^<@&(\d+)>$/.exec(rawValue.trim());
  if (mentionMatch?.[1]) {
    return mentionMatch[1];
  }

  const normalized = rawValue.replace(/[<@&>]/g, "").trim();
  return /^\d+$/.test(normalized) ? normalized : null;
}

function findRoleByName(guild: Guild, nameInput: string): Role | null {
  const normalized = nameInput.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  const exact = guild.roles.cache.find((role) => role.name.toLowerCase() === normalized);
  if (exact) {
    return exact;
  }

  return (
    guild.roles.cache.find((role) => role.name.toLowerCase().includes(normalized)) ??
    null
  );
}

function resolveTargetRole(guild: Guild, args: string[], messageRole: Role | null): Role | null {
  if (messageRole) {
    return messageRole;
  }

  const raw = args.join(" ").trim();
  const parsedId = parseRoleIdToken(raw);
  if (parsedId) {
    const byId = guild.roles.cache.get(parsedId);
    if (byId) {
      return byId;
    }
  }

  if (raw.length > 0) {
    const byName = findRoleByName(guild, raw);
    if (byName) {
      return byName;
    }
  }

  return null;
}

function humanizePermission(permission: string): string {
  return permission.replace(/([a-z])([A-Z])/g, "$1 $2");
}

function formatPermissionsBlock(role: Role): string {
  if (role.permissions.has(PermissionFlagsBits.Administrator)) {
    return [
      "### Permissions",
      "> **Total:** All",
      "> Administrator (grants all permissions).",
    ].join("\n");
  }

  const permissions = role.permissions
    .toArray()
    .map((permission) => humanizePermission(permission));

  if (!permissions.length) {
    return [
      "### Permissions",
      "> **Total:** 0",
      "> No explicit permissions.",
    ].join("\n");
  }

  const visible = permissions.slice(0, 12);
  const overflowCount = Math.max(0, permissions.length - visible.length);

  return [
    "### Permissions",
    `> **Total:** ${permissions.length}`,
    ...visible.map((permission) => `- ${permission}`),
    ...(overflowCount > 0 ? [`- ...and ${overflowCount} more permission(s).`] : []),
  ].join("\n");
}

function formatSourceBlock(role: Role): string {
  const tags = role.tags;

  return [
    "### Source",
    `> **Managed By Bot:** ${tags?.botId ? `<@${tags.botId}>` : "No"}`,
    `> **Integration ID:** ${tags?.integrationId ?? "None"}`,
    `> **Boost Role:** ${tags?.premiumSubscriberRole ? "Yes" : "No"}`,
    `> **Subscription Listing:** ${tags?.subscriptionListingId ?? "None"}`,
    `> **Purchasable:** ${tags?.availableForPurchase ? "Yes" : "No"}`,
    `> **Linked Role:** ${tags?.guildConnections ? "Yes" : "No"}`,
  ].join("\n");
}

function formatMembersBlock(role: Role): string {
  const mentions = role.members.map((member) => `<@${member.id}>`);
  if (!mentions.length) {
    return "### Members [0]\nNo cached members currently.";
  }

  const visible = mentions.slice(0, 20);
  const overflowCount = Math.max(0, mentions.length - visible.length);

  return [
    `### Members [${mentions.length}]`,
    visible.join(", "),
    ...(overflowCount > 0 ? [`...and ${overflowCount} more cached member(s).`] : []),
  ].join("\n");
}

const roleinfoCommand: PrefixCommand = {
  name: "roleinfo",
  aliases: ["ri", "rinfo"],
  description: "Shows complete information about a server role.",
  usage: "roleinfo <@role|roleId|roleName>",
  usages: ["roleinfo <@role|roleId|roleName>"],
  guildOnly: true,
  category: "Utility",
  group: "extra",
  async execute({ client, message, args, prefix }) {
    const guild = message.guild;
    const avatarUrl = getClientAvatarUrl(client);
    const targetRole = resolveTargetRole(
      guild,
      args,
      message.mentions.roles.first() ?? null,
    );

    if (!targetRole) {
      await message.reply(
        buildBotContainerResponse({
          avatarUrl,
          title: "Role Info",
          body: [
            "Unable to find that role.",
            `Usage: \`${prefix}roleinfo <@role|roleId|roleName>\``,
          ].join("\n"),
        }),
      );
      return;
    }

    const createdUnix = Math.floor(targetRole.createdTimestamp / 1000);
    const displayColor = targetRole.color === 0
      ? "Default"
      : `${targetRole.hexColor} (${targetRole.color})`;

    const settingsBlock = [
      "### Settings",
      `> **Hoisted:** ${targetRole.hoist ? "Yes" : "No"}`,
      `> **Mentionable:** ${targetRole.mentionable ? "Yes" : "No"}`,
      `> **Managed:** ${targetRole.managed ? "Yes" : "No"}`,
      `> **Editable By Bot:** ${targetRole.editable ? "Yes" : "No"}`,
      `> **Icon URL:** ${targetRole.iconURL({ extension: "png", size: 1024 }) ?? "None"}`,
      `> **Unicode Emoji:** ${targetRole.unicodeEmoji ?? "None"}`,
    ].join("\n");

    const aboutBlock = [
      "### Role",
      `> **Name:** ${targetRole.name}`,
      `> **Mention:** ${targetRole.toString()}`,
      `> **ID:** ${targetRole.id}`,
      `> **Created At:** <t:${createdUnix}:F>`,
      `> **Created:** <t:${createdUnix}:R>`,
      `> **Color:** ${displayColor}`,
      `> **Position:** ${targetRole.position}`,
      `> **Default Role:** ${targetRole.id === guild.id ? "Yes" : "No"}`,
    ].join("\n");

    const container = new ContainerBuilder()
      .addSectionComponents(
        buildV2Section({
          text: ["## Role Information", "Detailed role configuration and permission card."],
          accessory: {
            type: "thumbnail",
            url:
              targetRole.iconURL({ extension: "png", size: 1024 }) ??
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
        new TextDisplayBuilder().setContent(formatPermissionsBlock(targetRole)),
      )
      .addSeparatorComponents(buildV2Separator())
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(formatSourceBlock(targetRole)))
      .addSeparatorComponents(buildV2Separator())
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(formatMembersBlock(targetRole)))
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

export default roleinfoCommand;
