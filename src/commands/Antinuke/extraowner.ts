import { antinukeEmojis } from "../../constants/custom-emojis/antinuke-emojis";
import { ensureAntinukeCommandAccess, resolveTargetUserId } from "../../services/antinuke/antinuke-command.utils";
import {
  grantAntinukeLogChannelAccess,
  revokeAntinukeLogChannelAccess,
  sendAntinukeLogCard,
} from "../../services/antinuke/antinuke-log.service";
import type { PrefixCommand } from "../../types/prefix-command";
import {
  buildBotContainerResponse,
  getClientAvatarUrl,
} from "../../ui/component-v2/container-response";

const extraOwnerCommand: PrefixCommand = {
  name: "extraowner",
  aliases: ["eo"],
  description: "Manages an extra trusted owner for antinuke safeguards.",
  usage: "extraowner <set|view|reset>",
  usages: [
    "extraowner",
    "extraowner set <@user|userId>",
    "extraowner view",
    "extraowner reset",
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
    const subCommand = args[0]?.toLowerCase();

    if (!(await ensureAntinukeCommandAccess({ client, message, title: "Antinuke Extra Owner" }))) {
      return;
    }
    const config = await client.antinukeService.getConfig(guildId);

    if (!subCommand || subCommand === "view") {
      await message.reply(
        buildBotContainerResponse({
          avatarUrl,
          title: "Antinuke Extra Owner",
          body: [
            `Current extra owner: ${
              config.extraOwnerId ? `<@${config.extraOwnerId}>` : "Not set"
            }`,
            "",
            `Set: \`${prefix}extraowner set <@user|userId>\``,
            `Reset: \`${prefix}extraowner reset\``,
          ].join("\n"),
        }),
      );
      return;
    }

    if (subCommand === "set") {
      const targetUserId = resolveTargetUserId(message, args[1]);
      if (!targetUserId) {
        await message.reply(
          buildBotContainerResponse({
            avatarUrl,
            title: "Antinuke Extra Owner",
            body: `Usage: \`${prefix}extraowner set <@user|userId>\``,
          }),
        );
        return;
      }

      if (targetUserId === message.guild.ownerId) {
        await message.reply(
          buildBotContainerResponse({
            avatarUrl,
            title: "Antinuke Extra Owner",
            body: "Server owner is already trusted by default.",
          }),
        );
        return;
      }

      await client.antinukeService.setExtraOwner(
        guildId,
        targetUserId,
        message.author.id,
      );

      await grantAntinukeLogChannelAccess({
        client,
        guild: message.guild,
        userId: targetUserId,
        requestedById: message.author.id,
      });

      await message.reply(
        buildBotContainerResponse({
          avatarUrl,
          title: "Antinuke Extra Owner",
          body: `${antinukeEmojis.owner} Extra owner has been set to <@${targetUserId}>.`,
        }),
      );

      await sendAntinukeLogCard({
        client,
        guild: message.guild,
        requestedById: message.author.id,
        createChannelIfMissing: false,
        title: "Antinuke Configuration Update",
        bodyLines: [
          `Moderator: <@${message.author.id}> (\`${message.author.id}\`)`,
          "Action: Extra owner updated",
          `Extra Owner: <@${targetUserId}> (\`${targetUserId}\`)`,
        ],
      });
      return;
    }

    if (subCommand === "reset") {
      const previousExtraOwnerId = config.extraOwnerId;
      await client.antinukeService.clearExtraOwner(guildId, message.author.id);

      if (previousExtraOwnerId) {
        await revokeAntinukeLogChannelAccess({
          client,
          guild: message.guild,
          userId: previousExtraOwnerId,
          requestedById: message.author.id,
        });
      }

      await message.reply(
        buildBotContainerResponse({
          avatarUrl,
          title: "Antinuke Extra Owner",
          body: `${antinukeEmojis.cross} Extra owner has been reset.`,
        }),
      );

      await sendAntinukeLogCard({
        client,
        guild: message.guild,
        requestedById: message.author.id,
        createChannelIfMissing: false,
        title: "Antinuke Configuration Update",
        bodyLines: [
          `Moderator: <@${message.author.id}> (\`${message.author.id}\`)`,
          "Action: Extra owner reset",
        ],
      });
      return;
    }

    await message.reply(
      buildBotContainerResponse({
        avatarUrl,
        title: "Antinuke Extra Owner",
        body: `Unknown option: \`${subCommand}\`. Use \`${prefix}extraowner\` for help.`,
      }),
    );
  },
};

export default extraOwnerCommand;
