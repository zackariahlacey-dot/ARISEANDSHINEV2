"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function requireAdmin(): Promise<
  | { ok: true; userId: string; ip: string | null }
  | { ok: false; error: string }
> {
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
  if (!isAdminRole && !emailMatch) return { ok: false, error: "Admin only." };

  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? h.get("x-real-ip") ?? "").split(",")[0]?.trim() || null;
  return { ok: true, userId: user.id, ip };
}

/**
 * Approve photos on a completed job. Locks the final_commission_cents to
 * the booking's current base_commission_cents plus any prior adjustments,
 * so the contractor's payout becomes a known fixed number.
 */
export async function approvePhotos(bookingId: string): Promise<{ ok: boolean; error?: string }> {
  const auth = await requireAdmin();
  if (!auth.ok) return { ok: false, error: auth.error };

  const admin = createAdminClient();
  const { data: b } = await admin
    .from("bookings")
    .select("id, base_commission_cents, photo_review_status, job_completed_at, assigned_to")
    .eq("id", bookingId)
    .maybeSingle();
  if (!b) return { ok: false, error: "Booking not found." };
  if (!(b as any).job_completed_at) return { ok: false, error: "Job isn't marked complete yet." };

  const baseCents = Number((b as any).base_commission_cents ?? 0);
  // Sum any existing adjustments already recorded for this booking
  const { data: adjustments } = await admin
    .from("commission_adjustments")
    .select("adjustment_cents")
    .eq("booking_id", bookingId);
  const adjustSum = (adjustments ?? []).reduce(
    (s, r: any) => s + Number(r.adjustment_cents ?? 0), 0
  );
  const finalCents = Math.max(0, baseCents + adjustSum);

  const { error } = await admin
    .from("bookings")
    .update({
      photo_review_status:  "approved",
      photo_reviewed_by:    auth.userId,
      photo_reviewed_at:    new Date().toISOString(),
      final_commission_cents: finalCents,
    })
    .eq("id", bookingId);
  if (error) return { ok: false, error: error.message };

  await admin.from("admin_audit_log").insert({
    admin_id: auth.userId,
    action: "approve_photos",
    target_table: "bookings",
    target_id: bookingId,
    payload: { finalCents, contractorId: (b as any).assigned_to },
    ip_address: auth.ip,
  });
  return { ok: true };
}

/**
 * Reject photos. Final commission stays unlocked; contractor sees the
 * rejection notes on their dashboard and can re-upload + ping admin.
 */
export async function rejectPhotos(bookingId: string, reason: string): Promise<{ ok: boolean; error?: string }> {
  const auth = await requireAdmin();
  if (!auth.ok) return { ok: false, error: auth.error };
  const cleanReason = reason.trim();
  if (cleanReason.length < 3) return { ok: false, error: "Rejection reason is required." };

  const admin = createAdminClient();
  const { error } = await admin
    .from("bookings")
    .update({
      photo_review_status: "rejected",
      photo_reviewed_by:   auth.userId,
      photo_reviewed_at:   new Date().toISOString(),
      // Note attached to the booking for the contractor to see
      notes: undefined,                       // intentionally not overwriting customer-facing notes
    })
    .eq("id", bookingId);
  if (error) return { ok: false, error: error.message };

  await admin.from("admin_audit_log").insert({
    admin_id: auth.userId,
    action: "reject_photos",
    target_table: "bookings",
    target_id: bookingId,
    payload: { reason: cleanReason },
    ip_address: auth.ip,
  });

  // Also record the rejection reason as a commission adjustment of $0 so
  // it shows up in the contractor's audit trail without changing the
  // payout (commission adjustments require a reason — perfect place to
  // surface "why was this rejected?").
  await admin.from("commission_adjustments").insert({
    booking_id:       bookingId,
    contractor_id:    auth.userId,                    // placeholder; recompute below
    adjustment_cents: 0,
    reason:           `Photos rejected: ${cleanReason}`,
    admin_id:         auth.userId,
  });

  return { ok: true };
}

