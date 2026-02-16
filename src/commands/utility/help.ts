import type { PrefixCommand } from "../../types/prefix-command";
import {
  buildBotContainerResponse,
  getClientAvatarUrl,
} from "../../ui/component-v2/container-response";
import {
  buildHelpCatalog,
  buildHelpCategoryMessage,
  buildHelpHomeMessage,
  findHelpCategoryByToken,
} from "../../services/help/help-menu.service";

const helpPrefixCommand: PrefixCommand = {
  name: "help",
  aliases: ["h"],
  description: "Opens the interactive command help panel.",
  usage: "help [category]",
  usages: ["help [category]"],
  guildOnly: true,
  category: "Utility",
  group: "extra",
  async execute({ client, message, args, prefix }) {
    const guildId = message.guildId;
    if (!guildId) {
      return;
    }

    const avatarUrl = getClientAvatarUrl(client);
    const catalog = buildHelpCatalog(client.prefixCommands.values());
    const isBotOwner = await client.isBotOwner(message.author.id);
    const requestedCategory = args[0] ? findHelpCategoryByToken(catalog, args[0]) : null;

    if (requestedCategory) {
      if (requestedCategory.ownerOnly && !isBotOwner) {
        await message.reply(
          buildBotContainerResponse({
            avatarUrl,
            title: "Nexon Help",
            body: "This category is locked. Only bot owners can access Owner commands.",
          }),
        );
        return;
      }

      await message.reply(
        buildHelpCategoryMessage({
          avatarUrl,
          prefix,
          ownerId: message.author.id,
          guildId,
          isBotOwner,
          catalog,
          group: requestedCategory.group,
          categoryKey: requestedCategory.key,
          page: 0,
        }),
      );
      return;
    }

    await message.reply(
      buildHelpHomeMessage({
        avatarUrl,
        prefix,
        ownerId: message.author.id,
        guildId,
        isBotOwner,
        catalog,
      }),
    );
  },
};

export default helpPrefixCommand;


