"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { AdminBookingSchema } from "@/types/admin";
import { SERVICE_DURATIONS } from "@/lib/constants";
import { 
  sendOnMyWayEmailNotification, 
  sendBookingCancellationEmails,
  sendUpdatedBookingEmail,
  sendBookingEmails,
  sendJobCompletedEmail,
  sendReviewFollowupEmail,
  sendPriceUpdatedEmail,
} from "@/lib/email";
import { sendBookingEmail } from "@/app/actions/sendBookingEmail";

// Maps our UI vehicle size slugs to the DB enum values. compact is gone
// from the customer-facing slug set; if an admin/legacy row still has it,
// fold it into "medium" (sedan tier) instead of the orphaned "small".
const VEHICLE_SIZE_MAP = {
  compact: "medium",
  sedan: "medium",
  suv: "large",
  xl: "extra_large",
} as const;

function to24h(time12: string): string {
  const [timePart, period] = time12.split(" ");
  const [rawH, rawM = "00"] = timePart.split(":");
  let h = parseInt(rawH, 10);
  if (period === "AM" && h === 12) h = 0;
  if (period === "PM" && h !== 12) h += 12;
  return `${String(h).padStart(2, "0")}:${rawM}:00`;
}

function timeToMins(t: string): number {
  const m = t.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return 0;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}

export type BookedSlot = {
  id: string;
  booking_time: string;
  service_name: string | null;
  vehicle_size: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  service_address: string | null;
  vehicle_year: string | null;
  vehicle_make: string | null;
  vehicle_model: string | null;
  duration_mins: number;
  total_price: number;
};

/** Returns booked slots for a date with all info needed for the admin timeline view. */
export async function getBookedSlotsAction(date: string): Promise<BookedSlot[]> {
  const supabase = createAdminClient();
  // Slimmed-down query: customer_name lives on the booking row directly, so
  // there's no need for the FK-disambiguated profile join here. Dropping it
  // makes the query robust against changing FK names and removes a class of
  // silent-empty-result failures the admin timeline was suffering from.
  // services(name) is included as a fallback for older bookings where the
  // direct service_name column might not have been populated.
  const { data, error } = await supabase
    .from("bookings")
    .select(`
      id, booking_time, service_name, vehicle_size, customer_name, customer_phone,
      service_address, vehicle_year, vehicle_make, vehicle_model, total_price,
      duration_override, additional_vehicles_json,
      services(name)
    `)
    .eq("booking_date", date)
    .neq("status", "cancelled");

  if (error) {
    console.error("[getBookedSlotsAction] supabase error:", error.message, error.details, error.hint);
    return [];
  }
  return (data ?? []).map(r => {
    const directName = (r as any).service_name as string | null;
    const joined = (r as any).services;
    const joinedName: string | null = Array.isArray(joined)
      ? (joined[0]?.name ?? null)
      : (joined?.name ?? null);
    const svcName = directName ?? joinedName ?? "";
    const vSize   = (r as any).vehicle_size ?? "medium";
    const override = (r as any).duration_override;
    // Include additional vehicles in the slot duration so the timeline blocks
    // the full appointment window, not just the primary vehicle's time.
    const primaryDur = override != null ? override : (SERVICE_DURATIONS[svcName]?.[vSize] ?? 180);
    const addlJson = (r as any).additional_vehicles_json;
    const addlDur = Array.isArray(addlJson) ? addlJson.reduce((sum: number, av: any) => {
      const name = av.serviceName ?? av.sn ?? "";
      const size = av.vehicleSize ?? av.sz ?? "sedan";
      const base = SERVICE_DURATIONS[name]?.[size] ?? 180;
      return sum + Math.max(30, base - 30);
    }, 0) : 0;
    const dur = override != null ? primaryDur : (primaryDur + addlDur);
    const custName = ((r as any).customer_name as string | null) || "Client";
    return {
      id:              String((r as any).id ?? ""),
      booking_time:    String(r.booking_time ?? ""),
      service_name:    svcName || null,
      vehicle_size:    vSize || null,
      customer_name:   custName,
      customer_phone:  (r as any).customer_phone ?? null,
      service_address: (r as any).service_address ?? null,
      vehicle_year:    (r as any).vehicle_year ?? null,
      vehicle_make:    (r as any).vehicle_make ?? null,
      vehicle_model:   (r as any).vehicle_model ?? null,
      duration_mins:   dur,
      total_price:     Number((r as any).total_price ?? 0),
    };
  });
}

/**
 * NEW: Admin Quick Book Action
 * Securely creates an Auth Account for the customer if one doesn't exist.
 */
