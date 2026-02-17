import { Collection } from "discord.js";
import {
  ANTINUKE_FEATURE_DEFINITIONS,
  isAntinukeFeatureKey,
  normalizeAntinukeFeatureKeys,
  type AntinukeFeatureKey,
} from "../../constants/antinuke-features";
import type {
  AntinukeConfigRepository,
  AntinukeConfigRow,
} from "../supabase/repositories/antinuke-config.repository";
import type {
  AntinukeWhitelistUserRepository,
  AntinukeWhitelistUserRow,
} from "../supabase/repositories/antinuke-whitelist-user.repository";

export interface AntinukeConfigState {
  guildId: string;
  enabled: boolean;
  nightmodeEnabled: boolean;
  extraOwnerId: string | null;
  logChannelId: string | null;
  updatedBy: string | null;
}

export interface AntinukeTrustCheckInput {
  guildId: string;
  userId: string;
  guildOwnerId: string;
  isBotOwner: boolean;
  featureKey?: string | null;
}

type AntinukeWhitelistCache = Map<string, Set<AntinukeFeatureKey>>;

function getAllAntinukeFeatureKeys(): AntinukeFeatureKey[] {
  return ANTINUKE_FEATURE_DEFINITIONS.map((feature) => feature.key);
}

export class AntinukeService {
  private readonly configCache = new Collection<string, AntinukeConfigState>();
  private readonly whitelistCache = new Collection<string, AntinukeWhitelistCache>();
  private readonly hydratedWhitelistGuilds = new Collection<string, boolean>();

  public constructor(
    private readonly antinukeConfigRepository: AntinukeConfigRepository,
    private readonly antinukeWhitelistUserRepository: AntinukeWhitelistUserRepository,
  ) {}

  private toConfigState(
    guildId: string,
    row: AntinukeConfigRow | null,
  ): AntinukeConfigState {
    return {
      guildId,
      enabled: row?.enabled ?? false,
      nightmodeEnabled: row?.nightmode_enabled ?? false,
      extraOwnerId: row?.extra_owner_id ?? null,
      logChannelId: row?.log_channel_id ?? null,
      updatedBy: row?.updated_by ?? null,
    };
  }

  private toWhitelistFeatureSet(
    features: readonly AntinukeFeatureKey[],
  ): Set<AntinukeFeatureKey> {
    return new Set(features);
  }

  private cacheWhitelistRows(
    guildId: string,
    rows: readonly AntinukeWhitelistUserRow[],
  ): void {
    const mapped: AntinukeWhitelistCache = new Map();

    for (const row of rows) {
      mapped.set(row.user_id, this.toWhitelistFeatureSet(row.features));
    }

    this.whitelistCache.set(guildId, mapped);
    this.hydratedWhitelistGuilds.set(guildId, true);
  }

  private cacheWhitelistRow(
    guildId: string,
    row: AntinukeWhitelistUserRow,
  ): void {
    const currentMap = this.whitelistCache.get(guildId) ?? new Map();
    currentMap.set(row.user_id, this.toWhitelistFeatureSet(row.features));
    this.whitelistCache.set(guildId, currentMap);

    if (!this.hydratedWhitelistGuilds.has(guildId)) {
      this.hydratedWhitelistGuilds.set(guildId, false);
    }
  }

  private async hydrateWhitelist(guildId: string): Promise<AntinukeWhitelistCache> {
    const cached = this.whitelistCache.get(guildId);
    const hydrated = this.hydratedWhitelistGuilds.get(guildId) === true;

    if (cached && hydrated) {
      return cached;
    }

    const rows = await this.antinukeWhitelistUserRepository.listByGuildId(guildId);
    const mapped: AntinukeWhitelistCache = new Map();

    for (const row of rows) {
      mapped.set(row.user_id, this.toWhitelistFeatureSet(row.features));
    }

    this.whitelistCache.set(guildId, mapped);
    this.hydratedWhitelistGuilds.set(guildId, true);

    return mapped;
  }

  public async getConfig(guildId: string): Promise<AntinukeConfigState> {
    const cached = this.configCache.get(guildId);
    if (cached) {
      return cached;
    }

    const row = await this.antinukeConfigRepository.getByGuildId(guildId);
    const state = this.toConfigState(guildId, row);
    this.configCache.set(guildId, state);
    return state;
  }

  public async setEnabled(
    guildId: string,
    enabled: boolean,
    updatedBy: string,
  ): Promise<AntinukeConfigState> {
    const row = await this.antinukeConfigRepository.upsertByGuildId({
      guild_id: guildId,
      enabled,
      updated_by: updatedBy,
    });

    const state = this.toConfigState(guildId, row);
    this.configCache.set(guildId, state);
    return state;
  }

