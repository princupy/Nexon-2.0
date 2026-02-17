import { StringSelectMenuBuilder } from "discord.js";
import { createAntinukeWhitelistSelectId } from "../../constants/component-ids";
import { ANTINUKE_FEATURE_DEFINITIONS } from "../../constants/antinuke-features";
import { ensureAntinukeCommandAccess, resolveTargetUserId } from "../../services/antinuke/antinuke-command.utils";
import { sendAntinukeLogCard } from "../../services/antinuke/antinuke-log.service";
import type { PrefixCommand } from "../../types/prefix-command";
import {
  buildBotContainerResponse,
  getClientAvatarUrl,
} from "../../ui/component-v2/container-response";

const whitelistCommand: PrefixCommand = {
  name: "whitelist",
  description: "Adds trusted users to antinuke whitelist.",
  usage: "whitelist <@user|userId> | whitelist reset",
  usages: [
    "whitelist <@user|userId>",
    "whitelist reset",
  ],
  guildOnly: true,
  category: "Antinuke",
  group: "main",
  async execute({ client, message, args, prefix }) {
    const guildId = message.guildId;
    if (!guildId) {
      return;
    }

    const avatarUrl = getClientAvatarUrl(client);
    const token = args[0]?.toLowerCase();

    if (!(await ensureAntinukeCommandAccess({ client, message, title: "Antinuke Whitelist" }))) {
      return;
    }

    if (!token) {
      const users = await client.antinukeService.listWhitelistUsers(guildId);
      await message.reply(
        buildBotContainerResponse({
          avatarUrl,
          title: "Antinuke Whitelist",
          body: [
            `Current trusted users: **${users.length}**`,
            `Add / Update Scopes: \`${prefix}whitelist <@user|userId>\``,
            `Reset: \`${prefix}whitelist reset\``,
            `View: \`${prefix}whitelisted\``,
          ].join("\n"),
        }),
      );
      return;
    }

    if (token === "reset") {
      await client.antinukeService.resetWhitelist(guildId);
      await message.reply(
        buildBotContainerResponse({
          avatarUrl,
          title: "Antinuke Whitelist",
          body: "Whitelist has been reset for this server.",
        }),
      );

      await sendAntinukeLogCard({
        client,
        guild: message.guild,
        requestedById: message.author.id,
        createChannelIfMissing: false,
        title: "Antinuke Whitelist Update",
        bodyLines: [
          `Moderator: <@${message.author.id}> (\`${message.author.id}\`)`,
          "Action: Whitelist reset",
        ],
      });
      return;
    }

    const targetUserId = resolveTargetUserId(message, args[0]);
    if (!targetUserId) {
      await message.reply(
        buildBotContainerResponse({
          avatarUrl,
          title: "Antinuke Whitelist",
          body: `Usage: \`${prefix}whitelist <@user|userId>\``,
        }),
      );
      return;
    }

    if (targetUserId === message.author.id) {
      await message.reply(
        buildBotContainerResponse({
          avatarUrl,
          title: "Antinuke Whitelist",
          body: "You are already trusted by default for your own actions.",
        }),
      );
      return;
    }

    if (targetUserId === message.guild.ownerId) {
      await message.reply(
        buildBotContainerResponse({
          avatarUrl,
          title: "Antinuke Whitelist",
          body: "Server owner is always trusted. No need to whitelist manually.",
        }),
      );
      return;
    }

    const isBotOwner = await client.isBotOwner(targetUserId);
    if (isBotOwner) {
      await message.reply(
        buildBotContainerResponse({
          avatarUrl,
          title: "Antinuke Whitelist",
          body: "Bot owner is always trusted. No need to whitelist manually.",
        }),
      );
      return;
    }

    const existing = await client.antinukeService.getWhitelistEntry(guildId, targetUserId);

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(
        createAntinukeWhitelistSelectId(
          guildId,
          message.author.id,
          targetUserId,
        ),
      )
      .setPlaceholder("Select antinuke features to whitelist")
      .setMinValues(1)
      .setMaxValues(ANTINUKE_FEATURE_DEFINITIONS.length)
      .addOptions(
        ANTINUKE_FEATURE_DEFINITIONS.map((feature) => ({
          label: feature.label,
          value: feature.key,
          description: feature.description,
          default: existing?.features.includes(feature.key) ?? false,
        })),
      );

    await message.reply(
      buildBotContainerResponse({
        avatarUrl,
        title: "Antinuke Whitelist",
        body: [
          `Target User: <@${targetUserId}>`,
          "Select one or multiple antinuke features from dropdown.",
          existing
            ? `Existing scopes found: **${existing.features.length}** feature(s). New selection will merge.`
            : "No existing whitelist scope for this user.",
        ].join("\n"),
        addSeparator: true,
        actionRows: [[selectMenu]],
      }),
    );
  },
};

export default whitelistCommand;
