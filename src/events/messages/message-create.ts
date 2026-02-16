import { PermissionFlagsBits, type PermissionsBitField } from "discord.js";
import { logger } from "../../core/logger";
import type { NexonEvent } from "../../types/event";
import { buildBlacklistedWarningMessage } from "../../services/owner/blacklist-warning.service";
import {
  buildBotContainerResponse,
  getClientAvatarUrl,
} from "../../ui/component-v2/container-response";
import {
  buildGreetEditorPanel,
  createGreetEditorSessionKey,
  setDraftField,
} from "../../services/welcome/greet-editor.service";

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

function isPotentialPrefixlessCommandAttempt(
  content: string,
  commandNames: { has: (name: string) => boolean },
): boolean {
  const trimmed = content.trim();
  if (!trimmed) {
    return false;
  }

  const [rawName] = trimmed.split(/\s+/);
  if (!rawName) {
    return false;
  }

  return commandNames.has(rawName.toLowerCase());
}

const messageCreateEvent: NexonEvent<"messageCreate"> = {
  name: "messageCreate",
  async execute(client, message) {
    if (!message.inGuild() || message.author.bot) {
      return;
    }

    const prefix = await client.prefixService.getGuildPrefix(message.guildId);
    const startsWithPrefix = message.content.startsWith(prefix);

    const isBotOwner = await client.isBotOwner(message.author.id);
    if (!isBotOwner) {
      const blacklisted = await client.ownerControlService.isBlacklisted(
        message.author.id,
      );

      if (blacklisted) {
        let attemptedCommand = startsWithPrefix;

        if (!attemptedCommand) {
          const hasNoPrefixAccess = await client.ownerControlService.isNoPrefixUser(
            message.author.id,
          );
          attemptedCommand =
            hasNoPrefixAccess &&
            isPotentialPrefixlessCommandAttempt(message.content, client.prefixCommands);
        }

        if (attemptedCommand) {
          await message.reply(
            buildBlacklistedWarningMessage({
              client,
              userId: message.author.id,
            }),
          );
        }

        return;
      }
    }

    const editorSessionKey = createGreetEditorSessionKey(
      message.guildId,
      message.author.id,
    );
    const editorSession = client.greetEditorSessions.get(editorSessionKey);

    if (
      editorSession &&
      editorSession.awaitingField &&
      message.channelId === editorSession.channelId &&
      !message.content.startsWith(prefix)
    ) {
      const value = message.content.trim();
      if (!value) {
        return;
      }

      editorSession.draft = setDraftField(
        editorSession.draft,
        editorSession.awaitingField,
        value,
      );
      editorSession.awaitingField = null;
      client.greetEditorSessions.set(editorSessionKey, editorSession);

      const panelMessage = await message.channel.messages
        .fetch(editorSession.panelMessageId)
        .catch(() => null);

      if (panelMessage) {
        await panelMessage.edit(
          buildGreetEditorPanel({
            avatarUrl: getClientAvatarUrl(client),
            prefix,
            session: editorSession,
            note: "Field updated successfully.",
          }),
        );
      }

      const confirmation = await message.reply(
        buildBotContainerResponse({
          avatarUrl: getClientAvatarUrl(client),
          title: "Welcome Editor",
          body: "Value saved and preview updated.",
        }),
      );

      setTimeout(() => {
        void confirmation.delete().catch(() => undefined);
      }, 7000);
      return;
    }

    const canUseNoPrefix =
      !startsWithPrefix &&
      (await client.ownerControlService.isNoPrefixUser(message.author.id));

    if (!startsWithPrefix && !canUseNoPrefix) {
      return;
    }

    const content = startsWithPrefix
      ? message.content.slice(prefix.length).trim()
      : message.content.trim();

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

    if (command.ownerOnly && !isBotOwner) {
      await message.reply(
        buildBotContainerResponse({
          avatarUrl: getClientAvatarUrl(client),
          title: "Nexon",
          body: "This command is locked. Only bot owners can use it.",
        }),
      );
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
