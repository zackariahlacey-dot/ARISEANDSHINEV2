"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { Resend } from "resend";
import { signScheduleToken } from "@/lib/monthlyToken";
import { getMonthlyScheduleReminderHtml } from "@/emails/MonthlyScheduleReminder";
import Stripe from "stripe";

const FROM  = process.env.EMAIL_FROM ?? "Arise & Shine VT <bookings@ariseandshinevt.com>";
const SITE  = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://ariseandshinevt.com").replace(/\/$/, "");

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
  }
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createAdminClient();
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

  // If cancelling, also cancel Stripe subscription
  if (status === "cancelled") {
    const { data: sub } = await supabase
      .from("monthly_subscriptions")
      .select("stripe_subscription_id, profile_id")
      .eq("id", subscriptionId)
      .maybeSingle();

    if (sub?.stripe_subscription_id && process.env.STRIPE_SECRET_KEY) {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2026-02-25.clover" });
      await stripe.subscriptions.cancel(sub.stripe_subscription_id).catch(console.error);
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

  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error } = await resend.emails.send({
    from:    FROM,
    to:      sub.customer_email,
    subject: `Pick your ${monthName} detail date — Arise & Shine VT`,
    html:    getMonthlyScheduleReminderHtml(firstName, sub.plan_name, monthStr, scheduleLink),
    replyTo: "contact@ariseandshinevt.com",
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

  // Convert 12h to 24h
  const { to24h } = await import("@/app/actions/bookDetailing");
  const time24 = await to24h(params.time12);

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
      notes:           `Monthly plan: ${sub.plan_name} (${sub.payment_method === "cash" ? "pay at arrival" : "Stripe billing"}) — booked by admin`,
    })
    .select("id")
    .single();

  if (bookingErr || !booking) return { ok: false, error: "Failed to create booking." };

  // Upsert pick
  await supabase.from("monthly_schedule_picks").upsert({
    subscription_id: params.subscriptionId,
    month:           params.month,
    chosen_date:     params.date,
    chosen_time:     params.time12,
    status:          "pending",
    booking_id:      booking.id,
  }, { onConflict: "subscription_id,month" });

  return { ok: true };
}