/**
 * Apply a commission adjustment (positive for tip / bonus, negative for
 * quality reduction). Reason is mandatory and surfaces on the contractor's
 * dashboard so they always know why.
 */
export async function adjustCommission(args: {
  bookingId: string;
  adjustmentCents: number;       // negative = reduction, positive = bonus/tip
  reason: string;
}): Promise<{ ok: boolean; error?: string; newFinalCents?: number }> {
  const auth = await requireAdmin();
  if (!auth.ok) return { ok: false, error: auth.error };

  const cleanReason = args.reason.trim();
  if (cleanReason.length < 3) return { ok: false, error: "Adjustment reason is required." };
  const cents = Math.round(args.adjustmentCents);
  if (!Number.isFinite(cents) || cents === 0) return { ok: false, error: "Enter a non-zero amount." };

  const admin = createAdminClient();
  const { data: b } = await admin
    .from("bookings")
    .select("id, assigned_to, base_commission_cents, photo_review_status, job_completed_at")
    .eq("id", args.bookingId)
    .maybeSingle();
  if (!b) return { ok: false, error: "Booking not found." };
  const contractorId = (b as any).assigned_to as string | null;
  if (!contractorId) return { ok: false, error: "Booking is not assigned to a contractor." };

  await admin.from("commission_adjustments").insert({
    booking_id:       args.bookingId,
    contractor_id:    contractorId,
    adjustment_cents: cents,
    reason:           cleanReason,
    admin_id:         auth.userId,
  });

  // If photos are already approved, recompute final_commission_cents to
  // include this adjustment immediately.
  let newFinalCents: number | undefined;
  if ((b as any).photo_review_status === "approved") {
    const { data: allAdj } = await admin
      .from("commission_adjustments")
      .select("adjustment_cents")
      .eq("booking_id", args.bookingId);
    const adjustSum = (allAdj ?? []).reduce(
      (s, r: any) => s + Number(r.adjustment_cents ?? 0), 0
    );
    newFinalCents = Math.max(0, Number((b as any).base_commission_cents ?? 0) + adjustSum);
    await admin
      .from("bookings")
      .update({ final_commission_cents: newFinalCents })
      .eq("id", args.bookingId);
  }

  await admin.from("admin_audit_log").insert({
    admin_id: auth.userId,
    action: cents > 0 ? "commission_bonus" : "commission_reduction",
    target_table: "bookings",
    target_id: args.bookingId,
    payload: { adjustmentCents: cents, reason: cleanReason, newFinalCents },
    ip_address: auth.ip,
  });

  return { ok: true, newFinalCents };
}

/** Bundle every adjustment for a booking — used by admin review screen. */
export async function listCommissionAdjustments(bookingId: string): Promise<Array<{
  id: string;
  adjustmentCents: number;
  reason: string;
  createdAt: string;
}>> {
  const auth = await requireAdmin();
  if (!auth.ok) return [];

  const admin = createAdminClient();
  const { data } = await admin
    .from("commission_adjustments")
    .select("id, adjustment_cents, reason, created_at")
    .eq("booking_id", bookingId)
    .order("created_at", { ascending: false });
  return (data ?? []).map((r: any) => ({
    id: r.id,
    adjustmentCents: Number(r.adjustment_cents),
    reason: r.reason,
    createdAt: r.created_at,
  }));
}

/** All photos + booking summary, used by the admin photo-review panel. */
export type PhotoReviewBundle = {
  booking: {
    id: string;
    customerName: string;
    serviceName: string;
    bookingDate: string;
    bookingTime: string;
    totalPrice: number;
    baseCommissionCents: number;
    finalCommissionCents: number | null;
    photoReviewStatus: string;
    contractorName: string | null;
    contractorId: string | null;
  };
  photos: Array<{
    id: string;
    photoType: string;
    fileUrl: string;
    uploadedAt: string;
  }>;
  adjustments: Array<{
    id: string;
    adjustmentCents: number;
    reason: string;
    createdAt: string;
  }>;
};

