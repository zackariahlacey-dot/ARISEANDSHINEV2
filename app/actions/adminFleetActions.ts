"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export type FleetInquiryStatus = "pending" | "accepted" | "scheduled" | "declined";

export type FleetInquiryRow = {
  id: string;
  businessName: string | null;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  serviceAddress: string | null;
  vehicleCount: number;
  vehicleMix: { sedan: number; suv: number; xl: number };
  serviceTier: string;
  estimatedTotal: number;          // dollars
  fleetDiscountPct: number;
  preferredWindow: string | null;
  notes: string | null;
  status: FleetInquiryStatus;
  scheduledDates: string[];        // ISO date strings
  adminNotes: string | null;
  createdAt: string;
  updatedAt: string;
};

/** List all fleet inquiries, optionally filtered by status. Most recent first. */
export async function listFleetInquiries(filter?: { status?: FleetInquiryStatus }): Promise<FleetInquiryRow[]> {
  const supabase = createAdminClient();
  let q = supabase
    .from("fleet_inquiries")
    .select(`
      id, business_name, contact_name, contact_email, contact_phone, service_address,
      vehicle_count, vehicle_mix_json, service_tier, estimated_total_cents,
      fleet_discount_pct, preferred_window, notes, status, scheduled_dates_json,
      admin_notes, created_at, updated_at
    `)
    .order("created_at", { ascending: false });
  if (filter?.status) q = q.eq("status", filter.status);
  const { data, error } = await q;
  if (error) {
    console.error("[listFleetInquiries]", error.message);
    return [];
  }
  return (data ?? []).map(r => ({
    id:              String((r as any).id),
    businessName:    (r as any).business_name ?? null,
    contactName:     (r as any).contact_name ?? "",
    contactEmail:    (r as any).contact_email ?? "",
    contactPhone:    (r as any).contact_phone ?? "",
    serviceAddress:  (r as any).service_address ?? null,
    vehicleCount:    Number((r as any).vehicle_count ?? 0),
    vehicleMix:      (r as any).vehicle_mix_json ?? { sedan: 0, suv: 0, xl: 0 },
    serviceTier:     (r as any).service_tier ?? "",
    estimatedTotal:  Math.round((Number((r as any).estimated_total_cents ?? 0)) / 100),
    fleetDiscountPct:Number((r as any).fleet_discount_pct ?? 0),
    preferredWindow: (r as any).preferred_window ?? null,
    notes:           (r as any).notes ?? null,
    status:          ((r as any).status ?? "pending") as FleetInquiryStatus,
    scheduledDates:  Array.isArray((r as any).scheduled_dates_json) ? (r as any).scheduled_dates_json : [],
    adminNotes:      (r as any).admin_notes ?? null,
    createdAt:       String((r as any).created_at ?? ""),
    updatedAt:       String((r as any).updated_at ?? ""),
  }));
}

/** Update an inquiry's status + optional scheduled dates + admin notes. */
export async function updateFleetInquiry(input: {
  id: string;
  status?: FleetInquiryStatus;
  scheduledDates?: string[];
  adminNotes?: string;
}): Promise<{ ok: boolean; message?: string }> {
  const supabase = createAdminClient();
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.status != null)         patch.status = input.status;
  if (input.scheduledDates != null) patch.scheduled_dates_json = input.scheduledDates;
  if (input.adminNotes != null)     patch.admin_notes = input.adminNotes;

  const { error } = await supabase.from("fleet_inquiries").update(patch).eq("id", input.id);
  if (error) {
    console.error("[updateFleetInquiry]", error.message);
    return { ok: false, message: error.message };
  }
  revalidatePath("/admin/fleet");
  return { ok: true };
}