  public async setNightmodeEnabled(
    guildId: string,
    nightmodeEnabled: boolean,
    updatedBy: string,
  ): Promise<AntinukeConfigState> {
    const row = await this.antinukeConfigRepository.upsertByGuildId({
      guild_id: guildId,
      nightmode_enabled: nightmodeEnabled,
      updated_by: updatedBy,
    });

    const state = this.toConfigState(guildId, row);
    this.configCache.set(guildId, state);
    return state;
  }

  public async setExtraOwner(
    guildId: string,
    extraOwnerId: string,
    updatedBy: string,
  ): Promise<AntinukeConfigState> {
    const row = await this.antinukeConfigRepository.upsertByGuildId({
      guild_id: guildId,
      extra_owner_id: extraOwnerId,
      updated_by: updatedBy,
    });

    const state = this.toConfigState(guildId, row);
    this.configCache.set(guildId, state);
    return state;
  }

  public async clearExtraOwner(
    guildId: string,
    updatedBy: string,
  ): Promise<AntinukeConfigState> {
    const row = await this.antinukeConfigRepository.upsertByGuildId({
      guild_id: guildId,
      extra_owner_id: null,
      updated_by: updatedBy,
    });

    const state = this.toConfigState(guildId, row);
    this.configCache.set(guildId, state);
    return state;
  }

  public async setLogChannelId(
    guildId: string,
    logChannelId: string | null,
    updatedBy: string,
  ): Promise<AntinukeConfigState> {
    const row = await this.antinukeConfigRepository.upsertByGuildId({
      guild_id: guildId,
      log_channel_id: logChannelId,
      updated_by: updatedBy,
    });

    const state = this.toConfigState(guildId, row);
    this.configCache.set(guildId, state);
    return state;
  }

  public async getWhitelistEntry(
    guildId: string,
    userId: string,
  ): Promise<AntinukeWhitelistUserRow | null> {
    const row = await this.antinukeWhitelistUserRepository.getByGuildAndUserId(
      guildId,
      userId,
    );

    if (row) {
      this.cacheWhitelistRow(guildId, row);
    }

    return row;
  }

  public async isWhitelisted(
    guildId: string,
    userId: string,
    featureKey?: string,
  ): Promise<boolean> {
    const whitelist = await this.hydrateWhitelist(guildId);
    const featureSet = whitelist.get(userId);

    if (!featureSet) {
      return false;
    }

    if (!featureKey) {
      return true;
    }

    const normalized = featureKey.trim().toLowerCase();
    if (!isAntinukeFeatureKey(normalized)) {
      return false;
    }

    // Legacy rows with no saved feature list are treated as full whitelist.
    if (featureSet.size === 0) {
      return true;
    }

    return featureSet.has(normalized);
  }

  public async addWhitelistUser(
    guildId: string,
    userId: string,
    addedBy: string,
    features: readonly string[],
  ): Promise<AntinukeWhitelistUserRow> {
    const normalized = normalizeAntinukeFeatureKeys(features);
    const effectiveFeatures = normalized.length
      ? normalized
      : getAllAntinukeFeatureKeys();

    const row = await this.antinukeWhitelistUserRepository.upsertUser({
      guild_id: guildId,
      user_id: userId,
      added_by: addedBy,
      features: effectiveFeatures,
    });

    this.cacheWhitelistRow(guildId, row);
    return row;
  }

  public async removeWhitelistUser(guildId: string, userId: string): Promise<void> {
    await this.antinukeWhitelistUserRepository.deleteUser(guildId, userId);

    const whitelist = await this.hydrateWhitelist(guildId);
    whitelist.delete(userId);
    this.whitelistCache.set(guildId, whitelist);
  }

  public async listWhitelistUsers(guildId: string): Promise<AntinukeWhitelistUserRow[]> {
    const rows = await this.antinukeWhitelistUserRepository.listByGuildId(guildId);
    this.cacheWhitelistRows(guildId, rows);
    return rows;
  }

  public async resetWhitelist(guildId: string): Promise<void> {
    await this.antinukeWhitelistUserRepository.deleteAllByGuildId(guildId);
    this.whitelistCache.set(guildId, new Map<string, Set<AntinukeFeatureKey>>());
    this.hydratedWhitelistGuilds.set(guildId, true);
  }

  public async isTrustedUser(input: AntinukeTrustCheckInput): Promise<boolean> {
    if (input.userId === input.guildOwnerId) {
      return true;
    }

    if (input.isBotOwner) {
      return true;
    }

    const config = await this.getConfig(input.guildId);
    if (config.extraOwnerId && config.extraOwnerId === input.userId) {
      return true;
    }

    return this.isWhitelisted(
      input.guildId,
      input.userId,
      input.featureKey ?? undefined,
    );
  }
}