export async function adminQuickBookAction(payload: any): Promise<{ success: boolean; bookingId?: string; error?: string }> {
  const supabase = createAdminClient();
  const email = payload.email?.toLowerCase().trim();
  const _rawPhone = payload.phone.replace(/\D/g, "");
  const phoneDigits = (_rawPhone.length === 11 && _rawPhone.startsWith("1") ? _rawPhone.slice(1) : _rawPhone).slice(0, 10);
  
  const parts = payload.name.trim().split(/\s+/);
  const firstName = parts[0] ?? "";
  const lastName = parts.slice(1).join(" ") || "";

  let targetUserId: string | undefined;

  // 0. Prefer explicit profile (e.g. admin booking from Clients tab)
  if (payload.preferredProfileId && typeof payload.preferredProfileId === "string") {
    const { data: profRow } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", payload.preferredProfileId)
      .maybeSingle();
    if (profRow?.id) targetUserId = profRow.id;
  }

  // 1. Resolve by Phone FIRST to avoid unique constraint violations and attribute to existing profile
  if (!targetUserId) {
  const { data: existingByPhone } = await supabase
    .from("profiles")
    .select("id")
    .eq("phone", phoneDigits)
    .maybeSingle();

  if (existingByPhone) {
    targetUserId = existingByPhone.id;
  } else if (email) {
    // 2. Try to find existing auth user by email
    const { data: users, error: findError } = await supabase.auth.admin.listUsers();
    const existingUser = users.users.find(u => u.email?.toLowerCase() === email);

    if (existingUser) {
      targetUserId = existingUser.id;
    } else {
      // Create new auth user
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: { first_name: firstName, last_name: lastName },
      });

      if (createError || !newUser.user) {
        console.error("Auth Creation Error:", createError);
        targetUserId = crypto.randomUUID();
      } else {
        targetUserId = newUser.user.id;
      }
    }
  } else {
    // 3. No existing phone and no email, use new UUID
    targetUserId = crypto.randomUUID();
  }
  }

  if (!targetUserId) {
    return { success: false, error: "Could not resolve customer profile." };
  }

  // 2. Ensure Profile exists and is updated (MUST include email so admin can contact client)
  await supabase.from("profiles").upsert({
    id: targetUserId,
    first_name: firstName,
    last_name: lastName,
    phone: phoneDigits,
    ...(email ? { email } : {}),
  }, { onConflict: "id" });

  // 3. Vehicle — reuse existing row or insert new
  let vehicle: { id: string };
  let snapshotMake = payload.vehicleMake || "Unknown";
  let snapshotModel = payload.vehicleModel || "Unknown";
  let snapshotYear = String(payload.vehicleYear || "");
  let dbVehicleSize = VEHICLE_SIZE_MAP[payload.vehicleSize as keyof typeof VEHICLE_SIZE_MAP] || "medium";

  if (payload.existingVehicleId && typeof payload.existingVehicleId === "string") {
    const { data: existingV, error: vErr } = await supabase
      .from("vehicles")
      .select("id, user_id, make, model, year, size")
      .eq("id", payload.existingVehicleId)
      .single();
    if (vErr || !existingV || existingV.user_id !== targetUserId) {
      return { success: false, error: "That saved vehicle could not be used for this booking." };
    }
    vehicle = { id: existingV.id };
    snapshotMake = existingV.make || snapshotMake;
    snapshotModel = existingV.model || snapshotModel;
    snapshotYear = existingV.year != null ? String(existingV.year) : snapshotYear;
    dbVehicleSize = existingV.size || dbVehicleSize;
  } else {
    const { findOrCreateVehicle } = await import("@/lib/findOrCreateVehicle");
    const id = await findOrCreateVehicle(supabase, {
      userId: targetUserId,
      make:   snapshotMake,
      model:  snapshotModel,
      year:   parseInt(String(payload.vehicleYear), 10) || new Date().getFullYear(),
      size:   dbVehicleSize as any,
    });
    if (!id) throw new Error("Vehicle creation failed");
    vehicle = { id };
  }

  // 4. Check Availability First — prevent double booking
  const { checkSlotConflict: _checkConflict, getDurationMins: _getDur, timeToMins: _toMins, to24h: _to24h } = await import("@/lib/availability");

  // Linked-calendar guard — when the shared toggle is ON and an exterior
  // job exists on this date, block the booking unless the admin opted to
  // override (allowOverlap). Mirrors the detailing-side conflict prompt
  // so the same UI nudge can override it on purpose if needed.
  if (!payload.allowOverlap) {
    try {
      const { getExteriorBlockedDatesIfLinked } = await import("@/app/actions/linkedCalendar");
      const exterior = await getExteriorBlockedDatesIfLinked({ rangeStart: payload.bookingDate, rangeDays: 1 });
      if (exterior.linked && exterior.dates.includes(payload.bookingDate)) {
        return { success: false, error: "Exterior already has a job booked this day. Toggle Linked Calendars off in Settings or override the conflict to book anyway." };
      }
    } catch { /* silent — never block a confirmed admin action on a lookup failure */ }
  }

  const { data: existingOnDate } = await supabase
    .from("bookings")
    .select("booking_time, service_name, vehicle_size, status, duration_override")
    .eq("booking_date", payload.bookingDate)
    .neq("status", "cancelled");

  const bookedTime24 = _to24h(payload.bookingTime);
  const requestedSlot = _toMins(bookedTime24);
  // Use duration override (if admin set it) for the conflict check too
  const newDur = (payload.durationOverrideMins && payload.durationOverrideMins > 0)
    ? payload.durationOverrideMins
    : _getDur(payload.serviceName, payload.vehicleSize);
  const slotsWithDur = (existingOnDate ?? []).map((b: any) => ({
    ...b,
    total_duration_mins: b.duration_override ?? undefined,
  }));

  if (_checkConflict(slotsWithDur, requestedSlot, newDur) && !payload.allowOverlap) {
    return { success: false, error: "That time is already booked. Please pick a different time slot." };
  }

  // 5. Insert Booking
  const notesBody = [
    `💳 Payment: Pay at Arrival (Admin Quick Book) (admin-created)`,
    payload.address ? `📍 Service Location: ${payload.address}` : null,
    payload.notes,
  ].filter(Boolean).join("\n\n");

  // Create additional vehicle rows for multi-vehicle bookings
  const addlVehicles: any[] = payload.additionalVehicles ?? [];
  const addlVehicleDbIds: string[] = [];
  {
    const { findOrCreateVehicle } = await import("@/lib/findOrCreateVehicle");
    for (const av of addlVehicles) {
      const avYear = parseInt(String(av.vehicleYear), 10);
      const avDbSize = VEHICLE_SIZE_MAP[av.vehicleSize as keyof typeof VEHICLE_SIZE_MAP] || "medium";
      const id = await findOrCreateVehicle(supabase, {
        userId: targetUserId,
        make:   av.vehicleMake || "Unknown",
        model:  av.vehicleModel || "Unknown",
        year:   isNaN(avYear) ? null : avYear,
        size:   avDbSize as any,
      });
      if (id) addlVehicleDbIds.push(id);
    }
  }
  const additionalVehiclesForDb = addlVehicles.length > 0
    ? addlVehicles.map((av, i) => ({
        vehicleSize: av.vehicleSize,
        vehicleYear: av.vehicleYear,
        vehicleMake: av.vehicleMake,
        vehicleModel: av.vehicleModel,
        serviceId: av.serviceId,
        serviceName: av.serviceName,
        servicePrice: av.servicePrice,
        vehicleDbId: addlVehicleDbIds[i] ?? null,
        // Per-vehicle add-ons (from admin multi-vehicle UI) — same shape as
        // the customer-facing flow so admin schedule rendering reuses it.
        selectedAddons: Array.isArray(av.selectedAddons) ? av.selectedAddons : [],
      }))
    : null;

  const { data: booking, error: bookingErr } = await supabase
    .from("bookings")
    .insert({
      user_id: targetUserId,
      vehicle_id: vehicle.id,
      service_id: payload.serviceId,
      booking_date: payload.bookingDate,
      booking_time: to24h(payload.bookingTime),
      status: "confirmed",
      total_price: payload.totalPrice,
      notes: notesBody,
      // ── Direct lead capture snapshot ──────────────────────────────────────
      customer_name:   payload.name,
      customer_email:  email ?? null,
      customer_phone:  phoneDigits,
      service_address: payload.address ?? null,
      vehicle_make:    snapshotMake,
      vehicle_model:   snapshotModel,
      vehicle_year:    snapshotYear,
      vehicle_size:    dbVehicleSize,
      service_name:    payload.serviceName,
      addons_json:     null,
      additional_vehicles_json: additionalVehiclesForDb,
      // Admin can override the booking duration (in minutes) — when set,
      // the slot reservation uses this instead of the service's default.
      ...(payload.durationOverrideMins && payload.durationOverrideMins > 0
        ? { duration_override: payload.durationOverrideMins }
        : {}),
    })
    .select("id")
    .single();

  if (bookingErr) return { success: false, error: "Booking creation failed: " + bookingErr.message };

  // 4b. Seed booking_vehicles so the admin "Vehicles & Pricing" panel renders.
  // Without this, admin-created bookings show "No vehicles on this booking
  // yet" because the BookingVehiclesPanel reads from booking_vehicles (a
  // separate first-class table introduced in the CRM overhaul). The CRM
  // migration backfilled existing bookings but every new booking needs an
  // explicit insert here. Each additional vehicle gets its own row with its
  // own line_total; the primary row absorbs whatever totalPrice is left over
  // so the per-vehicle totals still add up to the booking total.
  try {
    const addlLineTotals = addlVehicles.map((av: any) => {
      const addons = Array.isArray(av.selectedAddons) ? av.selectedAddons : [];
      const addonsSum = addons.reduce((s: number, a: any) => s + (Number(a?.price) || 0), 0);
      return Number(av.servicePrice ?? 0) + addonsSum;
    });
    const addlSum = addlLineTotals.reduce((s: number, n: number) => s + n, 0);
    const primaryLineTotal = Math.max(0, Number(payload.totalPrice ?? 0) - addlSum);

    const rowsToInsert: any[] = [
      {
        booking_id:    booking.id,
        vehicle_id:    vehicle.id,
        position:      0,
        make:          snapshotMake,
        model:         snapshotModel,
        year:          isNaN(parseInt(snapshotYear, 10)) ? null : parseInt(snapshotYear, 10),
        size:          dbVehicleSize,
        service_id:    payload.serviceId,
        service_name:  payload.serviceName,
        base_price:    primaryLineTotal,
        addons_json:   [],
        line_total:    primaryLineTotal,
        status:        "pending",
      },
      ...addlVehicles.map((av: any, i: number) => {
        const avYear = parseInt(String(av.vehicleYear), 10);
        const avDbSize = VEHICLE_SIZE_MAP[av.vehicleSize as keyof typeof VEHICLE_SIZE_MAP] || "medium";
        const addons = Array.isArray(av.selectedAddons) ? av.selectedAddons : [];
        return {
          booking_id:    booking.id,
          vehicle_id:    addlVehicleDbIds[i] ?? null,
          position:      i + 1,
          make:          av.vehicleMake || null,
          model:         av.vehicleModel || null,
          year:          isNaN(avYear) ? null : avYear,
          size:          avDbSize,
          service_id:    av.serviceId ?? null,
          service_name:  av.serviceName ?? null,
          base_price:    Number(av.servicePrice ?? 0),
          addons_json:   addons,
          line_total:    addlLineTotals[i],
          status:        "pending",
        };
      }),
    ];
    const { error: bvErr } = await supabase.from("booking_vehicles").insert(rowsToInsert);
    if (bvErr) console.error("[adminQuickBookAction] booking_vehicles seed failed:", bvErr.message);
  } catch (bvErr) {
    console.error("[adminQuickBookAction] booking_vehicles seed threw:", bvErr);
  }

  // 5. Send Confirmation Emails
  if (email) {
    await sendBookingEmail({
      customerEmail: email,
      bookingDetails: {
        customerName: payload.name,
        customerPhone: payload.phone,
        customerEmail: email,
        serviceAddress: payload.address,
        serviceName: payload.serviceName,
        vehicleYear: snapshotYear,
        vehicleMake: snapshotMake,
        vehicleModel: snapshotModel,
        bookingDate: payload.bookingDate,
        bookingTime: payload.bookingTime,
        // Travel fee — parsed out of the admin notes if present so the
        // confirmation email shows the same line item as the admin sidebar.
        travelFee: (() => {
          const m = String(payload.notes || "").match(/🚗 Travel Fee:\s*\$(\d+(?:\.\d+)?)/);
          return m ? Number(m[1]) : 0;
        })(),
        totalPrice: payload.totalPrice,
        additionalVehicles: addlVehicles.length > 0 ? addlVehicles.map(av => ({
          vehicleYear: av.vehicleYear,
          vehicleMake: av.vehicleMake,
          vehicleModel: av.vehicleModel,
          serviceName: av.serviceName,
          servicePrice: av.servicePrice,
        })) : undefined,
      },
      totalPrice: payload.totalPrice,
    }).catch(e => console.error("Customer Email Fail:", e));
  }

  // Admin Alert
  await sendBookingEmails({
    bookingId: booking.id,
    customerName: payload.name,
    customerEmail: email,
    customerPhone: phoneDigits,
    serviceName: payload.serviceName,
    servicePrice: payload.totalPrice,
    bookingDate: payload.bookingDate,
    bookingTime: payload.bookingTime,
    vehicleYear: snapshotYear,
    vehicleMake: snapshotMake,
    vehicleModel: snapshotModel,
    vehicleSize: payload.vehicleSize,
    serviceAddress: payload.address,
    notes: payload.notes,
  }, { skipCustomerEmail: true }).catch(e => console.error("Admin Email Fail:", e));

  // ── Loyalty: increment for qualifying services ──
  if (targetUserId) {
    const { CAR_DETAIL_SERVICES, getDiscountPct } = await import("@/lib/loyalty");
    if (CAR_DETAIL_SERVICES.has(payload.serviceName)) {
      const { data: pr } = await supabase.from("profiles").select("completed_detail_count, loyalty_discount_pct").eq("id", targetUserId).single();
      const newCount = ((pr as any)?.completed_detail_count ?? 0) + 1;
      await supabase.from("profiles").update({
        completed_detail_count: newCount,
        loyalty_discount_pct:   getDiscountPct(newCount),
      }).eq("id", targetUserId);
    }
  }

  return { success: true, bookingId: booking.id };
}

