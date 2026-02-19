import { Collection } from "discord.js";
import type {
  AfkEntryRepository,
  AfkEntryRow,
  AfkScope,
} from "../supabase/repositories/afk-entry.repository";

const PENDING_TTL_MS = 5 * 60_000;

interface AfkPendingSelection {
  guildId: string;
  userId: string;
  reason: string;
  createdAtMs: number;
}

function createServerKey(guildId: string, userId: string): string {
  return `${guildId}:${userId}`;
}

function createPendingKey(guildId: string, userId: string): string {
  return `${guildId}:${userId}`;
}

function normalizeReason(reason: string | null | undefined): string {
  const normalized = reason?.trim();
  if (!normalized) {
    return "AFK";
  }

  return normalized.slice(0, 180);
}

export class AfkService {
  private readonly globalAfkCache = new Collection<string, AfkEntryRow | null>();
  private readonly serverAfkCache = new Collection<string, AfkEntryRow | null>();
  private readonly pendingSelections = new Collection<string, AfkPendingSelection>();

  public constructor(private readonly afkEntryRepository: AfkEntryRepository) {}

  private sweepPending(nowMs = Date.now()): void {
    for (const [key, session] of this.pendingSelections.entries()) {
      if (nowMs - session.createdAtMs > PENDING_TTL_MS) {
        this.pendingSelections.delete(key);
      }
    }
  }

  public createPendingSelection(input: {
    guildId: string;
    userId: string;
    reason: string;
  }): AfkPendingSelection {
    this.sweepPending();

    const session: AfkPendingSelection = {
      guildId: input.guildId,
      userId: input.userId,
      reason: normalizeReason(input.reason),
      createdAtMs: Date.now(),
    };

    this.pendingSelections.set(createPendingKey(input.guildId, input.userId), session);
    return session;
  }

  public consumePendingSelection(
    guildId: string,
    userId: string,
  ): AfkPendingSelection | null {
    this.sweepPending();

    const key = createPendingKey(guildId, userId);
    const session = this.pendingSelections.get(key) ?? null;
    if (!session) {
      return null;
    }

    this.pendingSelections.delete(key);
    return session;
  }

  public clearPendingSelection(guildId: string, userId: string): void {
    this.pendingSelections.delete(createPendingKey(guildId, userId));
  }

  public async getGlobalAfk(userId: string): Promise<AfkEntryRow | null> {
    if (this.globalAfkCache.has(userId)) {
      return this.globalAfkCache.get(userId) ?? null;
    }

    const row = await this.afkEntryRepository.getGlobalByUserId(userId);
    this.globalAfkCache.set(userId, row);
    return row;
  }

  public async getServerAfk(guildId: string, userId: string): Promise<AfkEntryRow | null> {
    const key = createServerKey(guildId, userId);

    if (this.serverAfkCache.has(key)) {
      return this.serverAfkCache.get(key) ?? null;
    }

    const row = await this.afkEntryRepository.getServerByUserId(guildId, userId);
    this.serverAfkCache.set(key, row);
    return row;
  }

  public async getEffectiveAfk(
    guildId: string,
    userId: string,
  ): Promise<AfkEntryRow | null> {
    const server = await this.getServerAfk(guildId, userId);
    if (server) {
      return server;
    }

    return this.getGlobalAfk(userId);
  }

  public async setAfk(input: {
    scope: AfkScope;
    guildId: string;
    userId: string;
    reason: string;
  }): Promise<AfkEntryRow> {
    const normalizedReason = normalizeReason(input.reason);

    if (input.scope === "global") {
      const row = await this.afkEntryRepository.upsertGlobal({
        userId: input.userId,
        reason: normalizedReason,
      });

      this.globalAfkCache.set(input.userId, row);

      await this.afkEntryRepository.deleteServerByUserId(input.guildId, input.userId);
      this.serverAfkCache.set(createServerKey(input.guildId, input.userId), null);

      return row;
    }

    const row = await this.afkEntryRepository.upsertServer({
      guildId: input.guildId,
      userId: input.userId,
      reason: normalizedReason,
    });

    this.serverAfkCache.set(createServerKey(input.guildId, input.userId), row);

    await this.afkEntryRepository.deleteGlobalByUserId(input.userId);
    this.globalAfkCache.set(input.userId, null);

    return row;
  }

  public async clearEffectiveAfkOnMessage(input: {
    guildId: string;
    userId: string;
  }): Promise<AfkEntryRow[]> {
    const removed: AfkEntryRow[] = [];

    const serverRow = await this.getServerAfk(input.guildId, input.userId);
    if (serverRow) {
      await this.afkEntryRepository.deleteServerByUserId(input.guildId, input.userId);
      this.serverAfkCache.set(createServerKey(input.guildId, input.userId), null);
      removed.push(serverRow);
    }

    const globalRow = await this.getGlobalAfk(input.userId);
    if (globalRow) {
      await this.afkEntryRepository.deleteGlobalByUserId(input.userId);
      this.globalAfkCache.set(input.userId, null);
      removed.push(globalRow);
    }

    return removed;
  }
}
