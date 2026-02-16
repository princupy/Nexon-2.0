import type { Message } from "discord.js";
import { sendNoPrefixLog } from "../../services/owner/owner-log.service";
import {
  buildNoPrefixDurationPromptMessage,
  buildNoPrefixListMessage,
  buildNoPrefixStatusMessage,
} from "../../services/owner/noprefix-view.service";
import type { PrefixCommand } from "../../types/prefix-command";
import {
  buildBotContainerResponse,
  getClientAvatarUrl,
} from "../../ui/component-v2/container-response";

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
  message: Message<true>,
  rawValue?: string,
): string | null {
  const parsedFromRaw = parseUserIdToken(rawValue);
  if (parsedFromRaw) {
    return parsedFromRaw;
  }

  const mention = message.mentions.users.find(
    (user) => user.id !== message.author.id,
  );

  return mention?.id ?? null;
}

const noprefixCommand: PrefixCommand = {
  name: "noprefix",
  aliases: ["npx"],
  description: "Manages users who can run commands without a prefix.",
  usage: "noprefix <add|remove|list|status>",
  usages: [
    "noprefix add <@user|userId>",
    "noprefix remove <@user|userId>",
    "noprefix list",
    "noprefix status <@user|userId>",
  ],
  helpItems: [
    {
      title: "noprefix add",
      description: "Starts duration selector for no-prefix access.",
      usages: ["noprefix add <@user|userId>"],
    },
    {
      title: "noprefix remove",
      description: "Removes no-prefix access from a user.",
      usages: ["noprefix remove <@user|userId>"],
    },
    {
      title: "noprefix list",
      description: "Shows all users who currently have no-prefix access.",
      usages: ["noprefix list"],
    },
    {
      title: "noprefix status",
      description: "Checks whether a specific user has no-prefix access.",
      usages: ["noprefix status <@user|userId>"],
    },
  ],
  guildOnly: true,
  ownerOnly: true,
  hidden: true,
  category: "Owner",
  group: "extra",
  async execute({ client, message, args, prefix }) {
    const avatarUrl = getClientAvatarUrl(client);
    const subCommand = args[0]?.toLowerCase();

    const sendPanel = async (title: string, body: string): Promise<void> => {
      await message.reply(
        buildBotContainerResponse({
          avatarUrl,
          title,
          body,
        }),
      );
    };

    if (!subCommand) {
      await sendPanel(
        "No Prefix Manager",
        [
          "### Commands",
          `- \`${prefix}noprefix add <@user|userId>\``,
          `- \`${prefix}noprefix remove <@user|userId>\``,
          `- \`${prefix}noprefix list\``,
          `- \`${prefix}noprefix status <@user|userId>\``,
          `- Alias: \`${prefix}npx\``,
        ].join("\n"),
      );
      return;
    }

    if (subCommand === "add") {
      const targetUserId = resolveTargetUserId(message, args[1]);
      if (!targetUserId) {
        await sendPanel(
          "No Prefix Add",
          `Usage: \`${prefix}noprefix add <@user|userId>\``,
        );
        return;
      }

      const guildId = message.guildId;
      if (!guildId) {
        return;
      }

      await message.reply(
        buildNoPrefixDurationPromptMessage({
          client,
          guildId,
          requesterId: message.author.id,
          targetUserId,
        }),
      );
      return;
    }

    if (subCommand === "remove") {
      const targetUserId = resolveTargetUserId(message, args[1]);
      if (!targetUserId) {
        await sendPanel(
          "No Prefix Remove",
          `Usage: \`${prefix}noprefix remove <@user|userId>\``,
        );
        return;
      }

      const currentEntry = await client.ownerControlService.getNoPrefixUser(targetUserId);
      if (!currentEntry) {
        await sendPanel(
          "No Prefix Remove",
          `<@${targetUserId}> does not have no-prefix access.`,
        );
        return;
      }

      await client.ownerControlService.removeNoPrefixUser(targetUserId);
      await sendPanel(
        "No Prefix Removed",
        `<@${targetUserId}> can no longer run commands without prefix.`,
      );

      await sendNoPrefixLog({
        client,
        action: "REMOVE",
        guildId: message.guildId,
        moderatorId: message.author.id,
        targetUserId,
        previousExpiry: currentEntry.expires_at,
        updatedExpiry: null,
        note: "No-prefix access removed.",
      });
      return;
    }

    if (subCommand === "list") {
      await message.reply(
        await buildNoPrefixListMessage({
          client,
          guild: message.guild,
          requesterId: message.author.id,
          page: 0,
        }),
      );
      return;
    }

    if (subCommand === "status") {
      const targetUserId = resolveTargetUserId(message, args[1]);
      if (!targetUserId) {
        await sendPanel(
          "No Prefix Status",
          `Usage: \`${prefix}noprefix status <@user|userId>\``,
        );
        return;
      }

      const entry = await client.ownerControlService.getNoPrefixUser(targetUserId);
      await message.reply(
        await buildNoPrefixStatusMessage({
          client,
          guild: message.guild,
          targetUserId,
          entry,
        }),
      );
      return;
    }

    await sendPanel(
      "No Prefix Manager",
      `Unknown subcommand: \`${subCommand}\`. Use \`${prefix}noprefix\` to view options.`,
    );
  },
};

export default noprefixCommand;
