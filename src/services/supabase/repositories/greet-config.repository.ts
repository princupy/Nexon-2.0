import type { SupabaseClient } from "@supabase/supabase-js";

export type GreetContainerStyle = "normal" | "colored";

export interface GreetConfigRow {
  guild_id: string;
  enabled: boolean;
  style: GreetContainerStyle;
  channel_id: string | null;
  message_template: string | null;
  auto_delete_seconds: number | null;
  created_at: string | null;
  updated_at: string | null;
}

export class GreetConfigRepository {
  public constructor(private readonly db: SupabaseClient) {}

  public async getByGuildId(guildId: string): Promise<GreetConfigRow | null> {
    const { data, error } = await this.db
      .from("greet_configs")
      .select("*")
      .eq("guild_id", guildId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data as GreetConfigRow | null;
  }

  public async upsertByGuildId(
    payload: Pick<GreetConfigRow, "guild_id"> &
      Partial<
        Pick<
          GreetConfigRow,
          "enabled" | "style" | "channel_id" | "message_template" | "auto_delete_seconds"
        >
      >,
  ): Promise<GreetConfigRow> {
    const { data, error } = await this.db
      .from("greet_configs")
      .upsert(payload, { onConflict: "guild_id" })
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    return data as GreetConfigRow;
  }

  public async resetByGuildId(guildId: string): Promise<GreetConfigRow> {
    return this.upsertByGuildId({
      guild_id: guildId,
      enabled: false,
      style: "normal",
      channel_id: null,
      message_template: null,
      auto_delete_seconds: null,
    });
  }
}
