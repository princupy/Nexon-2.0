import { antinukeEmojis } from "../../constants/custom-emojis/antinuke-emojis";
import { ensureAntinukeCommandAccess, resolveTargetUserId } from "../../services/antinuke/antinuke-command.utils";
import { sendAntinukeLogCard } from "../../services/antinuke/antinuke-log.service";
import type { PrefixCommand } from "../../types/prefix-command";
import {
  buildBotContainerResponse,
  getClientAvatarUrl,
} from "../../ui/component-v2/container-response";

const unwhitelistCommand: PrefixCommand = {
  name: "unwhitelist",
  aliases: ["wlremove"],
  description: "Removes users from antinuke whitelist.",
  usage: "unwhitelist <@user|userId>",
  usages: ["unwhitelist <@user|userId>"],
  guildOnly: true,
  category: "Antinuke",
  group: "main",
  async execute({ client, message, args, prefix }) {
    const guildId = message.guildId;
    if (!guildId) {
      return;
    }

    const avatarUrl = getClientAvatarUrl(client);
    if (!(await ensureAntinukeCommandAccess({ client, message, title: "Antinuke Whitelist" }))) {
      return;
    }

    const targetUserId = resolveTargetUserId(message, args[0]);

    if (!targetUserId) {
      await message.reply(
        buildBotContainerResponse({
          avatarUrl,
          title: "Antinuke Whitelist",
          body: `Usage: \`${prefix}unwhitelist <@user|userId>\``,
        }),
      );
      return;
    }

    const existingEntry = await client.antinukeService.getWhitelistEntry(
      guildId,
      targetUserId,
    );

    if (!existingEntry) {
      await message.reply(
        buildBotContainerResponse({
          avatarUrl,
          title: "Antinuke Whitelist",
          body: `<@${targetUserId}> is not in antinuke whitelist.`,
        }),
      );
      return;
    }

    await client.antinukeService.removeWhitelistUser(guildId, targetUserId);

    await message.reply(
      buildBotContainerResponse({
        avatarUrl,
        title: "Antinuke Whitelist",
        body: `${antinukeEmojis.cross} Removed <@${targetUserId}> from antinuke whitelist.`,
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
        `Target: <@${targetUserId}> (\`${targetUserId}\`)`,
        "Action: Removed from whitelist",
      ],
    });
  },
};

export default unwhitelistCommand;
