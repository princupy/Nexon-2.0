import { antinukeEmojis } from "../../constants/custom-emojis/antinuke-emojis";
import { ensureAntinukeCommandAccess } from "../../services/antinuke/antinuke-command.utils";
import { sendAntinukeLogCard } from "../../services/antinuke/antinuke-log.service";
import type { PrefixCommand } from "../../types/prefix-command";
import {
  buildBotContainerResponse,
  getClientAvatarUrl,
} from "../../ui/component-v2/container-response";

const nightmodeCommand: PrefixCommand = {
  name: "nightmode",
  aliases: ["nm"],
  description: "Toggles aggressive antinuke nightmode detection.",
  usage: "nightmode <enable|disable>",
  usages: [
    "nightmode",
    "nightmode enable",
    "nightmode disable",
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

    if (!(await ensureAntinukeCommandAccess({ client, message, title: "Antinuke Nightmode" }))) {
      return;
    }

    if (!subCommand) {
      const config = await client.antinukeService.getConfig(guildId);
      await message.reply(
        buildBotContainerResponse({
          avatarUrl,
          title: "Antinuke Nightmode",
          body: [
            `Nightmode status: **${config.nightmodeEnabled ? "Enabled" : "Disabled"}**`,
            "Nightmode applies stricter automated checks on sensitive admin actions.",
            "",
            `Enable: \`${prefix}nightmode enable\``,
            `Disable: \`${prefix}nightmode disable\``,
          ].join("\n"),
        }),
      );
      return;
    }

    if (subCommand === "enable") {
      await client.antinukeService.setNightmodeEnabled(guildId, true, message.author.id);
      await message.reply(
        buildBotContainerResponse({
          avatarUrl,
          title: "Antinuke Nightmode",
          body: `${antinukeEmojis.moon} Nightmode is now **enabled**.`,
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
          "Action: Nightmode enabled",
        ],
      });
      return;
    }

    if (subCommand === "disable") {
      await client.antinukeService.setNightmodeEnabled(guildId, false, message.author.id);
      await message.reply(
        buildBotContainerResponse({
          avatarUrl,
          title: "Antinuke Nightmode",
          body: `${antinukeEmojis.cross} Nightmode is now **disabled**.`,
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
          "Action: Nightmode disabled",
        ],
      });
      return;
    }

    await message.reply(
      buildBotContainerResponse({
        avatarUrl,
        title: "Antinuke Nightmode",
        body: `Unknown option: \`${subCommand}\`. Use \`${prefix}nightmode\` for help.`,
      }),
    );
  },
};

export default nightmodeCommand;
