import type { SupabaseClient } from "@supabase/supabase-js";

export interface BlacklistUserRow {
  user_id: string;
  added_by: string | null;
  created_at: string | null;
}

export class BlacklistUserRepository {
  public constructor(private readonly db: SupabaseClient) {}

  public async getByUserId(userId: string): Promise<BlacklistUserRow | null> {
    const { data, error } = await this.db
      .from("blacklist_users")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data as BlacklistUserRow | null;
  }

  public async existsByUserId(userId: string): Promise<boolean> {
    const { data, error } = await this.db
      .from("blacklist_users")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return Boolean((data as { user_id: string } | null)?.user_id);
  }

  public async upsertUser(
    payload: Pick<BlacklistUserRow, "user_id"> &
      Partial<Pick<BlacklistUserRow, "added_by">>,
  ): Promise<BlacklistUserRow> {
    const { data, error } = await this.db
      .from("blacklist_users")
      .upsert(payload, { onConflict: "user_id" })
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    return data as BlacklistUserRow;
  }

  public async deleteByUserId(userId: string): Promise<void> {
    const { error } = await this.db
      .from("blacklist_users")
      .delete()
      .eq("user_id", userId);

    if (error) {
      throw error;
    }
  }

  public async listAll(): Promise<BlacklistUserRow[]> {
    const { data, error } = await this.db
      .from("blacklist_users")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      throw error;
    }

    return (data ?? []) as BlacklistUserRow[];
  }
}