export async function getAllServices() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("services")
    .select("*")
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) throw new Error(error.message);
  return data || [];
}

export async function getAllBookings() {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("bookings")
    .select(`
      *,
      profiles:user_id(id, first_name, last_name, phone, completed_detail_count, loyalty_discount_pct),
      vehicles:vehicle_id(id, make, model, year, size),
      services:service_id(name, description, price_small, price_medium, price_large, price_extra_large),
      coupons:coupon_id(id, code, discount_amount, discount_percentage)
    `)
    .order("booking_date", { ascending: false })
    .order("booking_time", { ascending: false });

  if (error) {
    console.error("[adminActions] Fetch Error:", error);
    throw new Error(error.message);
  }

  return (data || []).map((b: any) => {
    try {
      const res = AdminBookingSchema.safeParse(b);
      return res.success ? res.data : b;
    } catch (e) {
      return b;
    }
  });
}

function computeStage(bookingCount: number, lastService: string | null, ltv: number): "lead" | "active" | "lapsed" | "churned" | "vip" {
  if (bookingCount === 0) return "lead";
  if (ltv >= 500) return "vip";
  if (!lastService) return "lead";
  const daysSince = (Date.now() - new Date(lastService + "T12:00:00").getTime()) / 86400000;
  if (daysSince <= 90) return "active";
  if (daysSince <= 180) return "lapsed";
  return "churned";
}

export async function getAllClients() {
  const supabase = createAdminClient();
  const adminEmail = (process.env.ADMIN_EMAIL || "zackariahlacey@gmail.com").toLowerCase();

  // 1. All profiles with vehicles + bookings (including snapshot columns)
  // Disambiguate the bookings embed via the user_id FK — bookings also has
  // assigned_by / assigned_to / photo_reviewed_by FKs back to profiles.
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select(`
      *,
      vehicles(*),
      bookings:bookings!bookings_user_id_fkey(
        id, total_price, booking_date, booking_time, status, notes,
        customer_name, customer_email, customer_phone, service_address, service_name,
        vehicle_make, vehicle_model, vehicle_year, vehicle_size,
        addons_json, stripe_checkout_session_id,
        services:service_id(name)
      )
    `)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  // 2. Get all auth users to determine who has actually signed up
  const { data: authData } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  const signedUpIds = new Set((authData?.users ?? []).map(u => u.id));

  // 3. Also fetch any bookings with customer info that have NO profile (orphan bookings)
  // These are rare but can happen if a booking's user_id UUID was never persisted to profiles
  const { data: orphanBookings } = await supabase
    .from("bookings")
    .select("id, user_id, customer_name, customer_email, customer_phone, service_address, service_name, total_price, booking_date, booking_time, status, notes, vehicle_make, vehicle_model, vehicle_year, vehicle_size, addons_json, stripe_checkout_session_id")
    .neq("status", "cancelled")
    .not("customer_name", "is", null);

  const profileIds = new Set((profiles || []).map((p: any) => p.id));

  // Orphan = has customer_name but user_id not in profiles (or user_id is null)
  const orphans = (orphanBookings ?? []).filter((b: any) =>
    b.customer_name && b.customer_name !== "Admin Block" && (!b.user_id || !profileIds.has(b.user_id))
  );

  // Group orphans by phone or email into pseudo-clients
  const orphanMap = new Map<string, any>();
  for (const b of orphans) {
    const key = b.customer_phone || b.customer_email || b.id;
    if (!orphanMap.has(key)) {
      const nameParts = (b.customer_name ?? "").trim().split(/\s+/);
      orphanMap.set(key, {
        id: "orphan-" + key,
        first_name: nameParts[0] ?? "",
        last_name: nameParts.slice(1).join(" ") || "",
        phone: b.customer_phone,
        email: b.customer_email,
        completed_detail_count: 0,
        loyalty_discount_pct: 0,
        vehicles: [],
        bookings: [],
        _is_orphan: true,
      });
    }
    orphanMap.get(key).bookings.push(b);
  }

  const adminFilter = adminEmail;

  // 4. Process profiles
  const processedProfiles = (profiles || [])
    .filter((client: any) => {
      if (client.email?.toLowerCase() === adminFilter) return false;
      const hasName = client.first_name || client.last_name;
      const hasBookings = client.bookings && client.bookings.length > 0;
      // Also accept if they have a phone (admin-quick-booked guest with no name)
      return hasName || hasBookings || client.phone;
    })
    .map((client: any) => {
      const sortedBookings = [...(client.bookings || [])].sort((a: any, b: any) => {
        const dc = b.booking_date.localeCompare(a.booking_date);
        return dc !== 0 ? dc : (b.booking_time || "").localeCompare(a.booking_time || "");
      });

      // Best display name: prefer profile name; fall back to customer_name snapshot
      const profileName = [client.first_name, client.last_name].filter(Boolean).join(" ").trim();
      const snapshotName = sortedBookings.find((b: any) => b.customer_name)?.customer_name ?? "";
      const displayName = profileName || snapshotName || "Unknown";
      const [displayFirst, ...rest] = displayName.split(/\s+/);
      const displayLast = rest.join(" ");

      // Best phone/email
      const displayPhone = client.phone
        || sortedBookings.find((b: any) => b.customer_phone)?.customer_phone
        || null;
      const displayEmail = client.email
        || sortedBookings.find((b: any) => b.customer_email)?.customer_email
        || null;

      const ltv = sortedBookings
        .filter((b: any) => b.status !== "cancelled")
        .reduce((sum: number, b: any) => sum + (Number(b.total_price) || 0), 0);

      // Last service address
      let lastAddress = "No address recorded";
      const latestWithAddr = sortedBookings.find((b: any) => b.service_address);
      if (latestWithAddr) {
        lastAddress = latestWithAddr.service_address;
      } else {
        const latestWithNotes = sortedBookings.find((b: any) => b.notes?.includes("📍 Service Location:"));
        if (latestWithNotes) {
          lastAddress = latestWithNotes.notes.split("📍 Service Location:")[1]?.trim() || "See Notes";
        }
      }

      const isSignedUp = signedUpIds.has(client.id);

      const bookingCount = sortedBookings.filter((b: any) => b.status !== "cancelled").length;
      const lastService = sortedBookings[0]?.booking_date || null;
      const lifecycle = computeStage(bookingCount, lastService, ltv);

      return {
        ...client,
        first_name: displayFirst || client.first_name || "",
        last_name: displayLast || client.last_name || "",
        phone: displayPhone,
        email: displayEmail,
        _display_name: displayName,
        _ltv: ltv,
        _lastAddress: lastAddress,
        _lastService: lastService,
        _bookingCount: bookingCount,
        _is_signed_up: isSignedUp,
        _is_orphan: false,
        _lifecycle: client.lifecycle_stage && client.lifecycle_stage !== "lead" ? client.lifecycle_stage : lifecycle,
        tags: Array.isArray(client.tags) ? client.tags : [],
        do_not_contact: !!client.do_not_contact,
        bookings: sortedBookings.map((b: any) => ({
          ...b,
          display_date: b.booking_date,
          _service_name: b.service_name || b.services?.name || "Detail",
        })),
      };
    });

  // 5. Process orphan pseudo-clients
  const processedOrphans = Array.from(orphanMap.values()).map((client: any) => {
    const sortedBookings = [...client.bookings].sort((a: any, b: any) => {
      const dc = b.booking_date.localeCompare(a.booking_date);
      return dc !== 0 ? dc : (b.booking_time || "").localeCompare(a.booking_time || "");
    });
    const ltv = sortedBookings
      .filter((b: any) => b.status !== "cancelled")
      .reduce((sum: number, b: any) => sum + (Number(b.total_price) || 0), 0);
    const displayName = [client.first_name, client.last_name].filter(Boolean).join(" ").trim() || "Unknown";
    return {
      ...client,
      _display_name: displayName,
      _ltv: ltv,
      _lastAddress: sortedBookings.find((b: any) => b.service_address)?.service_address || "No address recorded",
      _lastService: sortedBookings[0]?.booking_date || null,
      _bookingCount: sortedBookings.filter((b: any) => b.status !== "cancelled").length,
      _is_signed_up: false,
      _lifecycle: computeStage(
        sortedBookings.filter((b: any) => b.status !== "cancelled").length,
        sortedBookings[0]?.booking_date || null,
        ltv,
      ),
      tags: [],
      do_not_contact: false,
      bookings: sortedBookings.map((b: any) => ({
        ...b,
        display_date: b.booking_date,
        _service_name: b.service_name || "Detail",
      })),
    };
  });

  return [...processedProfiles, ...processedOrphans];
}

