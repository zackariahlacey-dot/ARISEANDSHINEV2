"use server";

import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendBookingCancellationEmails } from "@/lib/email";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-02-25.clover",
});

export async function cancelBooking(bookingId: string): Promise<{
  success: boolean;
  error?: string;
  refunded?: boolean;
}> {
  try {
    if (!bookingId?.trim()) {
      return { success: false, error: "Booking ID is required." };
    }

    const supabase = createAdminClient();

    // Use flat column selects only — the previous version joined
    // profiles(...) and services(...) inline, which can 400 the whole
    // request if the FK catalog is missing a relation (e.g. an old
    // booking with service_id pointing at a service that's since been
    // soft-deleted and cascaded). Snapshotted columns are the safe path.
    const { data: booking, error: fetchError } = await supabase
      .from("bookings")
      .select(
        "id, booking_date, booking_time, status, total_price, user_id, stripe_checkout_session_id, customer_name, customer_email, service_name, membership_id, membership_credit_applied_cents"
      )
      .eq("id", bookingId)
      .maybeSingle();

    if (fetchError) {
      console.error("[cancelBooking] fetch error:", fetchError);
      return { success: false, error: "Could not load booking. Please refresh and try again." };
    }
    if (!booking) {
      return { success: false, error: "Booking not found." };
    }
    if (booking.status === "cancelled") {
      return { success: false, error: "This booking is already cancelled." };
    }

    const { error: updateError } = await supabase
      .from("bookings")
      .update({ status: "cancelled" })
      .eq("id", bookingId);

    if (updateError) {
      console.error("[cancelBooking] update:", updateError);
      return { success: false, error: updateError.message };
    }

    // ── Restore membership credit if this booking used it ──────────────────
    const membershipId = (booking as any).membership_id as string | null;
    const creditAppliedCents = Number((booking as any).membership_credit_applied_cents ?? 0);
    if (membershipId && creditAppliedCents > 0) {
      try {
        const { error: restoreErr } = await supabase.rpc("restore_membership_credit", {
          p_membership_id: membershipId,
          p_amount_cents:  creditAppliedCents,
        });
        if (restoreErr) {
          console.error("[cancelBooking] credit restore failed (cancellation still applied):", restoreErr);
        }
      } catch (rpcErr) {
        console.error("[cancelBooking] credit restore threw:", rpcErr);
      }
    }

    // ── Load profile separately so a bad FK on the booking join can't nuke
    //    the whole action. Best-effort — cancellation still succeeds even
    //    if the profile lookup fails.
    let profileFirstName: string | null = null;
    let profileLastName: string | null = null;
    let profileEmail: string | null = null;
    let profileCompletedCount = 0;
    if (booking.user_id) {
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("first_name, last_name, email, completed_detail_count")
          .eq("id", booking.user_id)
          .maybeSingle();
        if (profile) {
          profileFirstName = (profile as any).first_name ?? null;
          profileLastName = (profile as any).last_name ?? null;
          profileEmail = (profile as any).email ?? null;
          profileCompletedCount = Number((profile as any).completed_detail_count ?? 0);
        }
      } catch (profileErr) {
        console.error("[cancelBooking] profile lookup failed:", profileErr);
      }
    }

    // ── Loyalty: decrement count if this was a qualifying service ───────────
    if (booking.user_id) {
      try {
        const { CAR_DETAIL_SERVICES, getDiscountPct } = await import("@/lib/loyalty");
        const serviceName = (booking.service_name as string | null) ?? "";
        if (CAR_DETAIL_SERVICES.has(serviceName)) {
          const newCount = Math.max(0, profileCompletedCount - 1);
          const newPct = getDiscountPct(newCount);
          await supabase.from("profiles").update({
            completed_detail_count: newCount,
            loyalty_discount_pct:   newPct,
          }).eq("id", booking.user_id);
        }
      } catch (loyaltyErr) {
        console.error("[cancelBooking] loyalty decrement failed:", loyaltyErr);
      }
    }

    // ── Cancellation email — best-effort, never throw ──────────────────────
    const customerName =
      (booking.customer_name as string | null) ??
      ([profileFirstName, profileLastName].filter(Boolean).join(" ").trim() || "Customer");
    const customerEmail =
      (booking.customer_email as string | null) ??
      (profileEmail ?? "");
    const bookingTime = booking.booking_time
      ? new Date(`1970-01-01T${booking.booking_time}`).toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
        })
      : "";
    const serviceName = (booking.service_name as string | null) ?? "Appointment";

    try {
      await sendBookingCancellationEmails({
        customerName,
        customerEmail,
        bookingDate: booking.booking_date,
        bookingTime,
        serviceName,
      });
    } catch (emailErr) {
      console.error("[cancelBooking] email failed:", emailErr);
    }

    // ── Stripe refund if paid ──────────────────────────────────────────────
    let refunded = false;
    const sessionId = booking.stripe_checkout_session_id as string | null;
    if (sessionId && process.env.STRIPE_SECRET_KEY) {
      try {
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        const paymentIntentId =
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : session.payment_intent?.id ?? null;

        if (paymentIntentId) {
          await stripe.refunds.create({ payment_intent: paymentIntentId });
          refunded = true;
        }
      } catch (refundErr) {
        // Booking is already cancelled — admin can refund manually if this fails.
        console.error("[cancelBooking] Stripe refund failed:", refundErr);
      }
    }

    return { success: true, refunded };
  } catch (uncaught) {
    // Belt + suspenders — never let a bad throw bubble to Next.js render.
    console.error("[cancelBooking] uncaught:", uncaught);
    return { success: false, error: "Something went wrong. Please try again." };
  }
}
