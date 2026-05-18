"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type MaintenanceOffer = {
  id: string;
  vehicleId: string | null;
  sourceBookingId: string;
  sourceServiceName: string;
  vehicleYear: string | null;
  vehicleMake: string | null;
  vehicleModel: string | null;
  vehicleSize: string | null;
  basePrice: number;
  eligibleUntil: string;
  createdAt: string;
};

/**
 * Returns the current customer's active (un-redeemed, un-expired)
 * maintenance offers, newest first. Used by the dashboard to render
 * one-tap rebook cards.
 */
export async function getMaintenanceOffers(): Promise<MaintenanceOffer[]> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user?.id) return [];

  const admin = createAdminClient();
  const today = new Date().toLocaleDateString("en-CA");
  const { data, error } = await admin
    .from("maintenance_offers")
    .select("id, vehicle_id, source_booking_id, source_service_name, source_vehicle_year, source_vehicle_make, source_vehicle_model, source_vehicle_size, base_price, eligible_until, created_at, redeemed_booking_id")
    .eq("user_id", auth.user.id)
    .is("redeemed_booking_id", null)
    .gte("eligible_until", today)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[getMaintenanceOffers]", error);
    return [];
  }

  return (data ?? []).map((r: any) => ({
    id: r.id,
    vehicleId: r.vehicle_id ?? null,
    sourceBookingId: r.source_booking_id,
    sourceServiceName: r.source_service_name,
    vehicleYear: r.source_vehicle_year ?? null,
    vehicleMake: r.source_vehicle_make ?? null,
    vehicleModel: r.source_vehicle_model ?? null,
    vehicleSize: r.source_vehicle_size ?? null,
    basePrice: Number(r.base_price ?? 0),
    eligibleUntil: r.eligible_until,
    createdAt: r.created_at,
  }));
}

/**
 * Returns the user's saved vehicles (from past bookings).
 * One row per distinct year/make/model on bookings, plus the most recent
 * service date so the dashboard can show "Last detailed: Mar 12, 2026".
 */
export type SavedVehicle = {
  vehicleId: string | null;
  year: string | null;
  make: string | null;
  model: string | null;
  size: string | null;
  lastDetailedDate: string | null;
  lastServiceName: string | null;
  bookingsCount: number;
};

export async function getSavedVehicles(): Promise<SavedVehicle[]> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user?.id) return [];

  const admin = createAdminClient();
  const { data } = await admin
    .from("bookings")
    .select("vehicle_id, vehicle_year, vehicle_make, vehicle_model, vehicle_size, booking_date, service_name, status")
    .eq("user_id", auth.user.id)
    .neq("status", "cancelled")
    .order("booking_date", { ascending: false });

  // Group by year+make+model fingerprint
  const byKey = new Map<string, SavedVehicle>();
  for (const b of (data ?? []) as any[]) {
    const yr = (b.vehicle_year ?? "").trim();
    const mk = (b.vehicle_make ?? "").trim();
    const md = (b.vehicle_model ?? "").trim();
    if (!mk && !md && !yr) continue;
    const key = `${yr}|${mk.toLowerCase()}|${md.toLowerCase()}`;
    const existing = byKey.get(key);
    if (existing) {
      existing.bookingsCount += 1;
    } else {
      byKey.set(key, {
        vehicleId: b.vehicle_id ?? null,
        year: yr || null,
        make: mk || null,
        model: md || null,
        size: b.vehicle_size ?? null,
        lastDetailedDate: b.booking_date ?? null,
        lastServiceName: b.service_name ?? null,
        bookingsCount: 1,
      });
    }
  }

  return Array.from(byKey.values());
}
