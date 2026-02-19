import type { SupabaseClient } from "@supabase/supabase-js";

export type AfkScope = "global" | "server";

export interface AfkEntryRow {
  user_id: string;
  scope: AfkScope;
  guild_id: string;
  reason: string | null;
  created_at: string | null;
  updated_at: string | null;
}

const GLOBAL_GUILD_KEY = "global";

export class AfkEntryRepository {
  public constructor(private readonly db: SupabaseClient) {}

  public async getGlobalByUserId(userId: string): Promise<AfkEntryRow | null> {
    const { data, error } = await this.db
      .from("afk_entries")
      .select("*")
      .eq("user_id", userId)
      .eq("scope", "global")
      .eq("guild_id", GLOBAL_GUILD_KEY)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data as AfkEntryRow | null;
  }

  public async getServerByUserId(
    guildId: string,
    userId: string,
  ): Promise<AfkEntryRow | null> {
    const { data, error } = await this.db
      .from("afk_entries")
      .select("*")
      .eq("user_id", userId)
      .eq("scope", "server")
      .eq("guild_id", guildId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data as AfkEntryRow | null;
  }

  public async upsertGlobal(input: {
    userId: string;
    reason: string | null;
  }): Promise<AfkEntryRow> {
    const { data, error } = await this.db
      .from("afk_entries")
      .upsert(
        {
          user_id: input.userId,
          scope: "global",
          guild_id: GLOBAL_GUILD_KEY,
          reason: input.reason,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,scope,guild_id" },
      )
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    return data as AfkEntryRow;
  }

  public async upsertServer(input: {
    guildId: string;
    userId: string;
    reason: string | null;
  }): Promise<AfkEntryRow> {
    const { data, error } = await this.db
      .from("afk_entries")
      .upsert(
        {
          user_id: input.userId,
          scope: "server",
          guild_id: input.guildId,
          reason: input.reason,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,scope,guild_id" },
      )
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    return data as AfkEntryRow;
  }

  public async deleteGlobalByUserId(userId: string): Promise<void> {
    const { error } = await this.db
      .from("afk_entries")
      .delete()
      .eq("user_id", userId)
      .eq("scope", "global")
      .eq("guild_id", GLOBAL_GUILD_KEY);

    if (error) {
      throw error;
    }
  }

  public async deleteServerByUserId(guildId: string, userId: string): Promise<void> {
    const { error } = await this.db
      .from("afk_entries")
      .delete()
      .eq("user_id", userId)
      .eq("scope", "server")
      .eq("guild_id", guildId);

    if (error) {
      throw error;
    }
  }
}
