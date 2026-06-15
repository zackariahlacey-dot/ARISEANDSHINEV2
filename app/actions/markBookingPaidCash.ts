"use server";

import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Marks a booking as paid via cash and flips status → completed, cascading
 * complete down to every booking_vehicles row. Use this when the customer
 * paid in person; the Stripe-link path lives in the webhook.
 */
export async function markBookingPaidCash(
  bookingId: string,
  opts: { tipCash?: number } = {},
): Promise<{ ok: boolean; error?: string }> {
  if (!bookingId) return { ok: false, error: "Missing booking id." };
  const supabase = createAdminClient();
  const nowIso = new Date().toISOString();
  const tipCents = Math.max(0, Math.round(Number(opts.tipCash ?? 0) * 100));

  const { error } = await supabase
    .from("bookings")
    .update({
      status:         "completed",
      paid_at:        nowIso,
      payment_source: "cash",
      ...(tipCents > 0 ? { tip_cents: tipCents } : {}),
      updated_at:     nowIso,
    })
    .eq("id", bookingId)
    .neq("status", "cancelled");

  if (error) return { ok: false, error: error.message };

  await supabase
    .from("booking_vehicles")
    .update({ status: "complete", completed_at: nowIso })
    .eq("booking_id", bookingId)
    .neq("status", "complete");

  return { ok: true };
}
