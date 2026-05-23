"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// ─── Types ────────────────────────────────────────────────────────────────
export type AddonOverrideKey = string; // `${addonId}:${size}`

export type AddonOverride = {
  addon_id: string;
  size: string;
  price_cents: number | null;
  duration_mins: number | null;
  reason: string | null;
  updated_at: string;
};

export type AddonHistoryEntry = {
  id: string;
  addon_id: string;
  size: string;
  prev_price_cents: number | null;
  new_price_cents: number | null;
  prev_duration_mins: number | null;
  new_duration_mins: number | null;
  base_price_cents: number | null;
  base_duration_mins: number | null;
  reason: string | null;
  changed_at: string;
};

/** Map keyed by `${addon_id}:${size}` so consumers can do an O(1) lookup
 *  without iterating every override. Returns an empty map when there are no
 *  overrides (the safe default — base values apply everywhere). */
export type AddonOverrideMap = Record<AddonOverrideKey, { price_cents: number | null; duration_mins: number | null }>;

// ─── Helpers ──────────────────────────────────────────────────────────────
function overrideKey(addonId: string, size: string): AddonOverrideKey {
  return `${addonId}:${size}`;
}

async function requireAdminUserId(): Promise<string | null> {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return null;
  const admin = createAdminClient();
  const { data: row } = await admin.from("profiles").select("role").eq("id", user.id).maybeSingle();
  const roleStr = ((row as { role?: string } | null)?.role ?? "").toLowerCase();
  const allowlist = (process.env.ADMIN_EMAILS ?? process.env.ADMIN_EMAIL ?? "zackariahlacey@gmail.com")
    .toLowerCase().split(",").map(s => s.trim()).filter(Boolean);
  const isAdmin = roleStr === "admin" || (!!user.email && allowlist.includes(user.email.toLowerCase()));
  return isAdmin ? user.id : null;
}

// ─── Public reads ─────────────────────────────────────────────────────────
/** Used by the landing page (server component) — passes the override map
 *  through props to BuildYourPackage / BookingModal so price math uses
 *  current values. No auth needed — overrides are admin-set but the
 *  resulting price/duration is public-facing. */
export async function getAddonOverridesMap(): Promise<AddonOverrideMap> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("addon_pricing_overrides")
    .select("addon_id, size, price_cents, duration_mins");
  if (error) {
    console.error("[addonPricing] read failed:", error.message);
    return {};
  }
  const map: AddonOverrideMap = {};
  for (const row of (data ?? []) as Array<{ addon_id: string; size: string; price_cents: number | null; duration_mins: number | null }>) {
    map[overrideKey(row.addon_id, row.size)] = {
      price_cents: row.price_cents,
      duration_mins: row.duration_mins,
    };
  }
  return map;
}

/** Full list of overrides for the admin UI — includes metadata. */
export async function listAddonOverrides(): Promise<AddonOverride[]> {
  const uid = await requireAdminUserId();
  if (!uid) return [];
  const admin = createAdminClient();
  const { data } = await admin
    .from("addon_pricing_overrides")
    .select("addon_id, size, price_cents, duration_mins, reason, updated_at")
    .order("addon_id", { ascending: true })
    .order("size", { ascending: true });
  return (data ?? []) as AddonOverride[];
}

/** History for one addon (or all if addonId omitted), newest first. */
export async function getAddonPricingHistory(addonId?: string, limit: number = 50): Promise<AddonHistoryEntry[]> {
  const uid = await requireAdminUserId();
  if (!uid) return [];
  const admin = createAdminClient();
  let q = admin.from("addon_pricing_history")
    .select("id, addon_id, size, prev_price_cents, new_price_cents, prev_duration_mins, new_duration_mins, base_price_cents, base_duration_mins, reason, changed_at")
    .order("changed_at", { ascending: false })
    .limit(limit);
  if (addonId) q = q.eq("addon_id", addonId);
  const { data } = await q;
  return (data ?? []) as AddonHistoryEntry[];
}

// ─── Mutations ────────────────────────────────────────────────────────────
/** Insert or update an override and append to history. Pass null to either
 *  field to clear that field (leaves the other intact). Pass both null to
 *  remove the override row entirely.
 *
 *  basePriceCents / baseDurationMins are the hard-coded source-of-truth
 *  values for snapshot purposes — caller passes them in since this action
 *  is decoupled from the TS constants. */
export async function setAddonOverride(args: {
  addonId: string;
  size: string;
  priceCents: number | null;
  durationMins: number | null;
  basePriceCents: number | null;
  baseDurationMins: number | null;
  reason?: string;
}): Promise<{ success: boolean; error?: string }> {
  const uid = await requireAdminUserId();
  if (!uid) return { success: false, error: "Admin only." };
  if (!args.addonId.trim() || !args.size.trim()) return { success: false, error: "addonId + size required." };

  const admin = createAdminClient();

  // Read current state for the history snapshot
  const { data: existing } = await admin
    .from("addon_pricing_overrides")
    .select("price_cents, duration_mins")
    .eq("addon_id", args.addonId)
    .eq("size", args.size)
    .maybeSingle();

  const prevPrice = (existing as any)?.price_cents ?? null;
  const prevDuration = (existing as any)?.duration_mins ?? null;

  // No change → no-op
  if (prevPrice === args.priceCents && prevDuration === args.durationMins) {
    return { success: true };
  }

  // Both null → remove the row
  if (args.priceCents === null && args.durationMins === null) {
    await admin.from("addon_pricing_overrides").delete()
      .eq("addon_id", args.addonId).eq("size", args.size);
  } else {
    const { error } = await admin.from("addon_pricing_overrides").upsert({
      addon_id: args.addonId,
      size: args.size,
      price_cents: args.priceCents,
      duration_mins: args.durationMins,
      reason: args.reason?.trim() || null,
      updated_at: new Date().toISOString(),
      updated_by: uid,
    }, { onConflict: "addon_id,size" });
    if (error) return { success: false, error: error.message };
  }

  // History snapshot
  await admin.from("addon_pricing_history").insert({
    addon_id: args.addonId,
    size: args.size,
    prev_price_cents: prevPrice,
    new_price_cents: args.priceCents,
    prev_duration_mins: prevDuration,
    new_duration_mins: args.durationMins,
    base_price_cents: args.basePriceCents,
    base_duration_mins: args.baseDurationMins,
    reason: args.reason?.trim() || null,
    changed_by: uid,
  });

  return { success: true };
}

export async function clearAddonOverride(args: {
  addonId: string;
  size: string;
  basePriceCents: number | null;
  baseDurationMins: number | null;
  reason?: string;
}): Promise<{ success: boolean; error?: string }> {
  return setAddonOverride({
    addonId: args.addonId,
    size: args.size,
    priceCents: null,
    durationMins: null,
    basePriceCents: args.basePriceCents,
    baseDurationMins: args.baseDurationMins,
    reason: args.reason ?? "Cleared override",
  });
}

// Sync helpers belong in lib/addonPricing.ts — server-action files can only
// export async functions. Import resolveAddon from there.
