import { Collection } from "discord.js";
import {
  DEFAULT_PREFIX,
  PREFIX_MAX_LENGTH,
  PREFIX_MIN_LENGTH,
} from "../../constants/prefix";
import type { GuildConfigRepository } from "../supabase/repositories/guild-config.repository";

function normalizePrefix(prefix: string): string {
  return prefix.trim();
}

export class PrefixValidationError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "PrefixValidationError";
  }
}

export class PrefixService {
  private readonly cache = new Collection<string, string>();

  public constructor(private readonly guildConfigRepository: GuildConfigRepository) {}

  public validatePrefix(prefix: string): string {
    const normalized = normalizePrefix(prefix);

    if (normalized.length < PREFIX_MIN_LENGTH) {
      throw new PrefixValidationError("The prefix cannot be empty.");
    }

    if (normalized.length > PREFIX_MAX_LENGTH) {
      throw new PrefixValidationError(
        `The prefix must be at most ${PREFIX_MAX_LENGTH} characters long.`,
      );
    }

    if (/\s/.test(normalized)) {
      throw new PrefixValidationError("The prefix cannot contain spaces.");
    }

    return normalized;
  }

  public async getGuildPrefix(guildId: string): Promise<string> {
    const cached = this.cache.get(guildId);
    if (cached) {
      return cached;
    }

    const dbPrefix = await this.guildConfigRepository.getPrefixByGuildId(guildId);
    const prefix = dbPrefix ?? DEFAULT_PREFIX;
    this.cache.set(guildId, prefix);
    return prefix;
  }

  public async setGuildPrefix(guildId: string, prefix: string): Promise<string> {
    const normalized = this.validatePrefix(prefix);
    await this.guildConfigRepository.setPrefixByGuildId(guildId, normalized);
    this.cache.set(guildId, normalized);
    return normalized;
  }

  public async resetGuildPrefix(guildId: string): Promise<string> {
    await this.guildConfigRepository.setPrefixByGuildId(guildId, DEFAULT_PREFIX);
    this.cache.set(guildId, DEFAULT_PREFIX);
    return DEFAULT_PREFIX;
  }
}