async function getUserEmail(userId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase.auth.admin.getUserById(userId);
  if (error || !data.user) return null;
  return data.user.email;
}

/** Resolves the best available contact info from a booking row.
 *  Priority: auth account email > customer_email snapshot > profile email */
async function getBookingContact(booking: any): Promise<{ name: string; email: string | null }> {
  // Name: prefer profile, fall back to snapshot
  const profileName = [booking.profiles?.first_name, booking.profiles?.last_name].filter(Boolean).join(" ").trim();
  const name = profileName || booking.customer_name || "Customer";
  // Email: prefer auth account email, fall back to customer_email snapshot
  let email: string | null = booking.customer_email ?? null;
  if (booking.user_id) {
    const authEmail = await getUserEmail(booking.user_id);
    if (authEmail) email = authEmail;
  }
  return { name, email };
}

export async function rescheduleBookingAction(id: string, date: string, time: string) {
  const supabase = createAdminClient();
  const { data: booking } = await supabase.from("bookings").select("*, customer_name, customer_email, profiles:user_id(id, first_name, last_name), services:service_id(name)").eq("id", id).single();
  const { error } = await supabase.from("bookings").update({ booking_date: date, booking_time: time }).eq("id", id);
  if (error) throw new Error(error.message);
  if (booking) {
    const { name, email } = await getBookingContact(booking);
    if (email) {
      await sendUpdatedBookingEmail({
        customerName: name,
        customerEmail: email,
        serviceName: booking.service_name || booking.services?.name || "Detailing Service",
        newDate: date,
        newTime: time,
      }).catch(e => console.error("Reschedule email fail:", e));
    }
  }
  return { success: true };
}

export async function sendOnMyWayEmail(bookingId: string) {
  const supabase = createAdminClient();
  const { data: booking } = await supabase
    .from("bookings")
    .select("*, customer_name, customer_email, service_name, booking_time, service_address, profiles:user_id(id, first_name, last_name)")
    .eq("id", bookingId)
    .single();
  if (!booking) return { success: false, error: "Booking not found" };
  const { name, email } = await getBookingContact(booking);
  if (email) {
    await sendOnMyWayEmailNotification({
      customerName: name,
      customerEmail: email,
      serviceName: (booking.service_name as string | null) ?? undefined,
      bookingTime: (booking.booking_time as string | null) ?? undefined,
      serviceAddress: (booking.service_address as string | null) ?? undefined,
    });
    return { success: true };
  }
  return { success: false, error: "No email found" };
}

export async function handleNoShowAction(bookingId: string) {
  const supabase = createAdminClient();
  const { data: booking } = await supabase.from("bookings").select("*, customer_name, customer_email, service_name, profiles:user_id(id, first_name, last_name), services:service_id(name)").eq("id", bookingId).single();
  await supabase.from("bookings").update({ status: "no-show" }).eq("id", bookingId);
  if (booking) {
    const { name, email } = await getBookingContact(booking);
    if (email) {
      await sendBookingCancellationEmails({
        customerName: name,
        customerEmail: email,
        bookingDate: booking.booking_date,
        bookingTime: booking.booking_time,
        serviceName: booking.service_name || booking.services?.name || "Detailing Service",
      }).catch(e => console.error("No-show email fail:", e));
    }
  }
  return { success: true };
}

export async function updateBookingDetailsAction(id: string, updates: {
  total_price?: number;
  notes?: string;
  service_address?: string;
  customer_phone?: string | null;
  customer_email?: string | null;
}, notifyPriceChange?: { oldPrice: number }) {
  const supabase = createAdminClient();
  // Fetch booking before update if we need to send email
  let booking: any = null;
  if (notifyPriceChange && updates.total_price !== undefined) {
    const { data } = await supabase.from("bookings").select("*, customer_name, customer_email, service_name, booking_date, booking_time, profiles:user_id(id, first_name, last_name), services:service_id(name)").eq("id", id).single();
    booking = data;
  }
  const { error } = await supabase.from("bookings").update(updates).eq("id", id);
  if (error) throw new Error(error.message);
  // Send price-change email if price was updated
  if (notifyPriceChange && updates.total_price !== undefined && booking) {
    const { name, email } = await getBookingContact(booking);
    if (email) {
      await sendPriceUpdatedEmail({
        customerName: name,
        customerEmail: email,
        serviceName: booking.service_name || booking.services?.name || "Detailing Service",
        bookingDate: booking.booking_date,
        bookingTime: booking.booking_time,
        oldPrice: notifyPriceChange.oldPrice,
        newPrice: updates.total_price,
      }).catch(e => console.error("Price update email fail:", e));
    }
  }
  return { success: true };
}

