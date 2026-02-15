import { PermissionFlagsBits, type PermissionsBitField } from "discord.js";
import { logger } from "../../core/logger";
import type { NexonEvent } from "../../types/event";
import {
  buildBotContainerResponse,
  getClientAvatarUrl,
} from "../../ui/component-v2/container-response";

function hasAdminPermissions(
  memberPermissions: PermissionsBitField | null,
): boolean {
  if (!memberPermissions) {
    return false;
  }

  return (
    memberPermissions.has(PermissionFlagsBits.Administrator) ||
    memberPermissions.has(PermissionFlagsBits.ManageGuild)
  );
}

const messageCreateEvent: NexonEvent<"messageCreate"> = {
  name: "messageCreate",
  async execute(client, message) {
    if (!message.inGuild() || message.author.bot) {
      return;
    }

    const prefix = await client.prefixService.getGuildPrefix(message.guildId);
    if (!message.content.startsWith(prefix)) {
      return;
    }

    const content = message.content.slice(prefix.length).trim();
    if (!content) {
      return;
    }

    const [rawCommandName, ...args] = content.split(/\s+/);
    if (!rawCommandName) {
      return;
    }

    const commandName = rawCommandName.toLowerCase();
    const command = client.prefixCommands.get(commandName);

    if (!command) {
      return;
    }

    if (command.guildOnly && !message.inGuild()) {
      return;
    }

    if (command.adminOnly && !hasAdminPermissions(message.member?.permissions ?? null)) {
      await message.reply(
        buildBotContainerResponse({
          avatarUrl: getClientAvatarUrl(client),
          title: "Nexon",
          body: "You need server administrator permissions to run this command.",
        }),
      );
      return;
    }

    try {
      await command.execute({
        client,
        message,
        args,
        prefix,
      });
    } catch (error) {
      logger.error(`Prefix command failed: ${command.name}`, error);
      await message.reply(
        buildBotContainerResponse({
          avatarUrl: getClientAvatarUrl(client),
          title: "Nexon",
          body: "An error occurred while executing that prefix command.",
        }),
      );
    }
  },
};

export default messageCreateEvent;
