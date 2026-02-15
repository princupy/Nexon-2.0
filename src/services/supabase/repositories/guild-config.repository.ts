import type { SupabaseClient } from "@supabase/supabase-js";

export interface GuildConfigRow {
  guild_id: string;
  prefix: string | null;
  locale: string | null;
  premium_tier: number | null;
  created_at: string | null;
  updated_at: string | null;
}

export class GuildConfigRepository {
  public constructor(private readonly db: SupabaseClient) {}

  public async getByGuildId(guildId: string): Promise<GuildConfigRow | null> {
    const { data, error } = await this.db
      .from("guild_configs")
      .select("*")
      .eq("guild_id", guildId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data as GuildConfigRow | null;
  }

  public async upsertByGuildId(
    payload: Pick<GuildConfigRow, "guild_id"> &
      Partial<Pick<GuildConfigRow, "prefix" | "locale" | "premium_tier">>,
  ): Promise<GuildConfigRow> {
    const { data, error } = await this.db
      .from("guild_configs")
      .upsert(payload, { onConflict: "guild_id" })
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    return data as GuildConfigRow;
  }

  public async getPrefixByGuildId(guildId: string): Promise<string | null> {
    const { data, error } = await this.db
      .from("guild_configs")
      .select("prefix")
      .eq("guild_id", guildId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return (data as { prefix: string | null } | null)?.prefix ?? null;
  }

  public async setPrefixByGuildId(guildId: string, prefix: string): Promise<void> {
    const { error } = await this.db
      .from("guild_configs")
      .upsert({ guild_id: guildId, prefix }, { onConflict: "guild_id" });

    if (error) {
      throw error;
    }
  }
}
