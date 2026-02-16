import type { SupabaseClient } from "@supabase/supabase-js";

export interface NoPrefixUserRow {
  user_id: string;
  added_by: string | null;
  created_at: string | null;
  expires_at: string | null;
  added_guild_id: string | null;
  added_channel_id: string | null;
}

export class NoPrefixUserRepository {
  public constructor(private readonly db: SupabaseClient) {}

  public async getByUserId(userId: string): Promise<NoPrefixUserRow | null> {
    const { data, error } = await this.db
      .from("noprefix_users")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data as NoPrefixUserRow | null;
  }

  public async existsByUserId(userId: string): Promise<boolean> {
    const { data, error } = await this.db
      .from("noprefix_users")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return Boolean((data as { user_id: string } | null)?.user_id);
  }

  public async upsertUser(
    payload: Pick<NoPrefixUserRow, "user_id"> &
      Partial<
        Pick<
          NoPrefixUserRow,
          "added_by" | "expires_at" | "added_guild_id" | "added_channel_id"
        >
      >,
  ): Promise<NoPrefixUserRow> {
    const { data, error } = await this.db
      .from("noprefix_users")
      .upsert(payload, { onConflict: "user_id" })
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    return data as NoPrefixUserRow;
  }

  public async deleteByUserId(userId: string): Promise<void> {
    const { error } = await this.db
      .from("noprefix_users")
      .delete()
      .eq("user_id", userId);

    if (error) {
      throw error;
    }
  }

  public async listAll(): Promise<NoPrefixUserRow[]> {
    const { data, error } = await this.db
      .from("noprefix_users")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      throw error;
    }

    return (data ?? []) as NoPrefixUserRow[];
  }
}