export async function updateBookingStatusAction(id: string, status: string) {
  const supabase = createAdminClient();
  const { data: booking } = await supabase
    .from("bookings")
    .select("*, customer_name, customer_email, service_name, profiles:user_id(id, first_name, last_name, completed_detail_count, loyalty_discount_pct), services:service_id(name)")
    .eq("id", id)
    .single();

  const { error } = await supabase.from("bookings").update({ status }).eq("id", id);
  if (error) throw new Error(error.message);

  if (!booking) return { success: true };
  const { name, email } = await getBookingContact(booking);
  const serviceName = booking.service_name || booking.services?.name || "Detailing Service";

  if (status === "completed") {
    // Loyalty count is now tracked at booking-creation time (not completion).
    // Just send the completion email with the profile's current loyalty data.
    const profileRow = Array.isArray(booking.profiles) ? booking.profiles[0] : booking.profiles;
    const loyaltyEmailData = {
      completedDetailCount: (profileRow as any)?.completed_detail_count ?? 0,
      loyaltyDiscountPct:   (profileRow as any)?.loyalty_discount_pct   ?? 0,
    };
    if (email) {
      await sendJobCompletedEmail({
        customerName: name,
        customerEmail: email,
        serviceName,
        amountPaid: Number(booking.total_price),
        ...loyaltyEmailData,
      }).catch(e => console.error("Completion email fail:", e));
    }
  } else if (status === "cancelled") {
    // ── Loyalty: decrement if this was a qualifying service ──────────────────
    const { CAR_DETAIL_SERVICES, getDiscountPct } = await import("@/lib/loyalty");
    if (CAR_DETAIL_SERVICES.has(serviceName) && booking.user_id) {
      const profileRow = Array.isArray(booking.profiles) ? booking.profiles[0] : booking.profiles;
      const currentCount = (profileRow as any)?.completed_detail_count ?? 0;
      const newCount = Math.max(0, currentCount - 1);
      await supabase.from("profiles").update({
        completed_detail_count: newCount,
        loyalty_discount_pct:   getDiscountPct(newCount),
      }).eq("id", booking.user_id);
    }
    if (email) {
      await sendBookingCancellationEmails({
        customerName: name,
        customerEmail: email,
        bookingDate: booking.booking_date,
        bookingTime: booking.booking_time,
        serviceName,
      }).catch(e => console.error("Cancel email fail:", e));
    }
  }

  return { success: true };
}

export async function deleteBookingAction(id: string) {
  const supabase = createAdminClient();
  const { data: booking } = await supabase.from("bookings").select("*, customer_name, customer_email, service_name, profiles:user_id(id, first_name, last_name), services:service_id(name)").eq("id", id).single();
  const { error } = await supabase.from("bookings").delete().eq("id", id);
  if (error) throw new Error(error.message);
  if (booking && booking.status !== "cancelled") {
    const { name, email } = await getBookingContact(booking);
    if (email) {
      await sendBookingCancellationEmails({
        customerName: name,
        customerEmail: email,
        bookingDate: booking.booking_date,
        bookingTime: booking.booking_time,
        serviceName: booking.service_name || booking.services?.name || "Detailing Service",
      }).catch(e => console.error("Delete email fail:", e));
    }
  }
  return { success: true };
}

export async function getOperatingHours() {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("operating_hours").select("*").order("day_of_week", { ascending: true });
  if (error) throw error;
  return data;
}

export async function updateOperatingHoursAction(hours: any[]) {
  const supabase = createAdminClient();
  for (const h of hours) {
    const { error } = await supabase.from("operating_hours").upsert(h);
    if (error) throw error;
  }
  return { success: true };
}

export async function getBlockedDates() {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("blocked_dates").select("*").order("blocked_date", { ascending: true });
  if (error) throw error;
  return data;
}

export async function getFinancialStats() {
  const supabase = createAdminClient();
  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const lastOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

  // 1. Fetch all bookings for the current month
  const { data: monthBookings, error: bookingsErr } = await supabase
    .from("bookings")
    .select("total_price, status, booking_date")
    .gte("booking_date", firstOfMonth)
    .lte("booking_date", lastOfMonth);

  if (bookingsErr) throw new Error(bookingsErr.message);

  const mtdRevenue = monthBookings
    ?.filter(b => b.status === 'completed' || b.status === 'confirmed') // Treating confirmed as revenue for HUD simplicity, or just completed
    .reduce((sum, b) => sum + (Number(b.total_price) || 0), 0) || 0;

  const completedBookings = monthBookings?.filter(b => b.status === 'completed') || [];
  const avgDetail = completedBookings.length > 0 
    ? completedBookings.reduce((sum, b) => sum + (Number(b.total_price) || 0), 0) / completedBookings.length 
    : 0;

  // 2. Fetch Coupon Usage
  const { data: coupons, error: couponsErr } = await supabase
    .from("coupons")
    .select(`
      *,
      bookings:bookings(id, total_price)
    `);

  if (couponsErr) throw new Error(couponsErr.message);

  const couponStats = (coupons || []).map(c => ({
    ...c,
    usageCount: c.bookings?.length || 0,
    revenueGenerated: c.bookings?.reduce((sum: number, b: any) => sum + (Number(b.total_price) || 0), 0) || 0
  }));

  return {
    mtdRevenue,
    avgDetail,
    couponStats,
    bookingCount: monthBookings?.length || 0
  };
}

export async function deleteCouponAction(id: string) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("coupons").delete().eq("id", id);
  if (error) throw new Error(error.message);
  return { success: true };
}

export async function toggleBlockedDateAction(date: string, isBlocked: boolean, reason?: string) {
  const supabase = createAdminClient();
  if (isBlocked) {
    const { error } = await supabase.from("blocked_dates").insert([{ blocked_date: date, reason }]);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("blocked_dates").delete().eq("blocked_date", date);
    if (error) throw error;
  }
  return { success: true };
}

/** Block every date in [startDate, endDate] inclusive (YYYY-MM-DD strings).
 *  Pre-deletes any existing blocks in the range so the reason stays consistent
 *  across the span. Returns the count actually inserted. */
export async function bulkBlockDateRangeAction(
  startDate: string,
  endDate: string,
  reason?: string,
): Promise<{ success: boolean; inserted: number; error?: string }> {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return { success: false, inserted: 0, error: "Invalid date." };
  }
  if (end < start) {
    return { success: false, inserted: 0, error: "End date is before start date." };
  }
  // Safety cap so a typo can't lock the calendar for a year.
  const MAX_RANGE_DAYS = 90;
  const days: string[] = [];
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    days.push(d.toISOString().slice(0, 10));
    if (days.length > MAX_RANGE_DAYS) {
      return { success: false, inserted: 0, error: `Range too large (max ${MAX_RANGE_DAYS} days).` };
    }
  }
  const supabase = createAdminClient();
  // Clear any existing blocks in the span so the new reason is authoritative.
  await supabase.from("blocked_dates").delete().in("blocked_date", days);
  const rows = days.map(d => ({ blocked_date: d, reason: reason?.trim() || null }));
  const { error } = await supabase.from("blocked_dates").insert(rows);
  if (error) return { success: false, inserted: 0, error: error.message };
  return { success: true, inserted: rows.length };
}

/** Aggregate email_events for the past N days. Returns total counts per
 *  event type (sent, delivered, opened, clicked, bounced, complained). */
export async function getEmailEventStats(daysBack: number = 7): Promise<{
  total: number;
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  complained: number;
  delayed: number;
  windowDays: number;
  lastEventAt: string | null;
}> {
  const supabase = createAdminClient();
  const since = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString();
  const { data } = await supabase
    .from("email_events")
    .select("event_type, occurred_at")
    .gte("occurred_at", since)
    .order("occurred_at", { ascending: false });

  const rows = (data ?? []) as Array<{ event_type: string; occurred_at: string }>;
  const counts: Record<string, number> = {};
  for (const r of rows) counts[r.event_type] = (counts[r.event_type] ?? 0) + 1;

  return {
    total: rows.length,
    sent:       counts["email.sent"]            ?? 0,
    delivered:  counts["email.delivered"]       ?? 0,
    opened:     counts["email.opened"]          ?? 0,
    clicked:    counts["email.clicked"]         ?? 0,
    bounced:    counts["email.bounced"]         ?? 0,
    complained: counts["email.complained"]      ?? 0,
    delayed:    counts["email.delivery_delayed"]?? 0,
    windowDays: daysBack,
    lastEventAt: rows[0]?.occurred_at ?? null,
  };
}

