"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createResend } from "@/lib/mailer";
import { signScheduleToken } from "@/lib/monthlyToken";
import { getMonthlyScheduleReminderHtml } from "@/emails/MonthlyScheduleReminder";
import { getMonthlyAppointmentConfirmationHtml } from "@/emails/MonthlyAppointmentConfirmation";
import Stripe from "stripe";

const FROM  = process.env.EMAIL_FROM ?? "Arise And Shine Detailing <bookings@ariseandshinedetailing.com>";
const SITE  = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://ariseandshinedetailing.com").replace(/\/$/, "");

// ── Fetch all monthly subscribers ────────────────────────────────────────────

export async function getMonthlySubscribers() {
  const supabase = createAdminClient();
  const now      = new Date();
  const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const { data: subs, error } = await supabase
    .from("monthly_subscriptions")
    .select("*")
    .order("created_at", { ascending: false });

  if (error || !subs) return [];

  // Fetch this month's picks in one query
  const subIds = subs.map((s: any) => s.id);
  let picksMap = new Map<string, any>();
  if (subIds.length > 0) {
    const { data: picks } = await supabase
      .from("monthly_schedule_picks")
      .select("subscription_id, chosen_date, chosen_time, status, reminder_sent_at")
      .eq("month", monthStr)
      .in("subscription_id", subIds);
    for (const p of picks ?? []) picksMap.set(p.subscription_id, p);
  }

  return subs.map((s: any) => ({
    ...s,
    thisMonthPick: picksMap.get(s.id) ?? null,
    currentMonth:  monthStr,
  }));
}

// ── Update subscriber vehicle / address ──────────────────────────────────────

