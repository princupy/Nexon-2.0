import { ContainerBuilder, TextDisplayBuilder } from "@discordjs/builders";
import {
  MessageFlags,
  PermissionFlagsBits,
  type PermissionsBitField,
  type User,
} from "discord.js";
import { logger } from "../../core/logger";
import type { NexonEvent } from "../../types/event";
import { buildBlacklistedWarningMessage } from "../../services/owner/blacklist-warning.service";
import type { AfkEntryRow } from "../../services/supabase/repositories/afk-entry.repository";
import {
  buildBotContainerResponse,
  buildV2Section,
  buildV2Separator,
  getClientAvatarUrl,
} from "../../ui/component-v2/container-response";
import {
  buildGreetEditorPanel,
  createGreetEditorSessionKey,
  setDraftField,
} from "../../services/welcome/greet-editor.service";

const AFK_DM_ALERT_COOLDOWN_MS = 60_000;
const afkDmAlertCooldown = new Map<string, number>();

interface AfkNoticeEntry {
  userId: string;
  scopeLabel: string;
  reason: string;
  sinceUnix: number | null;
  avatarUrl: string;
}

interface AfkNotifyTarget {
  user: User;
  afkEntry: AfkEntryRow;
  triggers: Set<"mention" | "reply">;
}

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

function parseCommandPayload(input: {
  content: string;
  prefix: string;
  startsWithPrefix: boolean;
  canUseNoPrefix: boolean;
}): {
  name: string;
  args: string[];
} | null {
  if (!input.startsWithPrefix && !input.canUseNoPrefix) {
    return null;
  }

  const content = input.startsWithPrefix
    ? input.content.slice(input.prefix.length).trim()
    : input.content.trim();

  if (!content) {
    return null;
  }

  const [rawCommandName, ...args] = content.split(/\s+/);
  if (!rawCommandName) {
    return null;
  }

  return {
    name: rawCommandName.toLowerCase(),
    args,
  };
}

function parseAfkUnix(row: AfkEntryRow): number | null {
  const source = row.updated_at ?? row.created_at;
  if (!source) {
    return null;
  }

  const timestamp = Date.parse(source);
  if (Number.isNaN(timestamp)) {
    return null;
  }

  return Math.floor(timestamp / 1000);
}

function formatAfkScope(row: AfkEntryRow): string {
  return row.scope === "global" ? "Global AFK" : "Server AFK";
}

function buildAfkTriggerLabel(triggers: Set<"mention" | "reply">): string {
  const hasMention = triggers.has("mention");
  const hasReply = triggers.has("reply");

  if (hasMention && hasReply) {
    return "Mention + Reply";
  }

  if (hasReply) {
    return "Reply";
  }

  return "Mention";
}

function sanitizeMessagePreview(content: string): string {
  const normalized = content.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return "[No text content]";
  }

  if (normalized.length <= 180) {
    return normalized;
  }

  return `${normalized.slice(0, 177)}...`;
}

function resolveChannelLabel(input: {
  channelId: string;
  channelName: string | null;
}): string {
  if (input.channelName) {
    return `#${input.channelName}`;
  }

  return `<#${input.channelId}>`;
}

function createAfkDmAlertCooldownKey(input: {
  afkUserId: string;
  actorUserId: string;
  guildId: string;
}): string {
  return `${input.guildId}:${input.actorUserId}:${input.afkUserId}`;
}

function canSendAfkDmAlert(cooldownKey: string, nowMs = Date.now()): boolean {
  for (const [key, timestamp] of afkDmAlertCooldown.entries()) {
    if (nowMs - timestamp > AFK_DM_ALERT_COOLDOWN_MS) {
      afkDmAlertCooldown.delete(key);
    }
  }

  const lastSentAt = afkDmAlertCooldown.get(cooldownKey);
  if (lastSentAt !== undefined && nowMs - lastSentAt < AFK_DM_ALERT_COOLDOWN_MS) {
    return false;
  }

  afkDmAlertCooldown.set(cooldownKey, nowMs);
  return true;
}

