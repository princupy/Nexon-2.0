import type { Message } from "discord.js";
import { buildBlacklistListMessage } from "../../services/owner/blacklist-view.service";
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

const blacklistCommand: PrefixCommand = {
  name: "blacklist",
  description: "Manages users blocked from using this bot.",
  usage: "blacklist <add|remove|list>",
  usages: [
    "blacklist add <@user|userId>",
    "blacklist remove <@user|userId>",
    "blacklist list",
  ],
  helpItems: [
    {
      title: "blacklist add",
      description: "Blocks a user from using this bot.",
      usages: ["blacklist add <@user|userId>"],
    },
    {
      title: "blacklist remove",
      description: "Unblocks a previously blacklisted user.",
      usages: ["blacklist remove <@user|userId>"],
    },
    {
      title: "blacklist list",
      description: "Shows all blacklisted users.",
      usages: ["blacklist list"],
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
        "Blacklist Manager",
        [
          "### Commands",
          `- \`${prefix}blacklist add <@user|userId>\``,
          `- \`${prefix}blacklist remove <@user|userId>\``,
          `- \`${prefix}blacklist list\``,
        ].join("\n"),
      );
      return;
    }

    if (subCommand === "add") {
      const targetUserId = resolveTargetUserId(message, args[1]);
      if (!targetUserId) {
        await sendPanel(
          "Blacklist Add",
          `Usage: \`${prefix}blacklist add <@user|userId>\``,
        );
        return;
      }

      if (targetUserId === message.author.id) {
        await sendPanel("Blacklist Add", "You cannot blacklist yourself.");
        return;
      }

      if (targetUserId === client.user?.id) {
        await sendPanel("Blacklist Add", "You cannot blacklist this bot account.");
        return;
      }

      const targetIsOwner = await client.isBotOwner(targetUserId);
      if (targetIsOwner) {
        await sendPanel("Blacklist Add", "You cannot blacklist a bot owner.");
        return;
      }

      const alreadyBlacklisted = await client.ownerControlService.isBlacklisted(
        targetUserId,
      );
      if (alreadyBlacklisted) {
        await sendPanel("Blacklist Add", `<@${targetUserId}> is already blacklisted.`);
        return;
      }

      await client.ownerControlService.addBlacklistedUser(
        targetUserId,
        message.author.id,
      );
      await sendPanel(
        "Blacklist Added",
        `<@${targetUserId}> has been blacklisted from this bot.`,
      );
      return;
    }

    if (subCommand === "remove") {
      const targetUserId = resolveTargetUserId(message, args[1]);
      if (!targetUserId) {
        await sendPanel(
          "Blacklist Remove",
          `Usage: \`${prefix}blacklist remove <@user|userId>\``,
        );
        return;
      }

      const isBlacklisted = await client.ownerControlService.isBlacklisted(targetUserId);
      if (!isBlacklisted) {
        await sendPanel("Blacklist Remove", `<@${targetUserId}> is not blacklisted.`);
        return;
      }

      await client.ownerControlService.removeBlacklistedUser(targetUserId);
      await sendPanel(
        "Blacklist Removed",
        `<@${targetUserId}> has been removed from blacklist.`,
      );
      return;
    }

    if (subCommand === "list") {
      await message.reply(
        await buildBlacklistListMessage({
          client,
          guild: message.guild,
          requesterId: message.author.id,
          page: 0,
        }),
      );
      return;
    }

    await sendPanel(
      "Blacklist Manager",
      `Unknown subcommand: \`${subCommand}\`. Use \`${prefix}blacklist\` to view options.`,
    );
  },
};

export default blacklistCommand;
