import {
  BOTINFO_NAV_ID_REGEX,
  parseBotInfoNavId,
} from "../../constants/component-ids";
import { buildBotInfoPageMessage } from "../../services/utility/botinfo-view.service";
import type { ButtonComponentHandler } from "../../types/component";
import {
  buildBotContainerResponse,
  getClientAvatarUrl,
} from "../../ui/component-v2/container-response";

const botInfoButtonHandler: ButtonComponentHandler = {
  id: BOTINFO_NAV_ID_REGEX,
  async execute(interaction, client) {
    const parsed = parseBotInfoNavId(interaction.customId);
    if (!parsed) {
      return;
    }

    const avatarUrl = getClientAvatarUrl(client);

    const replyError = async (message: string): Promise<void> => {
      await interaction.reply(
        buildBotContainerResponse({
          avatarUrl,
          title: "Bot Info",
          body: message,
          ephemeral: true,
        }),
      );
    };

    if (!interaction.inGuild() || interaction.guildId !== parsed.guildId) {
      await replyError("This bot info panel belongs to a different server.");
      return;
    }

    if (interaction.user.id !== parsed.userId) {
      await replyError("Only the user who opened this panel can use it.");
      return;
    }

    const nextPage =
      parsed.action === "home"
        ? 0
        : parsed.action === "next"
          ? parsed.page + 1
          : parsed.page - 1;

    await interaction.update(
      await buildBotInfoPageMessage({
        client,
        guildId: parsed.guildId,
        ownerId: parsed.userId,
        page: nextPage,
      }),
    );
  },
};

export default botInfoButtonHandler;
