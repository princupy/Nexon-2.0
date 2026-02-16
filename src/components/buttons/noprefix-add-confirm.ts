import {
  NOPREFIX_ADD_CONFIRM_ID_REGEX,
  parseNoPrefixAddConfirmId,
} from "../../constants/component-ids";
import { getNoPrefixDurationByKey } from "../../services/owner/noprefix-duration.service";
import { sendNoPrefixLog } from "../../services/owner/owner-log.service";
import { buildNoPrefixUpdateResultMessage } from "../../services/owner/noprefix-view.service";
import type { ButtonComponentHandler } from "../../types/component";
import {
  buildBotContainerResponse,
  getClientAvatarUrl,
} from "../../ui/component-v2/container-response";

const noPrefixAddConfirmHandler: ButtonComponentHandler = {
  id: NOPREFIX_ADD_CONFIRM_ID_REGEX,
  async execute(interaction, client) {
    const parsed = parseNoPrefixAddConfirmId(interaction.customId);
    if (!parsed) {
      return;
    }

    const avatarUrl = getClientAvatarUrl(client);

    const replyError = async (message: string): Promise<void> => {
      await interaction.reply(
        buildBotContainerResponse({
          avatarUrl,
          title: "No Prefix Add",
          body: message,
          ephemeral: true,
        }),
      );
    };

    if (!interaction.inGuild() || interaction.guildId !== parsed.guildId) {
      await replyError("This panel belongs to a different server.");
      return;
    }

    if (interaction.user.id !== parsed.userId) {
      await replyError("Only the panel owner can use this action.");
      return;
    }

    const isBotOwner = await client.isBotOwner(interaction.user.id);
    if (!isBotOwner) {
      await replyError("Only bot owners can manage no-prefix access.");
      return;
    }

    const duration = getNoPrefixDurationByKey(parsed.durationKey);
    if (!duration) {
      await replyError("Duration token is invalid.");
      return;
    }

    if (parsed.action === "cancel") {
      await interaction.update(
        buildBotContainerResponse({
          avatarUrl,
          title: "No Prefix Add",
          body: "Operation cancelled. No changes were made.",
        }),
      );
      return;
    }

    const previous = await client.ownerControlService.getNoPrefixUser(
      parsed.targetUserId,
    );

    const row = await client.ownerControlService.mergeNoPrefixUserDuration(
      parsed.targetUserId,
      interaction.user.id,
      duration.durationMs,
      {
        addedGuildId: parsed.guildId,
        addedChannelId: interaction.channelId ?? null,
      },
    );

    await interaction.update(
      buildNoPrefixUpdateResultMessage({
        client,
        targetUserId: parsed.targetUserId,
        row,
        actionLabel: "Existing no-prefix time merged",
      }),
    );

    await sendNoPrefixLog({
      client,
      action: "ADD",
      guildId: parsed.guildId,
      moderatorId: interaction.user.id,
      targetUserId: parsed.targetUserId,
      previousExpiry: previous?.expires_at ?? null,
      updatedExpiry: row.expires_at,
      durationLabel: duration.label,
      note: "Selected duration merged with remaining no-prefix time.",
    });
  },
};

export default noPrefixAddConfirmHandler;
