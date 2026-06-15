"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { SERVICE_DURATIONS } from "@/lib/constants";

export type Addon = { id: string; label: string; price: number; minutes?: number };

export type BookingVehicleRow = {
  id: string;
  booking_id: string;
  vehicle_id: string | null;
  position: number;
  make: string | null;
  model: string | null;
  year: number | null;
  size: "small" | "medium" | "large" | "extra_large" | null;
  service_id: string | null;
  service_name: string | null;
  base_price: number;
  addons_json: Addon[];
  line_total: number;
  duration_mins: number | null;
  status: "pending" | "in_progress" | "complete";
  completed_at: string | null;
  notes: string | null;
};

export type BookingVehicleInput = {
  make?: string | null;
  model?: string | null;
  year?: number | null;
  size?: "small" | "medium" | "large" | "extra_large" | null;
  service_id?: string | null;
  service_name?: string | null;
  base_price?: number;
  addons_json?: Addon[];
  duration_mins?: number | null;
  notes?: string | null;
};

function calcLineTotal(basePrice: number, addons: Addon[]): number {
  const addonSum = (addons ?? []).reduce((s, a) => s + (Number(a.price) || 0), 0);
  return Math.max(0, Number(basePrice || 0) + addonSum);
}

function calcDuration(serviceName: string | null, size: string | null, addons: Addon[]): number {
  const base = (serviceName && size)
    ? (SERVICE_DURATIONS[serviceName]?.[size] ?? 180)
    : 180;
  const addonMins = (addons ?? []).reduce((s, a) => s + (Number(a.minutes) || 0), 0);
  return base + addonMins;
}

/** Re-totals the booking_vehicles for a booking and writes the sum to bookings.total_price. */
async function recomputeBookingTotal(bookingId: string) {
  const supabase = createAdminClient();
  const { data: lines } = await supabase
    .from("booking_vehicles")
    .select("line_total")
    .eq("booking_id", bookingId);
  const total = (lines ?? []).reduce((s, l) => s + Number(l.line_total ?? 0), 0);
  await supabase.from("bookings").update({ total_price: total }).eq("id", bookingId);
  return total;
}

export async function listBookingVehicles(bookingId: string): Promise<BookingVehicleRow[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("booking_vehicles")
    .select("*")
    .eq("booking_id", bookingId)
    .order("position", { ascending: true });
  return (data ?? []) as BookingVehicleRow[];
}

