"use server";

/**
 * Server actions for managing monthly-recurring Light Detailing enrollments.
 *
 * Enrollment flow:
 *   1. Customer completes a Light Detailing booking.
 *   2. Admin clicks "Enroll in Monthly" on the completed booking.
 *   3. A recurring_bookings row is created snapshotting the customer, vehicle,
 *      selected items, and per-item prices.
 *   4. A daily cron (`/api/cron/recurring-bookings`) creates the next booking
 *      when next_run_date arrives, then advances next_run_date by interval_days.
 *
 * Admin gating: mirrors app/admin/layout.tsx — profiles.role === 'admin' OR
 * email in ADMIN_EMAILS/ADMIN_EMAIL allowlist.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { LIGHT_DETAIL_ITEMS, type LightDetailSize } from "@/lib/lightDetailItems";

// ── Admin gate ──────────────────────────────────────────────────────────────
async function requireAdmin(): Promise<{ ok: true; userId: string } | { ok: false; error: string }> {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

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
  if (!isAdminRole && !emailMatch) return { ok: false, error: "Admin access required." };
  return { ok: true, userId: user.id };
}

export type EnrollRecurringArgs = {
  bookingId: string;
  intervalDays?: number;
  preferredDayOfWeek?: number;
  preferredTime?: string; // "HH:MM:SS"
  discountPct?: number;
};

/**
 * Snapshot a completed booking into a new recurring_bookings row. Reads the
 * source booking's customer/vehicle info and selected Light Detailing items
 * from addons_json. next_run_date defaults to (bookingDate + intervalDays).
 */
export async function enrollBookingInRecurring(
  args: EnrollRecurringArgs
): Promise<{ success: boolean; recurringId?: string; error?: string }> {
  const gate = await requireAdmin();
  if (!gate.ok) return { success: false, error: gate.error };

  const admin = createAdminClient();
  const intervalDays = Math.max(1, args.intervalDays ?? 30);
  const discountPct = args.discountPct ?? 10;

  // Load booking snapshot
  const { data: booking, error: bookErr } = await admin
    .from("bookings")
    .select("id, user_id, vehicle_id, service_id, booking_date, booking_time, customer_name, customer_phone, customer_email, service_address, vehicle_year, vehicle_make, vehicle_model, vehicle_size, addons_json, recurring_booking_id")
    .eq("id", args.bookingId)
    .maybeSingle();
  if (bookErr || !booking) return { success: false, error: "Source booking not found." };
  if (booking.recurring_booking_id) return { success: false, error: "Booking is already part of a recurring plan." };

  // Extract Light Detailing item IDs from addons_json
  const addonRows = Array.isArray(booking.addons_json) ? booking.addons_json : [];
  const knownIds = new Set(LIGHT_DETAIL_ITEMS.map(i => i.id));
  const selectedItems: string[] = [];
  const itemPrices: Record<string, number> = {};
  for (const row of addonRows as Array<{ id?: string; price?: number }>) {
    if (row && typeof row.id === "string" && knownIds.has(row.id)) {
      selectedItems.push(row.id);
      if (typeof row.price === "number") itemPrices[row.id] = row.price;
    }
  }
  if (selectedItems.length === 0) {
    return { success: false, error: "No Light Detailing items found on this booking to recur." };
  }

  // Next run date = booking_date + intervalDays
  const base = new Date(`${booking.booking_date}T00:00:00Z`);
  base.setUTCDate(base.getUTCDate() + intervalDays);
  const nextRunDate = base.toISOString().slice(0, 10);

  const { data: inserted, error: insErr } = await admin
    .from("recurring_bookings")
    .insert({
      user_id:               booking.user_id,
      vehicle_id:            booking.vehicle_id,
      service_id:            booking.service_id,
      customer_name:         booking.customer_name,
      customer_phone:        booking.customer_phone,
      customer_email:        booking.customer_email,
      service_address:       booking.service_address,
      vehicle_year:          booking.vehicle_year ? parseInt(String(booking.vehicle_year), 10) || null : null,
      vehicle_make:          booking.vehicle_make,
      vehicle_model:         booking.vehicle_model,
      vehicle_size:          booking.vehicle_size,
      selected_items:        selectedItems,
      item_prices:           itemPrices,
      interval_days:         intervalDays,
      preferred_day_of_week: args.preferredDayOfWeek ?? null,
      preferred_time:        args.preferredTime ?? booking.booking_time ?? null,
      next_run_date:         nextRunDate,
      last_booking_id:       booking.id,
      discount_pct:          discountPct,
      active:                true,
    })
    .select("id")
    .single();

  if (insErr || !inserted) {
    console.error("[enrollBookingInRecurring] insert:", insErr);
    return { success: false, error: insErr?.message ?? "Could not create recurring plan." };
  }

  // Backlink source booking
  await admin.from("bookings").update({ recurring_booking_id: inserted.id }).eq("id", booking.id);

  return { success: true, recurringId: inserted.id };
}