export async function triggerTestEmail(type: string, targetEmail: string) {
  const adminEmail = process.env.ADMIN_EMAIL || "zackariahlacey@gmail.com";
  const email = targetEmail || adminEmail;
  
  const sampleData = {
    customerName: "Test Customer",
    customerEmail: email,
    customerPhone: "802-555-0123",
    serviceName: "Full Interior Detail",
    servicePrice: 250,
    bookingDate: new Date().toISOString().split('T')[0],
    bookingTime: "10:00 AM",
    vehicleYear: "2024",
    vehicleMake: "Tesla",
    vehicleModel: "Model Y",
    vehicleSize: "suv",
    serviceAddress: "123 Maple St, Burlington, VT",
    bookingId: "test-uuid-12345",
  };

  try {
    switch (type) {
      case 'confirmation':
        // Route BOTH the customer copy and the owner-alert copy to the test
        // address so the previewer sees both in one inbox.
        await sendBookingEmails(sampleData, { ownerEmailOverride: email });
        break;
      case 'on-my-way':
        await sendOnMyWayEmailNotification({ customerName: sampleData.customerName, customerEmail: email });
        break;
      case 'completed':
        await sendJobCompletedEmail({
          customerName: sampleData.customerName,
          customerEmail: email,
          serviceName: sampleData.serviceName,
          amountPaid: sampleData.servicePrice,
        });
        break;
      case 'review':
        await sendReviewFollowupEmail({ customerName: sampleData.customerName, customerEmail: email });
        break;
      case 'reschedule':
        await sendUpdatedBookingEmail({
          customerName: sampleData.customerName,
          customerEmail: email,
          serviceName: sampleData.serviceName,
          newDate: sampleData.bookingDate,
          newTime: "02:00 PM"
        });
        break;
      case 'cancel':
        await sendBookingCancellationEmails({
          customerName: sampleData.customerName,
          customerEmail: email,
          bookingDate: sampleData.bookingDate,
          bookingTime: sampleData.bookingTime,
          serviceName: sampleData.serviceName
        });
        break;
      default:
        throw new Error("Unknown email type");
    }
    return { success: true };
  } catch (err: any) {
    console.error("Test Email Fail:", err);
    return { success: false, error: err.message };
  }
}

export async function getDiagnostics() {
  return {
    env: {
      supabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      supabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      resendKey: !!process.env.RESEND_API_KEY,
      stripeKey: !!process.env.STRIPE_SECRET_KEY,
      stripeWebhook: !!process.env.STRIPE_WEBHOOK_SECRET,
      adminEmail: process.env.ADMIN_EMAIL || "zackariahlacey@gmail.com",
    },
    timestamp: new Date().toISOString(),
  };
}

export async function getClientEmail(clientId: string): Promise<string | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.auth.admin.getUserById(clientId);
  if (error || !data.user) return null;
  return data.user.email || null;
}

export async function sendCustomEmailAction(
  to: string,
  subject: string,
  bodyText: string
): Promise<{ success: boolean; error?: string }> {
  const { createResend } = await import("@/lib/mailer");
  const resend = createResend();
  const fromAddr = process.env.EMAIL_FROM ?? "Arise And Shine Detailing <bookings@ariseandshinedetailing.com>";

  // Wrap plain text in a simple branded HTML template
  const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#09090b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;background-color:#18181b;border-radius:12px;overflow:hidden;">
          <tr>
            <td style="padding:24px 32px;text-align:center;border-bottom:1px solid #27272a;">
              <p style="color:#d4af37;font-size:15px;font-weight:900;margin:0;letter-spacing:0.05em;text-transform:uppercase;">Arise And Shine Detailing</p>
              <p style="color:#71717a;font-size:10px;margin:4px 0 0;letter-spacing:0.15em;text-transform:uppercase;">Premium Mobile Auto Detailing</p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 32px;">
              <div style="font-size:15px;color:#e4e4e7;line-height:1.7;white-space:pre-line;">${bodyText.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px;text-align:center;border-top:1px solid #27272a;">
              <p style="font-size:11px;color:#52525b;margin:0;">&copy; 2026 Arise And Shine Detailing. All rights reserved.</p>
              <p style="font-size:11px;color:#52525b;margin:4px 0 0;">
                <a href="mailto:contact@ariseandshinedetailing.com" style="color:#d4af37;text-decoration:none;">contact@ariseandshinedetailing.com</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  try {
    await resend.emails.send({
      from: fromAddr,
      to,
      replyTo: "contact@ariseandshinedetailing.com",
      subject,
      html,
    });
    return { success: true };
  } catch (err: any) {
    console.error("Custom email send error:", err);
    return { success: false, error: err.message };
  }
}

export async function sendTestEmailAction(to: string) {
  return sendCustomEmailAction(
    to, 
    "System Test - Arise & Shine", 
    "If you are reading this, your email configuration is working perfectly!"
  );
}

export async function updateCustomerProfile(id: string, payload: any) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("profiles").update(payload).eq("id", id);
  if (error) throw new Error(error.message);
  return { success: true };
}

/** @deprecated Points system removed — loyalty is now tier-based */
export async function awardPointsAction(
  _profileId: string,
  _points: number,
  _reason: string
): Promise<{ success: boolean; newBalance?: number; error?: string }> {
  return { success: false, error: "Points system has been replaced with loyalty tiers." };
}

// ── COUPONS ──
export async function getCouponStats() {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("coupons").select("*").order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  
  // Calculate usage stats from bookings
  const { data: bookings } = await supabase.from("bookings").select("coupon_id, total_price").not("coupon_id", "is", null);
  
  return data.map((c: any) => {
    const usage = bookings?.filter((b: any) => b.coupon_id === c.id) || [];
    return {
      ...c,
      usage_count: usage.length,
      revenue_generated: usage.reduce((acc, b) => acc + Number(b.total_price || 0), 0)
    };
  });
}

export async function createCouponAction(payload: any) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("coupons").insert(payload);
  if (error) throw new Error(error.message);
  return { success: true };
}

export async function toggleCouponAction(id: string, is_active: boolean) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("coupons").update({ is_active }).eq("id", id);
  if (error) throw new Error(error.message);
  return { success: true };
}

// ── Personal time blocks (stored as special bookings) ──────────────────────

export async function blockPersonalTimeAction(payload: {
  date: string;
  startTime: string; // "HH:MM:00"
  durationMins: number;
  label: string;
}): Promise<{ success: boolean; id?: string; error?: string }> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("bookings")
    .insert({
      user_id: null,
      vehicle_id: null,
      service_id: null,
      booking_date: payload.date,
      booking_time: payload.startTime,
      status: "blocked",
      total_price: 0,
      notes: payload.label || "Personal Block",
      customer_name: "Admin Block",
      service_name: "Personal Block",
      vehicle_size: String(payload.durationMins),
    })
    .select("id")
    .single();
  if (error) return { success: false, error: error.message };
  return { success: true, id: data.id };
}

export async function deletePersonalBlockAction(id: string) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("bookings").delete().eq("id", id);
  if (error) throw new Error(error.message);
  return { success: true };
}

// ── Money / revenue breakdown ───────────────────────────────────────────────