export async function addBookingVehicle(
  bookingId: string,
  input: BookingVehicleInput,
): Promise<{ ok: boolean; id?: string; error?: string }> {
  const supabase = createAdminClient();

  // Look up booking owner for the vehicles row
  const { data: booking } = await supabase
    .from("bookings")
    .select("user_id")
    .eq("id", bookingId)
    .maybeSingle();
  if (!booking) return { ok: false, error: "Booking not found." };

  // Position = (max existing position) + 1
  const { data: existing } = await supabase
    .from("booking_vehicles")
    .select("position")
    .eq("booking_id", bookingId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  const position = (existing?.position ?? -1) + 1;

  // If the booking has an owner profile, dedup into vehicles
  let vehicleDbId: string | null = null;
  if (booking.user_id && input.make && input.model) {
    const { findOrCreateVehicle } = await import("@/lib/findOrCreateVehicle");
    vehicleDbId = await findOrCreateVehicle(supabase, {
      userId: booking.user_id,
      make:   input.make,
      model:  input.model,
      year:   input.year ?? null,
      size:   (input.size ?? "medium") as any,
    });
  }

  const addons = input.addons_json ?? [];
  const lineTotal = calcLineTotal(input.base_price ?? 0, addons);
  const duration  = input.duration_mins ?? calcDuration(input.service_name ?? null, input.size ?? null, addons);

  const { data: row, error } = await supabase
    .from("booking_vehicles")
    .insert({
      booking_id:    bookingId,
      vehicle_id:    vehicleDbId,
      position,
      make:          input.make ?? null,
      model:         input.model ?? null,
      year:          input.year ?? null,
      size:          input.size ?? null,
      service_id:    input.service_id ?? null,
      service_name:  input.service_name ?? null,
      base_price:    input.base_price ?? 0,
      addons_json:   addons,
      line_total:    lineTotal,
      duration_mins: duration,
      notes:         input.notes ?? null,
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };
  await recomputeBookingTotal(bookingId);
  return { ok: true, id: row.id };
}

export async function updateBookingVehicle(
  id: string,
  patch: BookingVehicleInput,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createAdminClient();
  const { data: current } = await supabase
    .from("booking_vehicles")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!current) return { ok: false, error: "Vehicle line not found." };

  const merged = {
    make:          patch.make          ?? current.make,
    model:         patch.model         ?? current.model,
    year:          patch.year          ?? current.year,
    size:          patch.size          ?? current.size,
    service_id:    patch.service_id    ?? current.service_id,
    service_name:  patch.service_name  ?? current.service_name,
    base_price:    patch.base_price    ?? Number(current.base_price ?? 0),
    addons_json:   patch.addons_json   ?? current.addons_json ?? [],
    duration_mins: patch.duration_mins ?? current.duration_mins,
    notes:         patch.notes         ?? current.notes,
  };
  const addons = (merged.addons_json ?? []) as Addon[];
  merged.duration_mins = patch.duration_mins ?? calcDuration(merged.service_name, merged.size, addons);
  const line_total = calcLineTotal(merged.base_price, addons);

  // Sync the vehicles row if make/model/year changed and a profile owns this booking
  if ((patch.make || patch.model || patch.year != null) && current.booking_id) {
    const { data: booking } = await supabase
      .from("bookings")
      .select("user_id")
      .eq("id", current.booking_id)
      .maybeSingle();
    if (booking?.user_id && merged.make && merged.model) {
      const { findOrCreateVehicle } = await import("@/lib/findOrCreateVehicle");
      const vid = await findOrCreateVehicle(supabase, {
        userId: booking.user_id,
        make:   merged.make,
        model:  merged.model,
        year:   merged.year,
        size:   (merged.size ?? "medium") as any,
      });
      if (vid) (merged as any).vehicle_id = vid;
    }
  }

  const { error } = await supabase
    .from("booking_vehicles")
    .update({ ...merged, line_total, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  await recomputeBookingTotal(current.booking_id);
  return { ok: true };
}

export async function removeBookingVehicle(id: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = createAdminClient();
  const { data: row } = await supabase
    .from("booking_vehicles")
    .select("booking_id")
    .eq("id", id)
    .maybeSingle();
  if (!row) return { ok: false, error: "Vehicle line not found." };

  // Refuse to delete the only vehicle on a booking — that should be deleteBooking instead
  const { count } = await supabase
    .from("booking_vehicles")
    .select("id", { count: "exact", head: true })
    .eq("booking_id", row.booking_id);
  if ((count ?? 0) <= 1) {
    return { ok: false, error: "A booking must have at least one vehicle. Delete the booking instead." };
  }

  const { error } = await supabase.from("booking_vehicles").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  await recomputeBookingTotal(row.booking_id);
  return { ok: true };
}

export async function setBookingVehicleStatus(
  id: string,
  status: "pending" | "in_progress" | "complete",
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createAdminClient();
  const patch: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
    completed_at: status === "complete" ? new Date().toISOString() : null,
  };
  const { data: row, error } = await supabase
    .from("booking_vehicles")
    .update(patch)
    .eq("id", id)
    .select("booking_id")
    .single();
  if (error) return { ok: false, error: error.message };

  // If every vehicle on this booking is complete, flip the booking too
  if (status === "complete") {
    const { data: siblings } = await supabase
      .from("booking_vehicles")
      .select("status")
      .eq("booking_id", row.booking_id);
    if ((siblings ?? []).every(s => s.status === "complete")) {
      await supabase
        .from("bookings")
        .update({ status: "completed" })
        .eq("id", row.booking_id);
    }
  }
  return { ok: true };
}

export async function updateBookingMeta(
  bookingId: string,
  patch: { service_address?: string | null; booking_date?: string; booking_time?: string; notes?: string | null },
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("bookings")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", bookingId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
