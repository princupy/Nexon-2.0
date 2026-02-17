import type { PrefixCommand } from "../../types/prefix-command";
import { buildBotInfoPageMessage } from "../../services/utility/botinfo-view.service";

const botinfoCommand: PrefixCommand = {
  name: "botinfo",
  aliases: ["bi"],
  description: "Shows core information about Nexon.",
  usage: "botinfo",
  usages: ["botinfo"],
  guildOnly: true,
  category: "Utility",
  group: "extra",
  async execute({ client, message }) {
    const guildId = message.guildId;
    if (!guildId) {
      return;
    }

    await message.reply(
      await buildBotInfoPageMessage({
        client,
        guildId,
        ownerId: message.author.id,
        page: 0,
      }),
    );
  },
};

export default botinfoCommand;
