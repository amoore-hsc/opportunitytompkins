import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

/** Upper bound on how many listings one "share by email" request may include. */
export const MAX_SHARED_LISTINGS = 500;

/**
 * Loads active rows by id in small batches (keeps request URLs short) and
 * returns them in the same order as `ids`. Ids that aren't found are skipped.
 */
export async function fetchActiveByIds<T extends { id: string }>(
  supabase: SupabaseClient,
  table: string,
  columns: string,
  ids: string[],
): Promise<T[]> {
  const unique = Array.from(new Set(ids));
  const byId = new Map<string, T>();
  for (let i = 0; i < unique.length; i += 100) {
    const batch = unique.slice(i, i + 100);
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .in("id", batch)
      .eq("active", true);
    if (error) throw error;
    for (const row of (data ?? []) as unknown as T[]) byId.set(row.id, row);
  }
  return unique.map((id) => byId.get(id)).filter((row): row is T => row !== undefined);
}
