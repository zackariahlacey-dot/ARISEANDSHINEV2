import type { SupabaseClient } from "@supabase/supabase-js";

type Args = {
  userId: string;
  make: string;
  model: string;
  year: number | null;
  size: "small" | "medium" | "large" | "extra_large";
};

/**
 * Returns the canonical vehicle row id for (userId, make, model, year), creating
 * it only if no case-insensitive match exists. Backs the case-insensitive
 * unique index vehicles_user_make_model_year_norm — keeps customer garages from
 * accumulating duplicate cars every time they book.
 */
export async function findOrCreateVehicle(
  supabase: SupabaseClient,
  { userId, make, model, year, size }: Args,
): Promise<string | null> {
  const cleanMake  = (make  ?? "").trim();
  const cleanModel = (model ?? "").trim();
  if (!userId || !cleanMake || !cleanModel) return null;

  const { data: existing } = await supabase
    .from("vehicles")
    .select("id, size")
    .eq("user_id", userId)
    .ilike("make",  cleanMake)
    .ilike("model", cleanModel)
    .eq("year", year as number)
    .maybeSingle();

  if (existing?.id) {
    if (size && existing.size !== size) {
      await supabase.from("vehicles").update({ size }).eq("id", existing.id);
    }
    return existing.id;
  }

  const { data: inserted } = await supabase
    .from("vehicles")
    .insert({ user_id: userId, make: cleanMake, model: cleanModel, year, size })
    .select("id")
    .single();
  return inserted?.id ?? null;
}
