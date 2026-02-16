import { Collection } from "discord.js";
import {
  isNoPrefixExpired,
  mergeNoPrefixExpiry,
  parseNoPrefixExpiryTimestamp,
  resolveNoPrefixExpiryFromDuration,
} from "./noprefix-duration.service";
import type {
  BlacklistUserRepository,
  BlacklistUserRow,
} from "../supabase/repositories/blacklist-user.repository";
import type {
  NoPrefixUserRepository,
  NoPrefixUserRow,
} from "../supabase/repositories/noprefix-user.repository";

interface NoPrefixCacheState {
  active: boolean;
  expiresAtMs: number | null;
}

export interface NoPrefixSourceContext {
  addedGuildId?: string | null;
  addedChannelId?: string | null;
}

export class OwnerControlService {
  private readonly noPrefixCache = new Collection<string, NoPrefixCacheState>();
  private readonly blacklistCache = new Collection<string, boolean>();

  public constructor(
    private readonly noPrefixUserRepository: NoPrefixUserRepository,
    private readonly blacklistUserRepository: BlacklistUserRepository,
  ) {}

  private cacheNoPrefixRow(userId: string, row: NoPrefixUserRow | null): void {
    if (!row) {
      this.noPrefixCache.set(userId, { active: false, expiresAtMs: null });
      return;
    }

    this.noPrefixCache.set(userId, {
      active: true,
      expiresAtMs: parseNoPrefixExpiryTimestamp(row.expires_at),
    });
  }

  private markNoPrefixInactive(userId: string, expiresAt: string | null): void {
    this.noPrefixCache.set(userId, {
      active: false,
      expiresAtMs: parseNoPrefixExpiryTimestamp(expiresAt),
    });
  }

  private async filterExpiredNoPrefixRow(
    row: NoPrefixUserRow | null,
  ): Promise<NoPrefixUserRow | null> {
    if (!row) {
      return null;
    }

    if (!isNoPrefixExpired(row.expires_at)) {
      this.cacheNoPrefixRow(row.user_id, row);
      return row;
    }

    this.markNoPrefixInactive(row.user_id, row.expires_at);
    return null;
  }

  private buildNoPrefixUpsertPayload(input: {
    userId: string;
    addedBy: string;
    expiresAt: string | null;
    sourceContext?: NoPrefixSourceContext;
  }): Pick<NoPrefixUserRow, "user_id"> &
    Partial<
      Pick<
        NoPrefixUserRow,
        "added_by" | "expires_at" | "added_guild_id" | "added_channel_id"
      >
    > {
    const payload: Pick<NoPrefixUserRow, "user_id"> &
      Partial<
        Pick<
          NoPrefixUserRow,
          "added_by" | "expires_at" | "added_guild_id" | "added_channel_id"
        >
      > = {
      user_id: input.userId,
      added_by: input.addedBy,
      expires_at: input.expiresAt,
    };

    if (input.sourceContext?.addedGuildId !== undefined) {
      payload.added_guild_id = input.sourceContext.addedGuildId;
    }

    if (input.sourceContext?.addedChannelId !== undefined) {
      payload.added_channel_id = input.sourceContext.addedChannelId;
    }

    return payload;
  }

  public async getNoPrefixUser(userId: string): Promise<NoPrefixUserRow | null> {
    const row = await this.noPrefixUserRepository.getByUserId(userId);
    return this.filterExpiredNoPrefixRow(row);
  }

  public async isNoPrefixUser(userId: string): Promise<boolean> {
    const cached = this.noPrefixCache.get(userId);
    if (cached) {
      if (!cached.active) {
        return false;
      }

      if (cached.expiresAtMs !== null && Date.now() >= cached.expiresAtMs) {
        this.noPrefixCache.set(userId, {
          active: false,
          expiresAtMs: cached.expiresAtMs,
        });
        return false;
      }

      return true;
    }

    const row = await this.noPrefixUserRepository.getByUserId(userId);
    const activeRow = await this.filterExpiredNoPrefixRow(row);
    return Boolean(activeRow);
  }

