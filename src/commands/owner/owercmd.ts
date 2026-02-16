import type { PrefixCommand } from "../../types/prefix-command";
import {
  buildBotContainerResponse,
  getClientAvatarUrl,
} from "../../ui/component-v2/container-response";

const owercmdCommand: PrefixCommand = {
  name: "owercmd",
  aliases: ["ownercmd", "ocmd"],
  description: "Displays hidden owner command references.",
  usage: "owercmd",
  usages: ["owercmd"],
  guildOnly: true,
  ownerOnly: true,
  hidden: true,
  category: "Owner",
  group: "extra",
  async execute({ client, message, prefix }) {
    await message.reply(
      buildBotContainerResponse({
        avatarUrl: getClientAvatarUrl(client),
        title: "Owner Commands",
        body: [
          "### Hidden Owner Command Panel",
          `- \`${prefix}noprefix add <@user|userId>\` (opens duration dropdown)`,
          `- \`${prefix}noprefix remove <@user|userId>\``,
          `- \`${prefix}noprefix list\``,
          `- \`${prefix}noprefix status <@user|userId>\``,
          `- \`${prefix}blacklist add <@user|userId>\``,
          `- \`${prefix}blacklist remove <@user|userId>\``,
          `- \`${prefix}blacklist list\``,
          "",
          `Alias: \`${prefix}npx\` for \`noprefix\``,
        ].join("\n"),
      }),
    );
  },
};

export default owercmdCommand;

