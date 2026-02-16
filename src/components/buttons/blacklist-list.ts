import {
  BLACKLIST_LIST_NAV_ID_REGEX,
  parseBlacklistListNavId,
} from "../../constants/component-ids";
import { buildBlacklistListMessage } from "../../services/owner/blacklist-view.service";
import type { ButtonComponentHandler } from "../../types/component";
import {
  buildBotContainerResponse,
  getClientAvatarUrl,
} from "../../ui/component-v2/container-response";

const blacklistListButtonHandler: ButtonComponentHandler = {
  id: BLACKLIST_LIST_NAV_ID_REGEX,
  async execute(interaction, client) {
    const parsed = parseBlacklistListNavId(interaction.customId);
    if (!parsed) {
      return;
    }

    const avatarUrl = getClientAvatarUrl(client);

    const replyError = async (message: string): Promise<void> => {
      await interaction.reply(
        buildBotContainerResponse({
          avatarUrl,
          title: "Blacklisted Users",
          body: message,
          ephemeral: true,
        }),
      );
    };

    if (!interaction.inGuild() || interaction.guildId !== parsed.guildId) {
      await replyError("This blacklist panel belongs to a different server.");
      return;
    }

    if (interaction.user.id !== parsed.userId) {
      await replyError("Only the user who opened this panel can use it.");
      return;
    }

    const guild = interaction.guild;
    if (!guild) {
      await replyError("Guild context is unavailable for this panel.");
      return;
    }

    const nextPage = parsed.action === "next" ? parsed.page + 1 : parsed.page - 1;

    await interaction.update(
      await buildBlacklistListMessage({
        client,
        guild,
        requesterId: parsed.userId,
        page: nextPage,
      }),
    );
  },
};

export default blacklistListButtonHandler;
