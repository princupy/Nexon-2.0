import { type RepliableInteraction } from "discord.js";
import type { NexonClient } from "../../core/nexon-client";
import { buildBlacklistedWarningMessage } from "../../services/owner/blacklist-warning.service";
import { logger } from "../../core/logger";
import {
  findButtonHandler,
  findModalHandler,
  findSelectMenuHandler,
} from "../../handlers/component-handler";
import type { NexonEvent } from "../../types/event";
import {
  buildBotContainerResponse,
  getClientAvatarUrl,
} from "../../ui/component-v2/container-response";

async function sendInteractionError(
  interaction: RepliableInteraction,
  message: string,
): Promise<void> {
  const payload = buildBotContainerResponse({
    avatarUrl: getClientAvatarUrl(interaction.client),
    title: "Nexon",
    body: message,
    ephemeral: true,
  });

  if (interaction.deferred || interaction.replied) {
    await interaction.followUp(payload);
    return;
  }

  await interaction.reply(payload);
}

async function sendBlacklistedWarning(
  interaction: RepliableInteraction,
  client: NexonClient,
): Promise<void> {
  const payload = buildBlacklistedWarningMessage({
    client,
    userId: interaction.user.id,
    ephemeral: true,
  });

  if (interaction.deferred || interaction.replied) {
    await interaction.followUp(payload);
    return;
  }

  await interaction.reply(payload);
}

const interactionCreateEvent: NexonEvent<"interactionCreate"> = {
  name: "interactionCreate",
  async execute(client, interaction) {
    const isBotOwner = await client.isBotOwner(interaction.user.id);
    if (!isBotOwner) {
      const blacklisted = await client.ownerControlService.isBlacklisted(
        interaction.user.id,
      );

      if (blacklisted) {
        if (interaction.isRepliable()) {
          await sendBlacklistedWarning(interaction, client);
        }
        return;
      }
    }

    if (interaction.isChatInputCommand()) {
      await sendInteractionError(
        interaction,
        "Slash commands are disabled. Please use prefix commands instead.",
      );
      return;
    }

    if (interaction.isButton()) {
      const handler = findButtonHandler(client, interaction.customId);
      if (!handler) {
        return;
      }

      try {
        await handler.execute(interaction, client);
      } catch (error) {
        logger.error(`Button handler failed: ${interaction.customId}`, error);
        await sendInteractionError(
          interaction,
          "This button action could not be completed.",
        );
      }

      return;
    }

    if (interaction.isAnySelectMenu()) {
      const handler = findSelectMenuHandler(client, interaction.customId);
      if (!handler) {
        return;
      }

      try {
        await handler.execute(interaction, client);
      } catch (error) {
        logger.error(`Select menu handler failed: ${interaction.customId}`, error);
        await sendInteractionError(
          interaction,
          "This select menu action could not be completed.",
        );
      }

      return;
    }

    if (interaction.isModalSubmit()) {
      const handler = findModalHandler(client, interaction.customId);
      if (!handler) {
        return;
      }

      try {
        await handler.execute(interaction, client);
      } catch (error) {
        logger.error(`Modal handler failed: ${interaction.customId}`, error);
        await sendInteractionError(
          interaction,
          "This modal submission could not be completed.",
        );
      }
    }
  },
};

export default interactionCreateEvent;
