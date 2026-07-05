"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { bookDetailing, type VehicleSizeSlug, type BookingResult } from "@/app/actions/bookDetailing";
import {
  type ConditionTier,
  type MaintenanceFoundation,
  maintenanceFoundationFor,
  maintenanceServiceNameFor,
  maintenancePrice,
} from "@/lib/maintenance";

export type BookMaintenanceArgs = {
  offerId: string;
  condition: ConditionTier;
  foundation: MaintenanceFoundation;
  bookingDate: string;          // YYYY-MM-DD
  bookingTime: string;          // "9:00 AM"
  /** Optional override — defaults to the customer's profile address. */
  serviceAddress?: string;
  /** Optional override — defaults to the customer's profile name. */
  name?: string;
  /** Optional override — defaults to the customer's profile phone. */
  phone?: string;
  /** Optional notes the customer adds. */
  notes?: string;
};

/**
 * Books a Maintenance Detail by redeeming an active maintenance offer.
 *
 * - Validates the offer is owned by the caller and un-redeemed
 * - Resolves the right Service id from the chosen foundation
 * - Wraps bookDetailing with maintenance pricing + duration override
 * - bookDetailing itself marks the offer as redeemed
 */
export async function bookMaintenance(args: BookMaintenanceArgs): Promise<BookingResult> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user?.id) {
    return { success: false, error: "You must be signed in to book a maintenance detail." };
  }

  const admin = createAdminClient();
  const { data: offerRow } = await admin
    .from("maintenance_offers")
    .select("id, user_id, vehicle_id, source_booking_id, source_service_name, source_vehicle_year, source_vehicle_make, source_vehicle_model, source_vehicle_size, base_price, eligible_until, redeemed_booking_id")
    .eq("id", args.offerId)
    .maybeSingle();

  if (!offerRow) return { success: false, error: "Maintenance offer not found." };
  if (offerRow.user_id !== auth.user.id) return { success: false, error: "This offer belongs to another account." };
  if (offerRow.redeemed_booking_id) return { success: false, error: "This offer has already been redeemed." };

  const today = new Date().toLocaleDateString("en-CA");
  if (offerRow.eligible_until < today) {
    return { success: false, error: "This maintenance offer has expired." };
  }

  // ── Resolve service ────────────────────────────────────────────────────
  const serviceName = maintenanceServiceNameFor(args.foundation);
  const { data: svcRow } = await admin
    .from("services")
    .select("id")
    .eq("name", serviceName)
    .maybeSingle();
  if (!svcRow?.id) {
    return { success: false, error: `Could not find service "${serviceName}". Please contact support.` };
  }

  // ── Resolve customer profile snapshot ───────────────────────────────────
  const { data: profile } = await admin
    .from("profiles")
    .select("first_name, last_name, phone, email, saved_address")
    .eq("id", auth.user.id)
    .maybeSingle();

  const fullName = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ").trim();
  const metaName = (auth.user.user_metadata?.full_name as string | undefined)?.trim() ?? "";
  // Customer-provided args take precedence over profile snapshot so returning
  // customers can type in name/phone if their profile is missing them.
  const name  = (args.name?.trim())  || fullName || metaName || (auth.user.email ?? "").split("@")[0] || "Customer";
  const phone = (args.phone?.trim()) || (profile?.phone ?? "").trim();
  const email = (profile?.email ?? auth.user.email ?? "").trim();
  const serviceAddress = (args.serviceAddress ?? profile?.saved_address ?? "").trim();

  if (!serviceAddress) {
    return { success: false, error: "We need a service address — please add one to your profile or include it in this booking." };
  }
  if (!phone) {
    return { success: false, error: "We need a phone number to confirm — please add one to your profile or include it in this booking." };
  }

  // ── Pricing + size mapping ──────────────────────────────────────────────
  const price = maintenancePrice(Number(offerRow.base_price ?? 0), args.condition);

  // Map stored "small/medium/large/extra_large" back to the customer-facing
  // slug bookDetailing expects (sedan/suv/xl). "small" is legacy — fold it
  // into sedan since compact is gone.
  const sizeMapBack: Record<string, VehicleSizeSlug> = {
    small: "sedan", medium: "sedan", large: "suv", extra_large: "xl",
  };
  const vehicleSize: VehicleSizeSlug =
    sizeMapBack[offerRow.source_vehicle_size ?? ""] ?? "sedan";

  return bookDetailing({
    serviceId:        svcRow.id,
    serviceName,
    totalPrice:       price,
    vehicleSize,
    vehicleYear:      offerRow.source_vehicle_year ?? "",
    vehicleMake:      offerRow.source_vehicle_make ?? "",
    vehicleModel:     offerRow.source_vehicle_model ?? "",
    bookingDate:      args.bookingDate,
    bookingTime:      args.bookingTime,
    serviceAddress,
    name,
    phone,
    email,
    notes:            args.notes ?? "",
    paymentMethod:    "pay_at_arrival",
    maintenanceOfferId:   args.offerId,
    maintenanceCondition: args.condition,
  });
}
