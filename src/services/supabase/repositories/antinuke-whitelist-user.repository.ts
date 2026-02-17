import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeAntinukeFeatureKeys, type AntinukeFeatureKey } from "../../../constants/antinuke-features";

export interface AntinukeWhitelistUserRow {
  guild_id: string;
  user_id: string;
  features: AntinukeFeatureKey[];
  added_by: string | null;
  created_at: string | null;
}

function mapRow(data: unknown): AntinukeWhitelistUserRow {
  const row = data as {
    guild_id: string;
    user_id: string;
    features?: string[] | null;
    added_by: string | null;
    created_at: string | null;
  };

  return {
    guild_id: row.guild_id,
    user_id: row.user_id,
    features: normalizeAntinukeFeatureKeys(row.features),
    added_by: row.added_by,
    created_at: row.created_at,
  };
}

export class AntinukeWhitelistUserRepository {
  public constructor(private readonly db: SupabaseClient) {}

  public async listByGuildId(guildId: string): Promise<AntinukeWhitelistUserRow[]> {
    const { data, error } = await this.db
      .from("antinuke_whitelist_users")
      .select("*")
      .eq("guild_id", guildId)
      .order("created_at", { ascending: true });

    if (error) {
      throw error;
    }

    return (data ?? []).map((row) => mapRow(row));
  }

  public async getByGuildAndUserId(
    guildId: string,
    userId: string,
  ): Promise<AntinukeWhitelistUserRow | null> {
    const { data, error } = await this.db
      .from("antinuke_whitelist_users")
      .select("*")
      .eq("guild_id", guildId)
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data ? mapRow(data) : null;
  }

  public async exists(guildId: string, userId: string): Promise<boolean> {
    const { data, error } = await this.db
      .from("antinuke_whitelist_users")
      .select("guild_id")
      .eq("guild_id", guildId)
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return Boolean(data);
  }

  public async upsertUser(
    payload: Pick<AntinukeWhitelistUserRow, "guild_id" | "user_id" | "features"> &
      Partial<Pick<AntinukeWhitelistUserRow, "added_by">>,
  ): Promise<AntinukeWhitelistUserRow> {
    const normalizedFeatures = normalizeAntinukeFeatureKeys(payload.features);

    const { data, error } = await this.db
      .from("antinuke_whitelist_users")
      .upsert(
        {
          ...payload,
          features: normalizedFeatures,
        },
        { onConflict: "guild_id,user_id" },
      )
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    return mapRow(data);
  }

  public async deleteUser(guildId: string, userId: string): Promise<void> {
    const { error } = await this.db
      .from("antinuke_whitelist_users")
      .delete()
      .eq("guild_id", guildId)
      .eq("user_id", userId);

    if (error) {
      throw error;
    }
  }

  public async deleteAllByGuildId(guildId: string): Promise<void> {
    const { error } = await this.db
      .from("antinuke_whitelist_users")
      .delete()
      .eq("guild_id", guildId);

    if (error) {
      throw error;
    }
  }
}