export async function getPhotoReviewBundle(bookingId: string): Promise<PhotoReviewBundle | null> {
  const auth = await requireAdmin();
  if (!auth.ok) return null;

  const admin = createAdminClient();
  const [bookingRes, photosRes, adjustRes] = await Promise.all([
    admin
      .from("bookings")
      .select("id, customer_name, service_name, booking_date, booking_time, total_price, base_commission_cents, final_commission_cents, photo_review_status, assigned_to")
      .eq("id", bookingId)
      .maybeSingle(),
    admin
      .from("contractor_job_photos")
      .select("id, photo_type, file_url, uploaded_at")
      .eq("booking_id", bookingId)
      .order("uploaded_at", { ascending: true }),
    admin
      .from("commission_adjustments")
      .select("id, adjustment_cents, reason, created_at")
      .eq("booking_id", bookingId)
      .order("created_at", { ascending: false }),
  ]);

  const b = bookingRes.data as any;
  if (!b) return null;

  let contractorName: string | null = null;
  if (b.assigned_to) {
    const { data: cp } = await admin
      .from("profiles")
      .select("first_name, last_name")
      .eq("id", b.assigned_to)
      .maybeSingle();
    if (cp) {
      contractorName = `${(cp as any).first_name ?? ""} ${(cp as any).last_name ?? ""}`.trim() || null;
    }
  }

  // Sign all photo URLs
  const signed: Array<{ id: string; photoType: string; fileUrl: string; uploadedAt: string }> = [];
  for (const p of (photosRes.data ?? []) as any[]) {
    const path = p.file_url as string;
    let url = "";
    try {
      const { data: s } = await admin.storage.from("contractor-job-photos").createSignedUrl(path, 300);
      url = s?.signedUrl ?? "";
    } catch {}
    signed.push({
      id: p.id,
      photoType: p.photo_type,
      fileUrl: url,
      uploadedAt: p.uploaded_at,
    });
  }

  return {
    booking: {
      id: b.id,
      customerName: b.customer_name ?? "—",
      serviceName: b.service_name ?? "—",
      bookingDate: b.booking_date,
      bookingTime: b.booking_time,
      totalPrice: Number(b.total_price ?? 0),
      baseCommissionCents: Number(b.base_commission_cents ?? 0),
      finalCommissionCents: b.final_commission_cents != null ? Number(b.final_commission_cents) : null,
      photoReviewStatus: b.photo_review_status ?? "pending",
      contractorName,
      contractorId: b.assigned_to ?? null,
    },
    photos: signed,
    adjustments: (adjustRes.data ?? []).map((r: any) => ({
      id: r.id,
      adjustmentCents: Number(r.adjustment_cents),
      reason: r.reason,
      createdAt: r.created_at,
    })),
  };
}

/** List the bookings sitting in the photo-review queue — for admin Today. */
export async function listPendingPhotoReviews(): Promise<Array<{
  bookingId: string;
  customerName: string;
  serviceName: string;
  bookingDate: string;
  contractorName: string | null;
  completedAt: string;
}>> {
  const auth = await requireAdmin();
  if (!auth.ok) return [];

  const admin = createAdminClient();
  const { data } = await admin
    .from("bookings")
    .select("id, customer_name, service_name, booking_date, job_completed_at, assigned_to, profiles:assigned_to(first_name, last_name)")
    .not("job_completed_at", "is", null)
    .eq("photo_review_status", "pending")
    .order("job_completed_at", { ascending: true })
    .limit(50);

  return (data ?? []).map((b: any) => {
    const p = Array.isArray(b.profiles) ? b.profiles[0] : b.profiles;
    const cn = p ? `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() : null;
    return {
      bookingId: b.id,
      customerName: b.customer_name ?? "—",
      serviceName: b.service_name ?? "—",
      bookingDate: b.booking_date,
      contractorName: cn || null,
      completedAt: b.job_completed_at,
    };
  });
}