/** YYYY-MM-DD in America/New_York (business is Vermont). */
function todayYmdEastern(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function isRealMoneyJob(b: { service_name?: string | null; notes?: string | null }): boolean {
  const sn = (b.service_name ?? "").toLowerCase();
  if (sn.includes("personal block")) return false;
  if ((b.notes ?? "").toLowerCase().includes("personal time")) return false;
  return true;
}

function isCancelledBooking(b: { status?: string | null }): boolean {
  return (b.status ?? "").toLowerCase() === "cancelled";
}

/**
 * Money tab: paid = scheduled date is before today and not cancelled (ignore completed/pending flags).
 * Upcoming = today or later on the calendar and not cancelled.
 */
function isPaidBySchedule(
  b: { booking_date?: string | null; status?: string | null; service_name?: string | null; notes?: string | null },
  todayStr: string
): boolean {
  if (!isRealMoneyJob(b)) return false;
  if (isCancelledBooking(b)) return false;
  const d = String(b.booking_date ?? "");
  if (!d) return false;
  return d < todayStr;
}

function isUpcomingBySchedule(
  b: { booking_date?: string | null; status?: string | null; service_name?: string | null; notes?: string | null },
  todayStr: string
): boolean {
  if (!isRealMoneyJob(b)) return false;
  if (isCancelledBooking(b)) return false;
  const d = String(b.booking_date ?? "");
  if (!d) return false;
  return d >= todayStr;
}

function isStripePayment(b: any): boolean {
  if (b.payment_method === "pay_now") return true;
  if (b.payment_method === "pay_on_arrival") return false;
  const n = (b.notes ?? "").toLowerCase();
  return n.includes("stripe") || n.includes("pay now") || n.includes("card");
}

function sumPaid(rows: any[], filter: (b: any) => boolean, todayStr: string) {
  const paid = rows.filter((b) => isPaidBySchedule(b, todayStr) && filter(b));
  const stripe = paid.filter(isStripePayment).reduce((s, b) => s + Number(b.total_price || 0), 0);
  const cash = paid.filter((b) => !isStripePayment(b)).reduce((s, b) => s + Number(b.total_price || 0), 0);
  return { paid, stripe, cash, total: stripe + cash, count: paid.length };
}

export async function getRevenueBreakdown(monthOffset = 0) {
  const supabase = createAdminClient();
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + monthOffset;
  const first = new Date(y, m, 1).toISOString().split("T")[0];
  const last = new Date(y, m + 1, 0).toISOString().split("T")[0];
  const todayStr = todayYmdEastern();
  const calendarYear = now.getFullYear();
  const viewYear = new Date(y, m, 1).getFullYear();

  const { data, error } = await supabase
    .from("bookings")
    .select(
      "id, total_price, status, notes, service_name, booking_date, booking_time, customer_name, customer_email"
    )
    .gte("booking_date", "2020-01-01")
    .lte("booking_date", `${calendarYear + 5}-12-31`);

  if (error) throw new Error(error.message);

  const rows = data ?? [];

  // ── Selected month (paid by calendar: date before today, not cancelled) ──
  const inMonth = (b: any) => b.booking_date >= first && b.booking_date <= last;
  const monthStats = sumPaid(rows, inMonth, todayStr);
  const avgTicket = monthStats.count > 0 ? monthStats.total / monthStats.count : 0;

  const monthUpcomingRows = rows.filter(
    (b: any) => isRealMoneyJob(b) && !isCancelledBooking(b) && inMonth(b) && isUpcomingBySchedule(b, todayStr)
  );
  const monthUpcomingTotal = monthUpcomingRows.reduce((s, b) => s + Number(b.total_price || 0), 0);
  const cancelledInMonthCount = rows.filter(
    (b: any) => isRealMoneyJob(b) && isCancelledBooking(b) && inMonth(b)
  ).length;

  const byService: Record<string, { name: string; revenue: number; count: number }> = {};
  for (const b of monthStats.paid) {
    const svc = b.service_name || "Unknown";
    if (!byService[svc]) byService[svc] = { name: svc, revenue: 0, count: 0 };
    byService[svc].revenue += Number(b.total_price || 0);
    byService[svc].count += 1;
  }

  // ── Year-to-date (calendar year, paid-by-schedule only) ─────────────────
  const ytdFilter = (b: any) =>
    b.booking_date >= `${calendarYear}-01-01` && b.booking_date <= `${calendarYear}-12-31`;
  const ytdStats = sumPaid(rows, ytdFilter, todayStr);
  const ytdAvg = ytdStats.count > 0 ? ytdStats.total / ytdStats.count : 0;

  // ── Full calendar year of the month you're viewing (paid by schedule) ───
  const yearViewFilter = (b: any) => {
    const yr = parseInt(String(b.booking_date ?? "").slice(0, 4), 10);
    return yr === viewYear;
  };
  const viewYearStats = sumPaid(rows, yearViewFilter, todayStr);
  const viewYearAvg = viewYearStats.count > 0 ? viewYearStats.total / viewYearStats.count : 0;

  // ── Upcoming: any non-cancelled job on today or a future calendar date ───
  const futureRows = rows.filter((b: any) => isUpcomingBySchedule(b, todayStr));
  const futureTotal = futureRows.reduce((s, b) => s + Number(b.total_price || 0), 0);

  // ── Outstanding: invoice not paid (admin Stripe link flow) ─────────────
  const outstandingRows = rows.filter((b: any) => isRealMoneyJob(b) && b.status === "pending_payment");
  const unpaid = outstandingRows.map((b: any) => ({
    id: b.id,
    customer_name: b.customer_name,
    customer_email: b.customer_email,
    service_name: b.service_name,
    booking_date: b.booking_date,
    booking_time: b.booking_time,
    total_price: Number(b.total_price || 0),
    is_stripe: isStripePayment(b),
  }));

  // ── Recent paid jobs (selected month, past dates) for overview list ─────
  const recentEarned = [...monthStats.paid]
    .sort((a, b) => (b.booking_date + (b.booking_time ?? "")).localeCompare(a.booking_date + (a.booking_time ?? "")))
    .slice(0, 25)
    .map((b: any) => ({
      id: b.id,
      customer_name: b.customer_name,
      service_name: b.service_name,
      booking_date: b.booking_date,
      status: b.status,
      total_price: Number(b.total_price || 0),
      is_stripe: isStripePayment(b),
    }));

  return {
    period: { first, last },
    stripeRevenue: monthStats.stripe,
    cashRevenue: monthStats.cash,
    totalRevenue: monthStats.total,
    jobCount: monthStats.count,
    avgTicket,
    byService: Object.values(byService).sort((a, b) => b.revenue - a.revenue),
    unpaid,
    // Extended dashboard fields
    monthUpcomingCount: monthUpcomingRows.length,
    monthUpcomingTotal,
    cancelledInMonthCount,
    yearToDate: {
      total: ytdStats.total,
      stripe: ytdStats.stripe,
      cash: ytdStats.cash,
      jobCount: ytdStats.count,
      avgTicket: ytdAvg,
      year: calendarYear,
    },
    /** Paid-by-schedule total for the full calendar year of the month you're viewing */
    viewYearSummary: {
      year: viewYear,
      total: viewYearStats.total,
      stripe: viewYearStats.stripe,
      cash: viewYearStats.cash,
      jobCount: viewYearStats.count,
      avgTicket: viewYearAvg,
    },
    futurePipeline: {
      total: futureTotal,
      count: futureRows.length,
      jobs: futureRows
        .sort((a: any, b: any) => {
          const da = `${a.booking_date} ${String(a.booking_time ?? "").slice(0, 8)}`;
          const db = `${b.booking_date} ${String(b.booking_time ?? "").slice(0, 8)}`;
          return da.localeCompare(db);
        })
        .slice(0, 30)
        .map((b: any) => ({
          id: b.id,
          customer_name: b.customer_name,
          service_name: b.service_name,
          booking_date: b.booking_date,
          booking_time: b.booking_time,
          total_price: Number(b.total_price || 0),
          status: b.status,
        })),
    },
    recentEarned,
    earnedLogic:
      "Paid = scheduled date before today and not cancelled. Upcoming = today or later, not cancelled. Personal blocks excluded.",
  };
}

// ── All-time stats (for money page header) ─────────────────────────────────
export async function getAllTimeStats() {
  const supabase = createAdminClient();
  const todayStr = todayYmdEastern();
  const { data } = await supabase
    .from("bookings")
    .select("total_price, status, notes, service_name, booking_date");
  const rows = (data ?? []).filter((b: any) => isPaidBySchedule(b, todayStr));
  const total = rows.reduce((s: number, b: any) => s + Number(b.total_price || 0), 0);
  return { totalRevenue: total, jobCount: rows.length };
}

// ── Settings key/value store ────────────────────────────────────────────────
export async function getSettingAction(key: string): Promise<string | null> {
  const supabase = createAdminClient();
  const { data } = await supabase.from("settings").select("value").eq("key", key).maybeSingle();
  return (data as any)?.value ?? null;
}

export async function setSettingAction(key: string, value: string): Promise<{ success: boolean }> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("settings")
    .upsert({ key, value }, { onConflict: "key" });
  if (error) throw new Error(error.message);
  return { success: true };
}

// ── Mass email ──────────────────────────────────────────────────────────────
export async function massEmailAction(
  recipients: { email: string; name: string }[],
  subject: string,
  bodyText: string
): Promise<{ success: boolean; sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;
  for (const r of recipients) {
    const personalised = bodyText.replace(/{{name}}/g, r.name.split(" ")[0] ?? "there");
    const res = await sendCustomEmailAction(r.email, subject, personalised);
    if (res.success) sent++; else failed++;
    // Small rate-limit pause
    await new Promise(res => setTimeout(res, 120));
  }
  return { success: true, sent, failed };
}

