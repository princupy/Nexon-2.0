import type { SupabaseClient } from "@supabase/supabase-js";

export interface AntinukeConfigRow {
  guild_id: string;
  enabled: boolean;
  nightmode_enabled: boolean;
  extra_owner_id: string | null;
  log_channel_id: string | null;
  updated_by: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export class AntinukeConfigRepository {
  public constructor(private readonly db: SupabaseClient) {}

  public async getByGuildId(guildId: string): Promise<AntinukeConfigRow | null> {
    const { data, error } = await this.db
      .from("antinuke_configs")
      .select("*")
      .eq("guild_id", guildId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data as AntinukeConfigRow | null;
  }

  public async upsertByGuildId(
    payload: Pick<AntinukeConfigRow, "guild_id"> &
      Partial<
        Pick<
          AntinukeConfigRow,
          "enabled" | "nightmode_enabled" | "extra_owner_id" | "log_channel_id" | "updated_by"
        >
      >,
  ): Promise<AntinukeConfigRow> {
    const upsertPayload = {
      ...payload,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await this.db
      .from("antinuke_configs")
      .upsert(upsertPayload, { onConflict: "guild_id" })
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    return data as AntinukeConfigRow;
  }
}
