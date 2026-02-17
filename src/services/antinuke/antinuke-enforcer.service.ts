import {
  Collection,
  AuditLogEvent,
  type AuditLogEvent as AuditLogEventType,
  type Guild,
  type GuildAuditLogsEntry,
  type Snowflake,
} from "discord.js";
import { antinukeEmojis } from "../../constants/custom-emojis/antinuke-emojis";
import type { AntinukeFeatureKey } from "../../constants/antinuke-features";
import { logger } from "../../core/logger";
import type { NexonClient } from "../../core/nexon-client";
import { sendAntinukeLogCard } from "./antinuke-log.service";

const AUDIT_LOG_LOOKBACK_MS = 20_000;
const PROCESSED_ENTRY_TTL_MS = 5 * 60_000;
const processedAuditEntries = new Collection<string, number>();

interface AntinukeEnforcementInput {
  client: NexonClient;
  guild: Guild;
  auditLogType: AuditLogEventType;
  actionLabel: string;
  reason: string;
  featureKey: AntinukeFeatureKey;
  targetId?: string;
  requiresNightmode?: boolean;
}

function sweepProcessedAuditEntries(nowMs: number): void {
  for (const [entryId, recordedAt] of processedAuditEntries.entries()) {
    if (nowMs - recordedAt > PROCESSED_ENTRY_TTL_MS) {
      processedAuditEntries.delete(entryId);
    }
  }
}

function isEntryRecent(entry: GuildAuditLogsEntry, nowMs: number): boolean {
  return nowMs - entry.createdTimestamp <= AUDIT_LOG_LOOKBACK_MS;
}

async function resolveRecentAuditLogEntry(input: {
  guild: Guild;
  auditLogType: AuditLogEventType;
  targetId?: string;
}): Promise<GuildAuditLogsEntry | null> {
  const { guild, auditLogType, targetId } = input;

  const logs = await guild.fetchAuditLogs({
    type: auditLogType,
    limit: 8,
  }).catch(() => null);

  if (!logs) {
    return null;
  }

  const nowMs = Date.now();

  for (const entry of logs.entries.values()) {
    if (!isEntryRecent(entry, nowMs)) {
      continue;
    }

    if (targetId && entry.targetId && entry.targetId !== targetId) {
      continue;
    }

    return entry;
  }

  return null;
}

async function punishExecutor(input: {
  guild: Guild;
  executorId: string;
  reason: string;
}): Promise<string> {
  const { guild, executorId, reason } = input;

  const member = await guild.members.fetch(executorId).catch(() => null);
  if (!member) {
    return "No action taken (executor not found in guild).";
  }

  if (member.bannable) {
    await member.ban({ reason }).catch(() => null);
    return "Executor banned.";
  }

  if (member.kickable) {
    await member.kick(reason).catch(() => null);
    return "Executor kicked (ban unavailable).";
  }

  return "No action taken (insufficient permission to punish executor).";
}

async function sendAntinukeEnforcementLog(input: {
  client: NexonClient;
  guild: Guild;
  actionLabel: string;
  featureKey: AntinukeFeatureKey;
  reason: string;
  executorId: string;
  entryId: Snowflake;
  enforcementResult: string;
}): Promise<void> {
  const unix = Math.floor(Date.now() / 1000);

  await sendAntinukeLogCard({
    client: input.client,
    guild: input.guild,
    requestedById: input.guild.ownerId,
    createChannelIfMissing: true,
    title: "Nexon Security Alert",
    bodyLines: [
      `${antinukeEmojis.warn} **${input.actionLabel}** detected and blocked.`,
      `Feature: \`${input.featureKey}\``,
      `Executor: <@${input.executorId}> (\`${input.executorId}\`)`,
      `Reason: ${input.reason}`,
      `Result: ${input.enforcementResult}`,
      `Audit Entry: \`${input.entryId}\``,
      `Time: <t:${unix}:F> (<t:${unix}:R>)`,
    ],
  });
}

export async function processAntinukeEnforcement(
  input: AntinukeEnforcementInput,
): Promise<void> {
  try {
    const {
      client,
      guild,
      auditLogType,
      actionLabel,
      reason,
      featureKey,
      targetId,
      requiresNightmode,
    } = input;

    const config = await client.antinukeService.getConfig(guild.id);
    if (!config.enabled) {
      return;
    }

    if (requiresNightmode && !config.nightmodeEnabled) {
      return;
    }

    const entry = await resolveRecentAuditLogEntry({
      guild,
      auditLogType,
      ...(targetId ? { targetId } : {}),
    });

    if (!entry?.executorId) {
      return;
    }

    const nowMs = Date.now();
    sweepProcessedAuditEntries(nowMs);

    if (processedAuditEntries.has(entry.id)) {
      return;
    }

    processedAuditEntries.set(entry.id, nowMs);

    if (entry.executorId === client.user?.id) {
      return;
    }

    const trusted = await client.antinukeService.isTrustedUser({
      guildId: guild.id,
      userId: entry.executorId,
      guildOwnerId: guild.ownerId,
      isBotOwner: await client.isBotOwner(entry.executorId),
      featureKey,
    });

    if (trusted) {
      return;
    }

    const enforcementResult = await punishExecutor({
      guild,
      executorId: entry.executorId,
      reason,
    });

    await sendAntinukeEnforcementLog({
      client,
      guild,
      actionLabel,
      featureKey,
      reason,
      executorId: entry.executorId,
      entryId: entry.id,
      enforcementResult,
    });

    logger.debug(
      `[ANTINUKE] ${actionLabel} | Guild ${guild.id} | Executor ${entry.executorId} | ${enforcementResult}`,
    );
  } catch (error) {
    logger.debug("Antinuke enforcement skipped due to recoverable error.", error);
  }
}

export {
  AuditLogEvent,
};
