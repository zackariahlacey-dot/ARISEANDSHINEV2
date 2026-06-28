"use server";

/**
 * Linked Calendars — bidirectional booking conflict prevention with the
 * sister exterior site. Single shared toggle lives on the exterior-owned
 * settings table; both sites read it and honor it.
 *
 * Source of truth:
 *   public.exterior_admin_settings.block_on_detailing_days  (boolean)
 *
 * When TRUE: any day with at least one active exterior_bookings row gets
 * treated as fully blocked in our detailing availability picker.
 *
 * Constraints honored:
 *   - We never alter the schema of exterior_admin_settings or
 *     exterior_bookings — only the one column gets written from this site.
 *   - All cross-table access goes through the service-role client; anon
 *     RLS can't see exterior rows (admin-only via is_exterior_admin())
 *     and our detailing admin is NOT that admin.
 *   - The toggle write is wrapped in OUR admin guard so only detailing
 *     admins on this site can flip the linked setting.
 *
 * Defensive default: if either read fails, assume LINKED (TRUE) and
 * surface no exterior dates. That's the safer failure mode — never
 * accidentally double-book the owner across two businesses.
 */

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const SETTINGS_TABLE     = "exterior_admin_settings";
const SETTINGS_ROW_ID    = 1; // singleton row, lives on the exterior side
const SETTINGS_COLUMN    = "block_on_detailing_days";
const BOOKINGS_TABLE     = "exterior_bookings";
const ACTIVE_STATUSES    = ["pending", "confirmed", "in_progress"];

// ── Admin guard (mirrors adminAuditLog.ts) ──────────────────────────────────
async function requireDetailingAdmin(): Promise<boolean> {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return false;
  const admin = createAdminClient();
  const { data: row } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  const isAdminRole = ((row as { role?: string } | null)?.role ?? "").toLowerCase() === "admin";
  const allowlist = (process.env.ADMIN_EMAILS ?? process.env.ADMIN_EMAIL ?? "zackariahlacey@gmail.com")
    .toLowerCase().split(",").map(s => s.trim()).filter(Boolean);
  const emailMatch = !!user.email && allowlist.includes(user.email.toLowerCase());
  return isAdminRole || emailMatch;
}

// ── Read the toggle ─────────────────────────────────────────────────────────

/**
 * Returns the current value of the shared linked-calendar toggle.
 * On any read failure, returns `true` (safer default — keep the calendars
 * linked so a missing settings row can't cause a double-book).
 */
export async function getLinkedCalendarSetting(): Promise<boolean> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from(SETTINGS_TABLE)
      .select(SETTINGS_COLUMN)
      .eq("id", SETTINGS_ROW_ID)
      .maybeSingle();
    if (error) {
      console.warn(`[linkedCalendar] settings read failed: ${error.message} — assuming LINKED`);
      return true;
    }
    if (!data) {
      console.warn("[linkedCalendar] settings row missing — assuming LINKED");
      return true;
    }
    const raw = (data as Record<string, unknown>)[SETTINGS_COLUMN];
    // Postgres returns booleans natively but defensively coerce string forms.
    if (typeof raw === "boolean") return raw;
    if (raw === "true" || raw === "t") return true;
    if (raw === "false" || raw === "f") return false;
    return true;
  } catch (e) {
    console.warn("[linkedCalendar] settings read threw — assuming LINKED:", e);
    return true;
  }
}

// ── Write the toggle (admin-only) ───────────────────────────────────────────

export type SetLinkedResult =
  | { ok: true; linked: boolean }
  | { ok: false; error: string };

/**
 * Flip the shared linked-calendar toggle. Server-only, admin-only.
 * Writes via the service-role client because the exterior table's
 * RLS policy is is_exterior_admin() — our detailing admin isn't on
 * the exterior allowlist, so anon writes would be blocked.
 */
export async function setLinkedCalendarSetting(value: boolean): Promise<SetLinkedResult> {
  if (!(await requireDetailingAdmin())) {
    return { ok: false, error: "Admin only." };
  }
  try {
    const supabase = createAdminClient();
    const { error } = await supabase
      .from(SETTINGS_TABLE)
      .update({ [SETTINGS_COLUMN]: value, updated_at: new Date().toISOString() })
      .eq("id", SETTINGS_ROW_ID);
    if (error) {
      console.error("[linkedCalendar] settings write failed:", error.message);
      return { ok: false, error: error.message };
    }
    return { ok: true, linked: value };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to update linked-calendar setting.";
    console.error("[linkedCalendar] settings write threw:", e);
    return { ok: false, error: msg };
  }
}

// ── Read exterior-blocked dates ─────────────────────────────────────────────

/**
 * Return the set of YYYY-MM-DD dates that have at least one active
 * exterior_bookings row. ONLY queried when the toggle is ON; callers
 * should short-circuit when it's OFF.
 *
 * Range defaults to the next 90 days (the realistic booking window).
 * Returns an empty array on any failure — exterior-side outages must
 * never block customers from booking detailing.
 */
export async function getExteriorBlockedDates(opts?: {
  rangeStart?: string;   // YYYY-MM-DD, inclusive
  rangeDays?:  number;   // default 90
}): Promise<string[]> {
  try {
    const supabase = createAdminClient();
    const start = opts?.rangeStart ?? new Date().toISOString().slice(0, 10);
    const days  = Math.max(1, Math.min(365, opts?.rangeDays ?? 90));
    const endDt = new Date(start + "T00:00:00Z");
    endDt.setUTCDate(endDt.getUTCDate() + days);
    const end = endDt.toISOString().slice(0, 10);

    const { data, error } = await supabase
      .from(BOOKINGS_TABLE)
      .select("scheduled_start")
      .gte("scheduled_start", `${start}T00:00:00`)
      .lt ("scheduled_start", `${end}T00:00:00`)
      .in ("status", ACTIVE_STATUSES);

    if (error) {
      console.warn(`[linkedCalendar] exterior_bookings read failed: ${error.message} — continuing without exterior blocks`);
      return [];
    }
    if (!data) return [];

    // Reduce to a Set of YYYY-MM-DD strings — exterior books in
    // America/New_York; scheduled_start is a timestamptz, so we
    // anchor the date in that zone so DST + late-evening jobs map
    // to the right calendar day.
    const dates = new Set<string>();
    for (const row of data as { scheduled_start: string | null }[]) {
      if (!row.scheduled_start) continue;
      try {
        const d = new Date(row.scheduled_start);
        // Format as YYYY-MM-DD in America/New_York
        const ymd = new Intl.DateTimeFormat("en-CA", {
          timeZone: "America/New_York",
          year:  "numeric",
          month: "2-digit",
          day:   "2-digit",
        }).format(d);
        dates.add(ymd);
      } catch { /* skip unparseable */ }
    }
    return Array.from(dates);
  } catch (e) {
    console.warn("[linkedCalendar] exterior_bookings read threw — continuing without exterior blocks:", e);
    return [];
  }
}

/**
 * One-call helper: returns BOTH the toggle and the exterior-blocked
 * dates (empty when toggle is OFF). Used by getAvailability and the
 * admin schedule's slot picker.
 */
export async function getExteriorBlockedDatesIfLinked(opts?: {
  rangeStart?: string;
  rangeDays?:  number;
}): Promise<{ linked: boolean; dates: string[] }> {
  const linked = await getLinkedCalendarSetting();
  if (!linked) return { linked: false, dates: [] };
  const dates = await getExteriorBlockedDates(opts);
  return { linked: true, dates };
}