export async function updateSubscriberDetails(
  subscriptionId: string,
  updates: {
    vehicle_make?: string;
    vehicle_model?: string;
    vehicle_year?: string;
    vehicle_size?: string;
    service_address?: string;
    plan_id?: string;
    plan_name?: string;
    plan_price?: number;
    admin_notes?: string;
  }
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createAdminClient();

  // If plan price is changing, sync to Stripe
  if (updates.plan_price !== undefined && process.env.STRIPE_SECRET_KEY) {
    const { data: sub } = await supabase
      .from("monthly_subscriptions")
      .select("stripe_subscription_id, plan_name")
      .eq("id", subscriptionId)
      .maybeSingle();
    if (sub?.stripe_subscription_id) {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2026-02-25.clover" });
      const planName = updates.plan_name ?? sub.plan_name ?? "Monthly Detail Plan";
      await stripe.subscriptions.retrieve(sub.stripe_subscription_id)
        .then(async (stripeSub) => {
          const itemId = stripeSub.items.data[0]?.id;
          if (!itemId) return;
          await stripe.subscriptions.update(sub.stripe_subscription_id!, {
            items: [{
              id: itemId,
              price_data: {
                currency: "usd",
                recurring: { interval: "month" },
                unit_amount: Math.round(updates.plan_price! * 100),
              } as any,
            }],
            proration_behavior: "none",
          });
        })
        .catch(err => console.error("[updateSubscriberDetails] Stripe update failed:", err));
    }
  }

  const { error } = await supabase
    .from("monthly_subscriptions")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", subscriptionId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// ── Pause / reactivate ───────────────────────────────────────────────────────

export async function setSubscriptionStatus(
  subscriptionId: string,
  status: "active" | "paused" | "cancelled"
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createAdminClient();

  // Sync pause / resume / cancel to Stripe
  if (status === "cancelled" || status === "paused" || status === "active") {
    const { data: sub } = await supabase
      .from("monthly_subscriptions")
      .select("stripe_subscription_id, profile_id, status")
      .eq("id", subscriptionId)
      .maybeSingle();

    if (sub?.stripe_subscription_id && process.env.STRIPE_SECRET_KEY) {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2026-02-25.clover" });
      if (status === "cancelled") {
        await stripe.subscriptions.cancel(sub.stripe_subscription_id).catch(console.error);
      } else if (status === "paused") {
        await stripe.subscriptions.update(sub.stripe_subscription_id, {
          pause_collection: { behavior: "void" },
        }).catch(console.error);
      } else if (status === "active" && sub.status === "paused") {
        // Resuming from pause
        await stripe.subscriptions.update(sub.stripe_subscription_id, {
          pause_collection: "",
        } as any).catch(console.error);
      }
    }

    if (status !== "cancelled") {
      const { error } = await supabase
        .from("monthly_subscriptions")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", subscriptionId);
      if (error) return { ok: false, error: error.message };
      return { ok: true };
    }

    // For cancel path, continue below to also cancel future bookings
    if (!sub) {
      const { error } = await supabase
        .from("monthly_subscriptions")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", subscriptionId);
      if (error) return { ok: false, error: error.message };
      return { ok: true };
    }

    // Cancel future bookings
    if (sub?.profile_id) {
      const today = new Date().toISOString().slice(0, 10);
      await supabase
        .from("bookings")
        .update({ status: "cancelled" })
        .eq("user_id", sub.profile_id)
        .gte("booking_date", today)
        .ilike("notes", "%Monthly plan:%")
        .neq("status", "cancelled");
    }
  }

  const { error } = await supabase
    .from("monthly_subscriptions")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", subscriptionId);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// ── Send manual schedule reminder ────────────────────────────────────────────

export async function sendManualScheduleReminder(
  subscriptionId: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createAdminClient();
  const { data: sub } = await supabase
    .from("monthly_subscriptions")
    .select("customer_name, customer_email, plan_name, status")
    .eq("id", subscriptionId)
    .maybeSingle();

  if (!sub || sub.status !== "active") return { ok: false, error: "Subscription not active." };
  if (!sub.customer_email) return { ok: false, error: "No email on file." };

  const now       = new Date();
  const targetDt  = now.getDate() <= 20
    ? new Date(now.getFullYear(), now.getMonth(), 1)
    : new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const monthStr  = `${targetDt.getFullYear()}-${String(targetDt.getMonth() + 1).padStart(2, "0")}`;
  const monthName = targetDt.toLocaleDateString("en-US", { month: "long" });

  const token        = await signScheduleToken(subscriptionId, monthStr);
  const scheduleLink = `${SITE}/schedule/monthly?token=${token}`;
  const firstName    = (sub.customer_name ?? "there").split(" ")[0];

  const resend = createResend();
  const { error } = await resend.emails.send({
    from:    FROM,
    to:      sub.customer_email,
    subject: `Pick your ${monthName} detail date — Arise And Shine Detailing`,
    html:    getMonthlyScheduleReminderHtml(firstName, sub.plan_name, monthStr, scheduleLink),
    replyTo: "contact@ariseandshinedetailing.com",
  });

  if (error) return { ok: false, error: error.message };

  // Record that reminder was sent
  await supabase.from("monthly_schedule_picks").upsert({
    subscription_id:  subscriptionId,
    month:            monthStr,
    reminder_sent_at: now.toISOString(),
    status:           "pending",
  }, { onConflict: "subscription_id,month", ignoreDuplicates: false });

  return { ok: true };
}

// ── Manually set a subscriber's schedule pick (admin books on their behalf) ──

export async function adminSetSchedulePick(params: {
  subscriptionId: string;
  date: string;       // YYYY-MM-DD
  time12: string;     // e.g. "2:00 PM"
  month: string;      // YYYY-MM
}): Promise<{ ok: boolean; error?: string }> {
  const supabase = createAdminClient();

  const { data: sub } = await supabase
    .from("monthly_subscriptions")
    .select("*")
    .eq("id", params.subscriptionId)
    .maybeSingle();

  if (!sub) return { ok: false, error: "Subscription not found." };

  // Cancel existing booking for this month if rescheduling
  const { data: existingPick } = await supabase
    .from("monthly_schedule_picks")
    .select("booking_id")
    .eq("subscription_id", params.subscriptionId)
    .eq("month", params.month)
    .maybeSingle();

  if (existingPick?.booking_id) {
    await supabase
      .from("bookings")
      .update({ status: "cancelled" })
      .eq("id", existingPick.booking_id);
  }

  // Convert 12h to 24h
  const { to24h } = await import("@/app/actions/bookDetailing");
  const time24 = await to24h(params.time12);

  // Calculate driving distance for mileage tracking
  let distanceMiles: number | null = null;
  if (sub.service_address) {
    const { getTravelFee } = await import("@/lib/travelFee");
    const dist = await getTravelFee(sub.service_address);
    if (dist.ok && dist.distanceMiles > 0) distanceMiles = dist.distanceMiles;
  }

  // Create booking
  const { data: booking, error: bookingErr } = await supabase
    .from("bookings")
    .insert({
      user_id:         sub.profile_id,
      service_id:      null,
      booking_date:    params.date,
      booking_time:    time24,
      status:          "confirmed",
      total_price:     sub.plan_price,
      customer_name:   sub.customer_name,
      customer_email:  sub.customer_email,
      customer_phone:  sub.customer_phone,
      service_address: sub.service_address,
      vehicle_make:    sub.vehicle_make,
      vehicle_model:   sub.vehicle_model,
      vehicle_year:    sub.vehicle_year,
      vehicle_size:    sub.vehicle_size,
      service_name:    sub.plan_name,
      notes:          `Monthly plan: ${sub.plan_name} (${sub.payment_method === "cash" ? "pay at arrival" : "Stripe billing"}) — booked by admin`,
      distance_miles: distanceMiles,
    })
    .select("id")
    .single();

  if (bookingErr || !booking) return { ok: false, error: "Failed to create booking." };

  // Seed booking_vehicles so the admin "Vehicles & Pricing" panel renders.
  try {
    await supabase.from("booking_vehicles").insert({
      booking_id:   booking.id,
      vehicle_id:   null,
      position:     0,
      make:         sub.vehicle_make,
      model:        sub.vehicle_model,
      year:         sub.vehicle_year ? (isNaN(parseInt(String(sub.vehicle_year), 10)) ? null : parseInt(String(sub.vehicle_year), 10)) : null,
      size:         (["small","medium","large","extra_large"].includes(sub.vehicle_size) ? sub.vehicle_size : "medium"),
      service_id:   null,
      service_name: sub.plan_name,
      base_price:   Number(sub.plan_price ?? 0),
      addons_json:  [],
      line_total:   Number(sub.plan_price ?? 0),
      status:       "pending",
    });
  } catch (bvErr) {
    console.error("[scheduleMonthlyBooking] booking_vehicles seed threw:", bvErr);
  }

  // Upsert pick
  await supabase.from("monthly_schedule_picks").upsert({
    subscription_id: params.subscriptionId,
    month:           params.month,
    chosen_date:     params.date,
    chosen_time:     params.time12,
    status:          "pending",
    booking_id:      booking.id,
  }, { onConflict: "subscription_id,month" });

  // Notify customer — fire-and-forget
  if (sub.customer_email) {
    const resend = createResend();
    const firstName = (sub.customer_name ?? "there").trim().split(/\s+/)[0];
    const dateFormatted = new Date(params.date + "T12:00:00").toLocaleDateString("en-US", {
      weekday: "long", month: "long", day: "numeric",
    });
    resend.emails.send({
      from:    FROM,
      to:      sub.customer_email,
      subject: `Confirmed: ${dateFormatted} at ${params.time12} — Arise And Shine Detailing`,
      html:    getMonthlyAppointmentConfirmationHtml({
        firstName,
        planName:       sub.plan_name,
        date:           dateFormatted,
        time:           params.time12,
        serviceAddress: sub.service_address ?? "",
        paymentMethod:  sub.payment_method === "cash" ? "cash" : "stripe",
        reschedulePath: "/protected",
      }),
      replyTo: "contact@ariseandshinedetailing.com",
    }).catch(err => console.error("[adminSetSchedulePick] confirmation email error:", err));
  }

  return { ok: true };
}

// ── Admin: Create subscription over the phone ────────────────────────────────

export async function adminCreateSubscription(params: {
  name: string;
  email: string;
  phone: string;
  planId: string;
  paymentMethod: "cash" | "card";
  vehicleMake: string;
  vehicleModel: string;
  vehicleYear: string;
  vehicleSize: string;
  serviceAddress: string;
}): Promise<{ ok: boolean; checkoutUrl?: string; subscriptionId?: string; error?: string }> {
  const { MONTHLY_PLANS } = await import("@/lib/monthlyPlans");
  const plan = MONTHLY_PLANS.find(p => p.id === params.planId);
  if (!plan) return { ok: false, error: "Invalid plan." };

  const mod = await import("@/app/actions/monthlySubscriptions");

  if (params.paymentMethod === "cash") {
    const result = await mod.createCashMonthlySubscription({
      planId:         plan.id,
      email:          params.email,
      name:           params.name,
      phone:          params.phone,
      vehicleMake:    params.vehicleMake,
      vehicleModel:   params.vehicleModel,
      vehicleYear:    params.vehicleYear,
      vehicleSize:    params.vehicleSize,
      serviceAddress: params.serviceAddress,
    });
    if (!result.success) return { ok: false, error: (result as any).error };
    return { ok: true, subscriptionId: (result as any).subscriptionId };
  } else {
    const result = await mod.createStripeMonthlyCheckout({
      planId:         plan.id,
      email:          params.email,
      name:           params.name,
      phone:          params.phone,
      vehicleMake:    params.vehicleMake,
      vehicleModel:   params.vehicleModel,
      vehicleYear:    params.vehicleYear,
      vehicleSize:    params.vehicleSize,
      serviceAddress: params.serviceAddress,
    });
    if (!result.success) return { ok: false, error: (result as any).error };
    return { ok: true, checkoutUrl: (result as any).checkoutUrl };
  }
}

// ── Admin: Get full booking history for a subscriber ─────────────────────────

export async function getSubscriberHistory(subscriptionId: string) {
  const supabase = createAdminClient();
  const { data: sub } = await supabase
    .from("monthly_subscriptions")
    .select("customer_email")
    .eq("id", subscriptionId)
    .maybeSingle();
  if (!sub?.customer_email) return [];
  const { data } = await supabase
    .from("bookings")
    .select("id, booking_date, booking_time, status, total_price, service_name")
    .eq("customer_email", sub.customer_email)
    .ilike("notes", "%Monthly plan:%")
    .order("booking_date", { ascending: false })
    .limit(36);
  return (data ?? []) as {
    id: string;
    booking_date: string;
    booking_time: string | null;
    status: string;
    total_price: number;
    service_name: string | null;
  }[];
}

// ── Admin: Get available days for booking on subscriber's behalf ──────────────

export async function adminGetScheduleAvailability(
  subscriptionId: string,
  month: string
): Promise<import("@/app/actions/monthlySubscriptions").ScheduleDay[]> {
  const supabase = createAdminClient();
  const { data: sub } = await supabase
    .from("monthly_subscriptions")
    .select("plan_id")
    .eq("id", subscriptionId)
    .maybeSingle();

  if (!sub) return [];

  const { getAvailableDaysForMonth } = await import("@/app/actions/monthlySubscriptions");
  return getAvailableDaysForMonth(month, sub.plan_id);
}