function buildAfkRemovedCard(input: {
  userId: string;
  scopeLabels: string[];
}) {
  const container = new ContainerBuilder()
    .addTextDisplayComponents(new TextDisplayBuilder().setContent("## Welcome Back"))
    .addSeparatorComponents(buildV2Separator())
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent("Your AFK status has been removed."),
    )
    .addSeparatorComponents(buildV2Separator())
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          `User: <@${input.userId}>`,
          `Removed: ${input.scopeLabels.join(" + ")}`,
        ].join("\n"),
      ),
    )
    .addSeparatorComponents(buildV2Separator())
    .addTextDisplayComponents(new TextDisplayBuilder().setContent("AFK system"));

  return {
    flags: MessageFlags.IsComponentsV2,
    components: [container],
  } as const;
}

function buildAfkNoticeCard(input: { entries: AfkNoticeEntry[] }) {
  const container = new ContainerBuilder()
    .addTextDisplayComponents(new TextDisplayBuilder().setContent("## AFK Notice"))
    .addSeparatorComponents(buildV2Separator())
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent("Mentioned user is currently AFK."),
    )
    .addSeparatorComponents(buildV2Separator());

  for (const [index, entry] of input.entries.entries()) {
    const details = [
      `<@${entry.userId}>`,
      `Scope: ${entry.scopeLabel}`,
      `Reason: ${entry.reason}`,
      `Since: ${
        entry.sinceUnix
          ? `<t:${entry.sinceUnix}:F> (<t:${entry.sinceUnix}:R>)`
          : "recently"
      }`,
    ].join("\n");

    container.addSectionComponents(
      buildV2Section({
        text: [details],
        accessory: {
          type: "thumbnail",
          url: entry.avatarUrl,
        },
      }),
    );

    if (index < input.entries.length - 1) {
      container.addSeparatorComponents(buildV2Separator());
    }
  }

  container
    .addSeparatorComponents(buildV2Separator())
    .addTextDisplayComponents(new TextDisplayBuilder().setContent("AFK system"));

  return {
    flags: MessageFlags.IsComponentsV2,
    components: [container],
  } as const;
}

