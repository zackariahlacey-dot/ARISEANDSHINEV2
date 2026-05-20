"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendOnMyWayEmail } from "@/app/actions/adminActions";
import { expectedSlotsFor } from "@/lib/jobPhotos";

type Stage = "accept" | "on_my_way" | "arrived" | "start" | "complete" | "issue";

async function requireAssignedContractor(bookingId: string): Promise<
  | { ok: true; userId: string; booking: any }
  | { ok: false; error: string }
> {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const admin = createAdminClient();
  const { data: b } = await admin
    .from("bookings")
    .select("id, assigned_to, status, service_name, customer_email, customer_phone, customer_name, booking_date, booking_time, service_address, on_my_way_at, arrived_at, started_at, job_completed_at, accepted_at")
    .eq("id", bookingId)
    .maybeSingle();
  if (!b) return { ok: false, error: "Booking not found." };
  if ((b as any).assigned_to !== user.id) {
    return { ok: false, error: "This job is not assigned to you." };
  }
  if ((b as any).status === "cancelled") {
    return { ok: false, error: "This booking was cancelled." };
  }
  return { ok: true, userId: user.id, booking: b };
}

async function audit(adminId: string, action: string, bookingId: string, payload: object) {
  try {
    const admin = createAdminClient();
    const h = await headers();
    const ip = (h.get("x-forwarded-for") ?? h.get("x-real-ip") ?? "").split(",")[0]?.trim() || null;
    await admin.from("admin_audit_log").insert({
      admin_id: adminId,
      action,
      target_table: "bookings",
      target_id: bookingId,
      payload,
      ip_address: ip,
    });
  } catch {}
}

// ── Accept assignment ────────────────────────────────────────────────────────

export async function acceptJob(bookingId: string): Promise<{ ok: boolean; error?: string }> {
  const auth = await requireAssignedContractor(bookingId);
  if (!auth.ok) return { ok: false, error: auth.error };
  if (auth.booking.accepted_at) return { ok: true };

  const admin = createAdminClient();
  const { error } = await admin
    .from("bookings")
    .update({ accepted_at: new Date().toISOString() })
    .eq("id", bookingId);
  if (error) return { ok: false, error: error.message };

  await audit(auth.userId, "contractor_accept_job", bookingId, {});
  return { ok: true };
}

// ── On My Way ────────────────────────────────────────────────────────────────

export async function startOnMyWay(bookingId: string): Promise<{ ok: boolean; error?: string }> {
  const auth = await requireAssignedContractor(bookingId);
  if (!auth.ok) return { ok: false, error: auth.error };

  const admin = createAdminClient();
  const now = new Date().toISOString();
  const { error } = await admin
    .from("bookings")
    .update({
      on_my_way_at: now,
      ...(auth.booking.accepted_at ? {} : { accepted_at: now }),
    })
    .eq("id", bookingId);
  if (error) return { ok: false, error: error.message };

  // Fire the on-my-way customer email (existing flow). Best-effort.
  try {
    await sendOnMyWayEmail(bookingId);
  } catch (err) {
    console.error("[startOnMyWay] email error:", err);
  }

  await audit(auth.userId, "contractor_on_my_way", bookingId, {});
  return { ok: true };
}

// ── Arrived ──────────────────────────────────────────────────────────────────

export async function markArrived(bookingId: string): Promise<{ ok: boolean; error?: string }> {
  const auth = await requireAssignedContractor(bookingId);
  if (!auth.ok) return { ok: false, error: auth.error };
  if (auth.booking.arrived_at) return { ok: true };

  const admin = createAdminClient();
  const { error } = await admin
    .from("bookings")
    .update({ arrived_at: new Date().toISOString() })
    .eq("id", bookingId);
  if (error) return { ok: false, error: error.message };

  await audit(auth.userId, "contractor_arrived", bookingId, {});
  return { ok: true };
}

// ── Start job ────────────────────────────────────────────────────────────────

export async function startJob(bookingId: string): Promise<{ ok: boolean; error?: string }> {
  const auth = await requireAssignedContractor(bookingId);
  if (!auth.ok) return { ok: false, error: auth.error };
  if (auth.booking.started_at) return { ok: true };

  // Require the pre-existing-damage walk-around photo before work begins
  const admin = createAdminClient();
  const { data: preDmg } = await admin
    .from("contractor_job_photos")
    .select("id")
    .eq("booking_id", bookingId)
    .eq("photo_type", "pre_existing_damage")
    .maybeSingle();
  if (!preDmg) {
    return { ok: false, error: "Take the pre-existing damage walk-around photo before starting." };
  }

  const { error } = await admin
    .from("bookings")
    .update({ started_at: new Date().toISOString() })
    .eq("id", bookingId);
  if (error) return { ok: false, error: error.message };

  await audit(auth.userId, "contractor_start_job", bookingId, {});
  return { ok: true };
}

