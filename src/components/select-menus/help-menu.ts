import {
  HELP_SELECT_ID_REGEX,
  parseHelpSelectId,
} from "../../constants/component-ids";
import {
  buildHelpCatalog,
  buildHelpCategoryMessage,
  findHelpCategory,
} from "../../services/help/help-menu.service";
import type { SelectMenuComponentHandler } from "../../types/component";
import {
  buildBotContainerResponse,
  getClientAvatarUrl,
} from "../../ui/component-v2/container-response";

const helpMenuSelectHandler: SelectMenuComponentHandler = {
  id: HELP_SELECT_ID_REGEX,
  async execute(interaction, client) {
    const parsed = parseHelpSelectId(interaction.customId);
    if (!parsed) {
      return;
    }

    const avatarUrl = getClientAvatarUrl(client);

    const replyError = async (message: string): Promise<void> => {
      await interaction.reply(
        buildBotContainerResponse({
          avatarUrl,
          title: "Nexon Help",
          body: message,
          ephemeral: true,
        }),
      );
    };

    if (!interaction.inGuild() || interaction.guildId !== parsed.guildId) {
      await replyError("This help panel belongs to a different server.");
      return;
    }

    if (interaction.user.id !== parsed.userId) {
      await replyError("Only the user who opened this help panel can use it.");
      return;
    }

    const selectedCategoryKey = interaction.values[0];
    if (!selectedCategoryKey) {
      await replyError("Please select a valid category.");
      return;
    }

    const prefix = await client.prefixService.getGuildPrefix(parsed.guildId);
    const catalog = buildHelpCatalog(client.prefixCommands.values());
    const category = findHelpCategory(catalog, parsed.group, selectedCategoryKey);

    if (!category) {
      await replyError("The selected category is not available anymore.");
      return;
    }

    const isBotOwner = await client.isBotOwner(interaction.user.id);
    if (category.ownerOnly && !isBotOwner) {
      await replyError(
        "This category is locked. Only bot owners can access Owner commands.",
      );
      return;
    }

    await interaction.update(
      buildHelpCategoryMessage({
        avatarUrl,
        prefix,
        ownerId: parsed.userId,
        guildId: parsed.guildId,
        isBotOwner,
        catalog,
        group: category.group,
        categoryKey: category.key,
        page: 0,
      }),
    );
  },
};

export default helpMenuSelectHandler;