function buildAfkDmAlertCard(input: {
  actorUserId: string;
  actorUsername: string;
  actorAvatarUrl: string;
  scopeLabel: string;
  reason: string;
  guildId: string;
  serverName: string;
  channelId: string;
  channelLabel: string;
  messagePreview: string;
  messageUrl: string;
  messageId: string;
  sinceUnix: number | null;
  triggerLabel: string;
  nowUnix: number;
}) {
  const container = new ContainerBuilder()
    .addSectionComponents(
      buildV2Section({
        text: [
          "## AFK Update",
          "Someone pinged/replied to you while you were AFK.",
        ],
        accessory: {
          type: "thumbnail",
          url: input.actorAvatarUrl,
        },
      }),
    )
    .addSeparatorComponents(buildV2Separator())
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          "**By**",
          `<@${input.actorUserId}>`,
          `Username: ${input.actorUsername}`,
          `ID: ${input.actorUserId}`,
          "",
          "**Server**",
          `${input.serverName}`,
          `ID: ${input.guildId}`,
          "",
          "**Channel**",
          `${input.channelLabel}`,
          `ID: ${input.channelId}`,
          "",
          "**Trigger**",
          input.triggerLabel,
          "",
          "**AFK Scope**",
          input.scopeLabel,
          "",
          "**Your AFK Reason**",
          input.reason,
          "",
          "**Since**",
          input.sinceUnix
            ? `<t:${input.sinceUnix}:F> (<t:${input.sinceUnix}:R>)`
            : "recently",
          "",
          "**Message Preview**",
          input.messagePreview,
          "",
          "**Message ID**",
          input.messageId,
          "",
          "**Jump To Message**",
          `[Open Message](${input.messageUrl})`,
          "",
          `**Triggered At**\n<t:${input.nowUnix}:F> (<t:${input.nowUnix}:R>)`,
        ].join("\n"),
      ),
    )
    .addSeparatorComponents(buildV2Separator())
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent("Turn on DMs to always receive AFK alerts."),
    );

  return {
    flags: MessageFlags.IsComponentsV2,
    components: [container],
  } as const;
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

    const canUseNoPrefix =
      !startsWithPrefix &&
      (await client.ownerControlService.isNoPrefixUser(message.author.id));

    const parsedPayload = parseCommandPayload({
      content: message.content,
      prefix,
      startsWithPrefix,
      canUseNoPrefix,
    });

    const parsedCommand = parsedPayload && client.prefixCommands.has(parsedPayload.name)
      ? parsedPayload
      : null;

    const isAfkSetupCommand = parsedCommand?.name === "afk";

    if (!isAfkSetupCommand) {
      const removedAfk = await client.afkService.clearEffectiveAfkOnMessage({
        guildId: message.guildId,
        userId: message.author.id,
      });

      if (removedAfk.length > 0) {
        const scopeLabels = [...new Set(removedAfk.map((entry) => formatAfkScope(entry)))];

        await message.reply(
          buildAfkRemovedCard({
            userId: message.author.id,
            scopeLabels,
          }),
        );
      }
    }

    const mentionTargets = [...message.mentions.users.values()]
      .filter((user) => !user.bot && user.id !== message.author.id)
      .slice(0, 8);

    const notifyTargets = new Map<string, AfkNotifyTarget>();

    const registerAfkTarget = (input: {
      user: User;
      afkEntry: AfkEntryRow;
      trigger: "mention" | "reply";
    }) => {
      const existing = notifyTargets.get(input.user.id);
      if (existing) {
        existing.triggers.add(input.trigger);
        return;
      }

      notifyTargets.set(input.user.id, {
        user: input.user,
        afkEntry: input.afkEntry,
        triggers: new Set([input.trigger]),
      });
    };

    for (const user of mentionTargets) {
      const afkEntry = await client.afkService.getEffectiveAfk(
        message.guildId,
        user.id,
      );

      if (!afkEntry) {
        continue;
      }

      registerAfkTarget({
        user,
        afkEntry,
        trigger: "mention",
      });
    }

    if (message.reference?.messageId) {
      const repliedMessage = await message.fetchReference().catch(() => null);
      const repliedUser = repliedMessage?.author ?? null;

      if (repliedUser && !repliedUser.bot && repliedUser.id !== message.author.id) {
        const afkEntry = await client.afkService.getEffectiveAfk(
          message.guildId,
          repliedUser.id,
        );

        if (afkEntry) {
          registerAfkTarget({
            user: repliedUser,
            afkEntry,
            trigger: "reply",
          });
        }
      }
    }

    if (notifyTargets.size > 0) {
      const mentionEntries: AfkNoticeEntry[] = [];

      for (const target of notifyTargets.values()) {
        const sinceUnix = parseAfkUnix(target.afkEntry);
        const targetAvatarUrl =
          target.user.displayAvatarURL({
            extension: "png",
            size: 1024,
          }) ?? getClientAvatarUrl(client);

        mentionEntries.push({
          userId: target.user.id,
          scopeLabel: formatAfkScope(target.afkEntry),
          reason: target.afkEntry.reason ?? "AFK",
          sinceUnix,
          avatarUrl: targetAvatarUrl,
        });

        const cooldownKey = createAfkDmAlertCooldownKey({
          afkUserId: target.user.id,
          actorUserId: message.author.id,
          guildId: message.guildId,
        });

        if (!canSendAfkDmAlert(cooldownKey)) {
          continue;
        }

        const channelName = "name" in message.channel ? message.channel.name : null;

        await target.user.send(
          buildAfkDmAlertCard({
            actorUserId: message.author.id,
            actorUsername: message.author.username,
            actorAvatarUrl:
              message.author.displayAvatarURL({
                extension: "png",
                size: 1024,
              }) ?? getClientAvatarUrl(client),
            scopeLabel: formatAfkScope(target.afkEntry),
            reason: target.afkEntry.reason ?? "AFK",
            guildId: message.guildId,
            serverName: message.guild.name,
            channelId: message.channelId,
            channelLabel: resolveChannelLabel({
              channelId: message.channelId,
              channelName,
            }),
            messagePreview: sanitizeMessagePreview(message.content),
            messageUrl: message.url,
            messageId: message.id,
            sinceUnix,
            triggerLabel: buildAfkTriggerLabel(target.triggers),
            nowUnix: Math.floor(Date.now() / 1000),
          }),
        ).catch(() => null);
      }

      if (mentionEntries.length > 0) {
        await message.reply(buildAfkNoticeCard({ entries: mentionEntries }));
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

    if (!startsWithPrefix && !canUseNoPrefix) {
      return;
    }

    if (!parsedCommand) {
      return;
    }

    const command = client.prefixCommands.get(parsedCommand.name);

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
        args: parsedCommand.args,
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