// ── Complete job ─────────────────────────────────────────────────────────────

export async function completeJob(bookingId: string): Promise<{ ok: boolean; error?: string; missingSlots?: string[] }> {
  const auth = await requireAssignedContractor(bookingId);
  if (!auth.ok) return { ok: false, error: auth.error };

  const admin = createAdminClient();

  // Validate required photo set is complete
  const required = expectedSlotsFor(auth.booking.service_name);
  const { data: photos } = await admin
    .from("contractor_job_photos")
    .select("photo_type")
    .eq("booking_id", bookingId);
  const have = new Set((photos ?? []).map((p: any) => p.photo_type as string));
  const missing = required.filter(s => !have.has(s));
  if (missing.length > 0) {
    return {
      ok: false,
      error: `Upload ${missing.length} more photo${missing.length === 1 ? "" : "s"} before completing.`,
      missingSlots: missing,
    };
  }

  // Compute estimated base commission in cents using the contractor's pct
  const { data: prof } = await admin
    .from("profiles")
    .select("commission_pct")
    .eq("id", auth.userId)
    .maybeSingle();
  const pct = Number((prof as any)?.commission_pct ?? 35);
  const { data: bookingRow } = await admin
    .from("bookings")
    .select("total_price")
    .eq("id", bookingId)
    .maybeSingle();
  const total = Number((bookingRow as any)?.total_price ?? 0);
  const baseCents = Math.round(total * pct);   // total$ × pct% = cents

  const { error } = await admin
    .from("bookings")
    .update({
      job_completed_at: new Date().toISOString(),
      base_commission_cents: baseCents,
      photo_review_status: "pending",
    })
    .eq("id", bookingId);
  if (error) return { ok: false, error: error.message };

  // Increment contractor's completed_jobs_count (best-effort, racy but
  // acceptable here — the count is informational, not load-bearing).
  try {
    const { data: pp } = await admin
      .from("profiles")
      .select("completed_jobs_count")
      .eq("id", auth.userId)
      .maybeSingle();
    const cur = Number((pp as any)?.completed_jobs_count ?? 0);
    await admin
      .from("profiles")
      .update({ completed_jobs_count: cur + 1 })
      .eq("id", auth.userId);
  } catch {}

  await audit(auth.userId, "contractor_complete_job", bookingId, { baseCents });

  // Schedule the customer rating: creates the rating row with a token now,
  // but the email isn't sent until the 2-hour delay window has passed via
  // the /api/cron/customer-rating-emails route.
  //
  // Gated behind ENABLE_CONTRACTOR_CUSTOMER_EMAILS — until that env flag
  // is true, no rating row is created so no email ever goes out. Lets the
  // operator test the full contractor execution flow end-to-end without
  // surprising actual customers with new emails.
  try {
    const { contractorCustomerEmailsEnabled } = await import("@/lib/contractorFeatureFlag");
    if (contractorCustomerEmailsEnabled()) {
      const { createRatingForBooking } = await import("@/app/actions/customerRating");
      await createRatingForBooking(bookingId);
    }
  } catch (err) {
    console.error("[completeJob] createRatingForBooking:", err);
  }

  return { ok: true };
}

// ── Issue report (urgent admin alert) ────────────────────────────────────────

export async function reportIssue(bookingId: string, category: string, notes: string): Promise<{ ok: boolean; error?: string }> {
  const auth = await requireAssignedContractor(bookingId);
  if (!auth.ok) return { ok: false, error: auth.error };

  const cleanNotes = notes.trim();
  if (cleanNotes.length < 3) return { ok: false, error: "Add a short description of the issue." };

  const admin = createAdminClient();
  // Log to error_logs so admin Today surfaces it
  try {
    await admin.from("error_logs").insert({
      type: "contractor_issue_report",
      source: "jobLifecycle",
      message: `[${category}] ${cleanNotes}`,
      details: { bookingId, contractorId: auth.userId, category },
    });
  } catch {}

  await audit(auth.userId, "contractor_report_issue", bookingId, { category, notes: cleanNotes });
  return { ok: true };
}