// ── Fix adminQuickBookAction availability check (uses unified logic) ────────
// (The existing adminQuickBookAction above has been superseded; new bookings
//  created from the redesigned schedule page will call the fixed version below.)
export async function adminQuickBookV2(payload: any): Promise<{ success: boolean; bookingId?: string; error?: string }> {
  const { checkSlotConflict, timeToMins, getDurationMins, to24h } = await import("@/lib/availability");
  const supabase = createAdminClient();

  // Check operating hours — prefer seasonal (month-specific) row over default
  const _d = new Date(payload.bookingDate + "T12:00:00");
  const _dow = _d.getDay();
  const _month = _d.getMonth() + 1;
  const { data: allOpHours } = await supabase
    .from("operating_hours")
    .select("*")
    .eq("day_of_week", _dow);
  const opHours =
    (allOpHours ?? []).find((h: any) => h.month === _month) ??
    (allOpHours ?? []).find((h: any) => h.month == null) ??
    null;

  // Check blocked dates
  const { data: blocked } = await supabase
    .from("blocked_dates")
    .select("id")
    .eq("blocked_date", payload.bookingDate)
    .maybeSingle();
  if (blocked) return { success: false, error: "That date is blocked." };

  // Fetch existing bookings for that date (include duration_override for accurate conflict detection)
  const { data: existing } = await supabase
    .from("bookings")
    .select("booking_time, service_name, vehicle_size, status, duration_override")
    .eq("booking_date", payload.bookingDate)
    .neq("status", "cancelled");

  const bookedTime24 = to24h(payload.bookingTime);
  const newStartMins = timeToMins(bookedTime24);
  const newDuration  = getDurationMins(payload.serviceName, payload.vehicleSize);
  const existingWithDur = (existing ?? []).map((b: any) => ({
    ...b,
    total_duration_mins: b.duration_override ?? undefined,
  }));
  const hasConflict = checkSlotConflict(existingWithDur, newStartMins, newDuration);
  if (hasConflict && !payload.allowOverlap) return { success: false, error: "That time slot conflicts with an existing booking." };

  // Delegate the rest to the existing action (profile/vehicle/booking/emails)
  return adminQuickBookAction({ ...payload, bookingTime: to24h(payload.bookingTime).slice(0,5) });
}

// ── Test booking (creates + immediately deletes, sends all emails) ─────────
export async function runTestBookingAction(adminEmail: string): Promise<{ success: boolean; error?: string; log: string[] }> {
  const log: string[] = [];
  const supabase = createAdminClient();
  const sampleData = {
    customerName: "Test Client",
    customerEmail: adminEmail,
    customerPhone: "8025550199",
    serviceName: "Full Interior Detail",
    servicePrice: 250,
    bookingDate: new Date().toISOString().split("T")[0],
    bookingTime: "10:00 AM",
    vehicleYear: "2024",
    vehicleMake: "Toyota",
    vehicleModel: "Camry",
    vehicleSize: "sedan",
    serviceAddress: "123 Test St, Burlington, VT",
    bookingId: "test-" + Date.now(),
  };

  try {
    // In test mode, the owner-alert copy also lands at the chosen test
    // address so nothing reaches the live admin inbox.
    await sendBookingEmails(sampleData, { ownerEmailOverride: adminEmail });
    log.push("✅ Customer confirmation + owner alert sent");
  } catch (e: any) { log.push("❌ Customer confirmation: " + e.message); }

  try {
    await sendOnMyWayEmailNotification({ customerName: sampleData.customerName, customerEmail: adminEmail });
    log.push("✅ On My Way email sent");
  } catch (e: any) { log.push("❌ On My Way: " + e.message); }

  try {
    await sendJobCompletedEmail({
      customerName: sampleData.customerName,
      customerEmail: adminEmail,
      serviceName: sampleData.serviceName,
      amountPaid: sampleData.servicePrice,
    });
    log.push("✅ Job Completed email sent");
  } catch (e: any) { log.push("❌ Job Completed: " + e.message); }

  try {
    await sendReviewFollowupEmail({ customerName: sampleData.customerName, customerEmail: adminEmail });
    log.push("✅ Review + Maintenance upsell email sent");
  } catch (e: any) { log.push("❌ Review email: " + e.message); }

  try {
    await sendUpdatedBookingEmail({
      customerName: sampleData.customerName,
      customerEmail: adminEmail,
      serviceName: sampleData.serviceName,
      newDate: sampleData.bookingDate,
      newTime: "02:00 PM",
    });
    log.push("✅ Reschedule email sent");
  } catch (e: any) { log.push("❌ Reschedule: " + e.message); }

  try {
    await sendBookingCancellationEmails({
      customerName: sampleData.customerName,
      customerEmail: adminEmail,
      bookingDate: sampleData.bookingDate,
      bookingTime: sampleData.bookingTime,
      serviceName: sampleData.serviceName,
    });
    log.push("✅ Cancellation email sent");
  } catch (e: any) { log.push("❌ Cancellation: " + e.message); }

  return { success: true, log };
}


// ── Error Logs ────────────────────────────────────────────────────────────────

export async function getErrorLogs(limit = 50) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("error_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return data ?? [];
}

// ── Block rest of day ─────────────────────────────────────────────────────────

/** Creates a Personal Block from the end of the last active booking to the end of operating hours.
 *  If no bookings exist yet, blocks the entire operating day. */
export async function blockRestOfDayAction(date: string): Promise<{ success: boolean; error?: string; blockedFrom?: string; blockedTo?: string }> {
  const supabase = createAdminClient();

  // Get operating hours — prefer month-specific seasonal row over null-month default
  const d = new Date(date + "T12:00:00");
  const dow   = d.getDay();        // 0=Sun
  const month = d.getMonth() + 1; // 1-12
  const { data: allHours } = await supabase
    .from("operating_hours")
    .select("start_time, end_time, is_open, month")
    .eq("day_of_week", dow);
  const seasonal = (allHours ?? []).find((h: any) => h.month === month);
  const fallback = (allHours ?? []).find((h: any) => h.month == null);
  const opHours  = seasonal ?? fallback ?? null;

  const dayEnd   = opHours?.end_time   ? timeToMins(opHours.end_time)   : 19 * 60;
  const dayStart = opHours?.start_time ? timeToMins(opHours.start_time) : 7 * 60;

  if (opHours && !opHours.is_open) return { success: false, error: "That day is marked closed." };

  // Get all active bookings for this date
  const { data: existing } = await supabase
    .from("bookings")
    .select("booking_time, service_name, vehicle_size, status, duration_override")
    .eq("booking_date", date)
    .neq("status", "cancelled")
    .neq("status", "no-show");

  const { getDurationMins, timeToMins: tToM } = await import("@/lib/availability");

  // Find latest end time among real bookings (not existing blocks)
  let latestEnd = dayStart;
  for (const b of existing ?? []) {
    const start = tToM((b as any).booking_time ?? "00:00");
    const override = (b as any).duration_override;
    const dur = override != null ? override : getDurationMins((b as any).service_name ?? "", (b as any).vehicle_size ?? "sedan");
    const end = start + dur;
    if (end > latestEnd) latestEnd = end;
  }

  if (latestEnd >= dayEnd) {
    return { success: false, error: "The rest of the day is already blocked or booked." };
  }

  const blockDuration = dayEnd - latestEnd;
  const hh = String(Math.floor(latestEnd / 60)).padStart(2, "0");
  const mm = String(latestEnd % 60).padStart(2, "0");

  const { error: insertErr } = await supabase.from("bookings").insert({
    booking_date: date,
    booking_time: `${hh}:${mm}:00`,
    service_name: "Personal Block",
    vehicle_size: String(blockDuration),
    customer_name: "Admin Block",
    status: "blocked",
    total_price: 0,
    notes: "Blocked — rest of day",
    user_id: null,
    vehicle_id: null,
    service_id: null,
  });

  if (insertErr) return { success: false, error: insertErr.message };

  const endH = Math.floor(dayEnd / 60) % 12 || 12;
  const endPeriod = Math.floor(dayEnd / 60) >= 12 ? "PM" : "AM";
  const startH = Math.floor(latestEnd / 60) % 12 || 12;
  const startPeriod = Math.floor(latestEnd / 60) >= 12 ? "PM" : "AM";

  return {
    success: true,
    blockedFrom: `${startH}:${mm} ${startPeriod}`,
    blockedTo: `${endH}:${String(dayEnd % 60).padStart(2, "0")} ${endPeriod}`,
  };
}

// ── Update booking duration ────────────────────────────────────────────────────

/** Silently updates the duration_override for a booking (no customer notification). */
export async function updateBookingDurationAction(bookingId: string, durationMins: number): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("bookings")
    .update({ duration_override: durationMins })
    .eq("id", bookingId);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

// ── Test pay page URL ─────────────────────────────────────────────────────────

/** Returns the ID of a recent bookable booking to preview the /pay page. */
export async function getTestPayUrl(): Promise<{ bookingId: string } | { error: string }> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("bookings")
    .select("id")
    .neq("status", "cancelled")
    .not("total_price", "is", null)
    .gt("total_price", 0)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();
  if (error || !data) return { error: "No bookings found to preview." };
  return { bookingId: data.id };
}
