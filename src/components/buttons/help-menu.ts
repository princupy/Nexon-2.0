import {
  HELP_NAV_ID_REGEX,
  parseHelpNavId,
} from "../../constants/component-ids";
import {
  buildHelpCatalog,
  buildHelpCategoryMessage,
  buildHelpHomeMessage,
  findHelpCategory,
} from "../../services/help/help-menu.service";
import type { ButtonComponentHandler } from "../../types/component";
import {
  buildBotContainerResponse,
  getClientAvatarUrl,
} from "../../ui/component-v2/container-response";

const helpMenuButtonHandler: ButtonComponentHandler = {
  id: HELP_NAV_ID_REGEX,
  async execute(interaction, client) {
    const parsed = parseHelpNavId(interaction.customId);
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

    const prefix = await client.prefixService.getGuildPrefix(parsed.guildId);
    const catalog = buildHelpCatalog(client.prefixCommands.values());

    if (parsed.action === "home") {
      await interaction.update(
        buildHelpHomeMessage({
          avatarUrl,
          prefix,
          ownerId: parsed.userId,
          guildId: parsed.guildId,
          catalog,
        }),
      );
      return;
    }

    const category = findHelpCategory(catalog, parsed.group, parsed.categoryKey);
    if (!category) {
      await interaction.update(
        buildHelpHomeMessage({
          avatarUrl,
          prefix,
          ownerId: parsed.userId,
          guildId: parsed.guildId,
          catalog,
        }),
      );
      return;
    }

    const nextPage = parsed.action === "next" ? parsed.page + 1 : parsed.page - 1;

    await interaction.update(
      buildHelpCategoryMessage({
        avatarUrl,
        prefix,
        ownerId: parsed.userId,
        guildId: parsed.guildId,
        catalog,
        group: category.group,
        categoryKey: category.key,
        page: nextPage,
      }),
    );
  },
};

export default helpMenuButtonHandler;
