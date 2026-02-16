import {
  NOPREFIX_ADD_SELECT_ID_REGEX,
  parseNoPrefixAddSelectId,
} from "../../constants/component-ids";
import {
  getNoPrefixDurationByKey,
} from "../../services/owner/noprefix-duration.service";
import { sendNoPrefixLog } from "../../services/owner/owner-log.service";
import {
  buildNoPrefixMergeConfirmationMessage,
  buildNoPrefixUpdateResultMessage,
} from "../../services/owner/noprefix-view.service";
import type { SelectMenuComponentHandler } from "../../types/component";
import {
  buildBotContainerResponse,
  getClientAvatarUrl,
} from "../../ui/component-v2/container-response";

const noPrefixAddSelectHandler: SelectMenuComponentHandler = {
  id: NOPREFIX_ADD_SELECT_ID_REGEX,
  async execute(interaction, client) {
    const parsed = parseNoPrefixAddSelectId(interaction.customId);
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
      await replyError("Only the panel owner can use this selector.");
      return;
    }

    const isBotOwner = await client.isBotOwner(interaction.user.id);
    if (!isBotOwner) {
      await replyError("Only bot owners can manage no-prefix access.");
      return;
    }

    const selectedKey = interaction.values[0];
    if (!selectedKey) {
      await replyError("Please select a valid duration.");
      return;
    }

    const duration = getNoPrefixDurationByKey(selectedKey);
    if (!duration) {
      await replyError("Selected duration is invalid.");
      return;
    }

    const existingEntry = await client.ownerControlService.getNoPrefixUser(
      parsed.targetUserId,
    );

    if (existingEntry) {
      if (existingEntry.expires_at === null) {
        await interaction.update(
          buildBotContainerResponse({
            avatarUrl,
            title: "Already Active",
            body: [
              `<@${parsed.targetUserId}> already has no-prefix enabled permanently.`,
              "Working.",
            ].join("\n"),
          }),
        );
        return;
      }

      await interaction.update(
        buildNoPrefixMergeConfirmationMessage({
          client,
          guildId: parsed.guildId,
          requesterId: parsed.userId,
          targetUserId: parsed.targetUserId,
          duration,
          existingEntry,
        }),
      );
      return;
    }

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
        actionLabel: "No-prefix access granted",
      }),
    );

    await sendNoPrefixLog({
      client,
      action: "ADD",
      guildId: parsed.guildId,
      moderatorId: interaction.user.id,
      targetUserId: parsed.targetUserId,
      previousExpiry: null,
      updatedExpiry: row.expires_at,
      durationLabel: duration.label,
      note: "No-prefix access granted.",
    });
  },
};

export default noPrefixAddSelectHandler;
