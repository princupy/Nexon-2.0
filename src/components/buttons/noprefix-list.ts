import {
  NOPREFIX_LIST_NAV_ID_REGEX,
  parseNoPrefixListNavId,
} from "../../constants/component-ids";
import { buildNoPrefixListMessage } from "../../services/owner/noprefix-view.service";
import type { ButtonComponentHandler } from "../../types/component";
import {
  buildBotContainerResponse,
  getClientAvatarUrl,
} from "../../ui/component-v2/container-response";

const noPrefixListButtonHandler: ButtonComponentHandler = {
  id: NOPREFIX_LIST_NAV_ID_REGEX,
  async execute(interaction, client) {
    const parsed = parseNoPrefixListNavId(interaction.customId);
    if (!parsed) {
      return;
    }

    const avatarUrl = getClientAvatarUrl(client);

    const replyError = async (message: string): Promise<void> => {
      await interaction.reply(
        buildBotContainerResponse({
          avatarUrl,
          title: "No-Prefix Users",
          body: message,
          ephemeral: true,
        }),
      );
    };

    if (!interaction.inGuild() || interaction.guildId !== parsed.guildId) {
      await replyError("This no-prefix panel belongs to a different server.");
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
      await buildNoPrefixListMessage({
        client,
        guild,
        requesterId: parsed.userId,
        page: nextPage,
      }),
    );
  },
};

export default noPrefixListButtonHandler;