  public async addNoPrefixUser(
    userId: string,
    addedBy: string,
    expiresAt: string | null,
    sourceContext?: NoPrefixSourceContext,
  ): Promise<NoPrefixUserRow> {
    const row = await this.noPrefixUserRepository.upsertUser(
      this.buildNoPrefixUpsertPayload({
        userId,
        addedBy,
        expiresAt,
        ...(sourceContext ? { sourceContext } : {}),
      }),
    );

    this.cacheNoPrefixRow(userId, row);
    return row;
  }

  public async mergeNoPrefixUserDuration(
    userId: string,
    addedBy: string,
    durationMs: number | null,
    sourceContext?: NoPrefixSourceContext,
  ): Promise<NoPrefixUserRow> {
    const existing = await this.getNoPrefixUser(userId);

    if (!existing) {
      const expiresAt = resolveNoPrefixExpiryFromDuration(durationMs);
      return this.addNoPrefixUser(userId, addedBy, expiresAt, sourceContext);
    }

    const mergedExpiresAt = mergeNoPrefixExpiry(existing.expires_at, durationMs);

    const row = await this.noPrefixUserRepository.upsertUser(
      this.buildNoPrefixUpsertPayload({
        userId,
        addedBy,
        expiresAt: mergedExpiresAt,
        ...(sourceContext ? { sourceContext } : {}),
      }),
    );

    this.cacheNoPrefixRow(userId, row);
    return row;
  }

  public async removeNoPrefixUser(userId: string): Promise<void> {
    await this.noPrefixUserRepository.deleteByUserId(userId);
    this.cacheNoPrefixRow(userId, null);
  }

  public async listNoPrefixUsers(): Promise<NoPrefixUserRow[]> {
    const rows = await this.noPrefixUserRepository.listAll();
    const activeRows: NoPrefixUserRow[] = [];

    for (const row of rows) {
      if (isNoPrefixExpired(row.expires_at)) {
        this.markNoPrefixInactive(row.user_id, row.expires_at);
        continue;
      }

      this.cacheNoPrefixRow(row.user_id, row);
      activeRows.push(row);
    }

    return activeRows;
  }

  public async consumeExpiredNoPrefixUsers(
    nowMs = Date.now(),
  ): Promise<NoPrefixUserRow[]> {
    const rows = await this.noPrefixUserRepository.listAll();
    const expiredRows: NoPrefixUserRow[] = [];

    for (const row of rows) {
      if (!isNoPrefixExpired(row.expires_at, nowMs)) {
        this.cacheNoPrefixRow(row.user_id, row);
        continue;
      }

      await this.noPrefixUserRepository.deleteByUserId(row.user_id);
      this.markNoPrefixInactive(row.user_id, row.expires_at);
      expiredRows.push(row);
    }

    return expiredRows;
  }

  public async getBlacklistedUser(userId: string): Promise<BlacklistUserRow | null> {
    const row = await this.blacklistUserRepository.getByUserId(userId);
    this.blacklistCache.set(userId, Boolean(row));
    return row;
  }

  public async isBlacklisted(userId: string): Promise<boolean> {
    const cached = this.blacklistCache.get(userId);
    if (cached !== undefined) {
      return cached;
    }

    const exists = await this.blacklistUserRepository.existsByUserId(userId);
    this.blacklistCache.set(userId, exists);
    return exists;
  }

  public async addBlacklistedUser(
    userId: string,
    addedBy: string,
  ): Promise<BlacklistUserRow> {
    const row = await this.blacklistUserRepository.upsertUser({
      user_id: userId,
      added_by: addedBy,
    });

    this.blacklistCache.set(userId, true);
    return row;
  }

  public async removeBlacklistedUser(userId: string): Promise<void> {
    await this.blacklistUserRepository.deleteByUserId(userId);
    this.blacklistCache.set(userId, false);
  }

  public async listBlacklistedUsers(): Promise<BlacklistUserRow[]> {
    return this.blacklistUserRepository.listAll();
  }
}