export async function pauseRecurring(
  recurringId: string,
  until: string
): Promise<{ success: boolean; error?: string }> {
  const gate = await requireAdmin();
  if (!gate.ok) return { success: false, error: gate.error };
  const admin = createAdminClient();
  const { error } = await admin
    .from("recurring_bookings")
    .update({ paused_until: until, updated_at: new Date().toISOString() })
    .eq("id", recurringId);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function resumeRecurring(
  recurringId: string
): Promise<{ success: boolean; error?: string }> {
  const gate = await requireAdmin();
  if (!gate.ok) return { success: false, error: gate.error };
  const admin = createAdminClient();
  const { error } = await admin
    .from("recurring_bookings")
    .update({ paused_until: null, updated_at: new Date().toISOString() })
    .eq("id", recurringId);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function cancelRecurring(
  recurringId: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  const gate = await requireAdmin();
  if (!gate.ok) return { success: false, error: gate.error };
  const admin = createAdminClient();
  const { error } = await admin
    .from("recurring_bookings")
    .update({
      active: false,
      cancelled_at: new Date().toISOString(),
      cancelled_reason: reason ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", recurringId);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function updateRecurringSchedule(
  recurringId: string,
  patch: Partial<EnrollRecurringArgs>
): Promise<{ success: boolean; error?: string }> {
  const gate = await requireAdmin();
  if (!gate.ok) return { success: false, error: gate.error };
  const admin = createAdminClient();

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.intervalDays != null)       update.interval_days = Math.max(1, patch.intervalDays);
  if (patch.preferredDayOfWeek != null) update.preferred_day_of_week = patch.preferredDayOfWeek;
  if (patch.preferredTime != null)      update.preferred_time = patch.preferredTime;
  if (patch.discountPct != null)        update.discount_pct = patch.discountPct;

  const { error } = await admin.from("recurring_bookings").update(update).eq("id", recurringId);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export type RecurringListRow = {
  id: string;
  customer_name: string | null;
  customer_phone: string | null;
  customer_email: string | null;
  service_address: string | null;
  vehicle_year: number | null;
  vehicle_make: string | null;
  vehicle_model: string | null;
  vehicle_size: LightDetailSize | string | null;
  selected_items: string[];
  item_prices: Record<string, number> | null;
  interval_days: number;
  preferred_day_of_week: number | null;
  preferred_time: string | null;
  next_run_date: string;
  discount_pct: number | null;
  active: boolean;
  paused_until: string | null;
  cancelled_at: string | null;
  cancelled_reason: string | null;
  last_created_at: string | null;
  service_name: string | null;
  created_at: string;
};

export async function listRecurringBookings(
  includeInactive = false
): Promise<{ success: boolean; rows?: RecurringListRow[]; error?: string }> {
  const gate = await requireAdmin();
  if (!gate.ok) return { success: false, error: gate.error };
  const admin = createAdminClient();

  let q = admin
    .from("recurring_bookings")
    .select("id, customer_name, customer_phone, customer_email, service_address, vehicle_year, vehicle_make, vehicle_model, vehicle_size, selected_items, item_prices, interval_days, preferred_day_of_week, preferred_time, next_run_date, discount_pct, active, paused_until, cancelled_at, cancelled_reason, last_created_at, created_at, services:service_id(name)")
    .order("next_run_date", { ascending: true });
  if (!includeInactive) q = q.eq("active", true);

  const { data, error } = await q;
  if (error) return { success: false, error: error.message };

  const rows: RecurringListRow[] = (data ?? []).map((r: any) => ({
    id: r.id,
    customer_name: r.customer_name,
    customer_phone: r.customer_phone,
    customer_email: r.customer_email,
    service_address: r.service_address,
    vehicle_year: r.vehicle_year,
    vehicle_make: r.vehicle_make,
    vehicle_model: r.vehicle_model,
    vehicle_size: r.vehicle_size,
    selected_items: Array.isArray(r.selected_items) ? r.selected_items : [],
    item_prices: r.item_prices ?? null,
    interval_days: r.interval_days,
    preferred_day_of_week: r.preferred_day_of_week,
    preferred_time: r.preferred_time,
    next_run_date: r.next_run_date,
    discount_pct: r.discount_pct,
    active: r.active,
    paused_until: r.paused_until,
    cancelled_at: r.cancelled_at,
    cancelled_reason: r.cancelled_reason,
    last_created_at: r.last_created_at,
    service_name: r.services?.name ?? null,
    created_at: r.created_at,
  }));

  return { success: true, rows };
}
