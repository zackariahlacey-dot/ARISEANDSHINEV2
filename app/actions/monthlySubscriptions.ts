"use server";

import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { signInviteToken, signScheduleToken, verifyScheduleToken } from "@/lib/monthlyToken";
import { getPlanById, MONTHLY_PLANS, type MonthlyPlanId } from "@/lib/monthlyPlans";
import { checkSlotConflict, timeToMins, to12h, type BookingSlot } from "@/lib/availability";
import { Resend } from "resend";
import { getMonthlyPlanInviteHtml } from "@/emails/MonthlyPlanInvite";
import { getMonthlyPlanConfirmationHtml } from "@/emails/MonthlyPlanConfirmation";
import { getMonthlyScheduleReminderHtml } from "@/emails/MonthlyScheduleReminder";
import { getMonthlyAppointmentConfirmationHtml } from "@/emails/MonthlyAppointmentConfirmation";

const FROM  = process.env.EMAIL_FROM ?? "Arise & Shine VT <bookings@ariseandshinevt.com>";
const OWNER = process.env.ADMIN_EMAIL ?? "zackariahlacey@gmail.com";
const SITE  = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://ariseandshinevt.com").replace(/\/$/, "");

// ── Types ─────────────────────────────────────────────────────────────────────

export type OnboardPrefill = {
  name: string;
  phone: string;
  vehicleMake: string;
  vehicleModel: string;
  vehicleYear: string;
  vehicleSize: string;
  serviceAddress: string;
};

export type MonthlySubResult =
  | { success: true; checkoutUrl?: string; subscriptionId?: string }
  | { success: false; error: string };

// ── Admin: Send invite email ──────────────────────────────────────────────────

export async function sendMonthlyPlanInvite(profileId: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = createAdminClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, last_name, email, phone")
    .eq("id", profileId)
    .maybeSingle();

  if (!profile?.email) return { ok: false, error: "Client has no email address on file." };

  const token = await signInviteToken(profile.email);
  const link  = `${SITE}/onboard/monthly?token=${token}`;
  const firstName = profile.first_name || "there";

  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error } = await resend.emails.send({
    from: FROM,
    to: profile.email,
    subject: "You're invited to join the Monthly Detail Club — Arise & Shine VT",
    html: getMonthlyPlanInviteHtml(firstName, link),
    replyTo: "contact@ariseandshinevt.com",
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// ── Onboard page: fetch pre-fill data ────────────────────────────────────────

export async function getOnboardPrefill(email: string): Promise<OnboardPrefill> {
  const supabase = createAdminClient();
  const emailLower = email.toLowerCase().trim();

  const [{ data: profile }, { data: lastBooking }] = await Promise.all([
    supabase
      .from("profiles")
      .select("first_name, last_name, phone")
      .eq("email", emailLower)
      .maybeSingle(),
    supabase
      .from("bookings")
      .select("vehicle_make, vehicle_model, vehicle_year, vehicle_size, service_address, customer_name, customer_phone")
      .eq("customer_email", emailLower)
      .neq("status", "cancelled")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const name = lastBooking?.customer_name
    || [profile?.first_name, profile?.last_name].filter(Boolean).join(" ")
    || "";
  const phone = lastBooking?.customer_phone || profile?.phone || "";

  return {
    name,
    phone,
    vehicleMake:    lastBooking?.vehicle_make    || "",
    vehicleModel:   lastBooking?.vehicle_model   || "",
    vehicleYear:    lastBooking?.vehicle_year    || "",
    vehicleSize:    lastBooking?.vehicle_size    || "medium",
    serviceAddress: lastBooking?.service_address || "",
  };
}

// ── Stripe subscription checkout ─────────────────────────────────────────────

export async function createStripeMonthlyCheckout(params: {
  planId: MonthlyPlanId;
  email: string;
  name: string;
  phone: string;
  vehicleMake: string;
  vehicleModel: string;
  vehicleYear: string;
  vehicleSize: string;
  serviceAddress: string;
}): Promise<MonthlySubResult> {
  const plan = getPlanById(params.planId);
  if (!plan) return { success: false, error: "Invalid plan." };

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) return { success: false, error: "Payment not configured." };

  const stripe = new Stripe(stripeKey, { apiVersion: "2026-02-25.clover" });

  // Resolve or create profile
  const supabase = createAdminClient();
  const emailLower = params.email.toLowerCase().trim();
  let profileId: string | null = null;
  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", emailLower)
    .maybeSingle();
  if (existing) {
    profileId = existing.id;
  } else {
    const guestId = crypto.randomUUID();
    const nameParts = params.name.trim().split(/\s+/);
    await supabase.from("profiles").insert({
      id: guestId,
      email: emailLower,
      first_name: nameParts[0] || null,
      last_name: nameParts.slice(1).join(" ") || null,
      phone: params.phone.replace(/\D/g, "").slice(0, 10) || null,
      reward_points: 0,
      lifetime_points: 0,
    });
    profileId = guestId;
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer_email: params.email,
      line_items: [{
        price_data: {
          currency: "usd",
          recurring: { interval: "month" },
          unit_amount: plan.price * 100,
          product_data: {
            name: `${plan.name} — Monthly Detail Plan`,
            description: plan.description,
          },
        },
        quantity: 1,
      }],
      metadata: {
        sessionType:    "monthly_subscription",
        planId:         plan.id,
        planName:       plan.name,
        planPrice:      String(plan.price),
        profileId:      profileId ?? "",
        customerName:   params.name.slice(0, 200),
        customerEmail:  emailLower,
        customerPhone:  params.phone.replace(/\D/g, "").slice(0, 10),
        vehicleMake:    params.vehicleMake.slice(0, 100),
        vehicleModel:   params.vehicleModel.slice(0, 100),
        vehicleYear:    params.vehicleYear.slice(0, 4),
        vehicleSize:    params.vehicleSize.slice(0, 20),
        serviceAddress: params.serviceAddress.slice(0, 499),
      },
      success_url: `${SITE}/onboard/monthly/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${SITE}/onboard/monthly?email=${encodeURIComponent(params.email)}`,
    });
    return { success: true, checkoutUrl: session.url ?? undefined };
  } catch (err) {
    console.error("[createStripeMonthlyCheckout]", err);
    return { success: false, error: err instanceof Error ? err.message : "Checkout failed." };
  }
}

// ── Cash subscription (no Stripe) ────────────────────────────────────────────

export async function createCashMonthlySubscription(params: {
  planId: MonthlyPlanId;
  email: string;
  name: string;
  phone: string;
  vehicleMake: string;
  vehicleModel: string;
  vehicleYear: string;
  vehicleSize: string;
  serviceAddress: string;
}): Promise<MonthlySubResult> {
  const plan = getPlanById(params.planId);
  if (!plan) return { success: false, error: "Invalid plan." };

  const supabase   = createAdminClient();
  const emailLower = params.email.toLowerCase().trim();

  // Resolve or create profile
  let profileId: string | null = null;
  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", emailLower)
    .maybeSingle();
  if (existing) {
    profileId = existing.id;
  } else {
    const guestId  = crypto.randomUUID();
    const nameParts = params.name.trim().split(/\s+/);
    const { data: created } = await supabase.from("profiles").insert({
      id: guestId,
      email: emailLower,
      first_name: nameParts[0] || null,
      last_name: nameParts.slice(1).join(" ") || null,
      phone: params.phone.replace(/\D/g, "").slice(0, 10) || null,
      reward_points: 0,
      lifetime_points: 0,
    }).select("id").single();
    profileId = created?.id ?? guestId;
  }

  const { data: sub, error } = await supabase
    .from("monthly_subscriptions")
    .insert({
      profile_id:     profileId,
      plan_id:        plan.id,
      plan_name:      plan.name,
      plan_price:     plan.cashPrice,
      payment_method: "cash",
      customer_name:  params.name,
      customer_email: emailLower,
      customer_phone: params.phone.replace(/\D/g, "").slice(0, 10),
      vehicle_make:   params.vehicleMake,
      vehicle_model:  params.vehicleModel,
      vehicle_year:   params.vehicleYear,
      vehicle_size:   params.vehicleSize,
      service_address: params.serviceAddress,
      signup_date:    new Date().toISOString().split("T")[0],
      status:         "active",
    })
    .select("id")
    .single();

  if (error || !sub) {
    console.error("[createCashMonthlySubscription] insert error:", error);
    return { success: false, error: "Could not create subscription. Please try again." };
  }

  // Send confirmation emails
  await sendSubscriptionConfirmationEmails({
    subscriptionId: sub.id,
    customerName:   params.name,
    customerEmail:  emailLower,
    planName:       plan.name,
    planPrice:      plan.cashPrice,
    paymentMethod:  "cash",
    vehicleMake:    params.vehicleMake,
    vehicleModel:   params.vehicleModel,
  });

  // Send first-month scheduling reminder immediately
  await sendFirstMonthScheduleReminder(sub.id, params.name, emailLower, plan.name);

  return { success: true, subscriptionId: sub.id };
}

// ── Webhook helper: create subscription from Stripe ───────────────────────────

export async function createMonthlySubscriptionFromWebhook(params: {
  planId: string;
  planName: string;
  planPrice: number;
  profileId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  vehicleMake: string;
  vehicleModel: string;
  vehicleYear: string;
  vehicleSize: string;
  serviceAddress: string;
  stripeSubscriptionId: string | null;
  stripeCustomerId: string | null;
}) {
  const supabase = createAdminClient();
  const { data: sub, error } = await supabase
    .from("monthly_subscriptions")
    .insert({
      profile_id:            params.profileId || null,
      plan_id:               params.planId,
      plan_name:             params.planName,
      plan_price:            params.planPrice,
      payment_method:        "stripe",
      stripe_subscription_id: params.stripeSubscriptionId,
      stripe_customer_id:    params.stripeCustomerId,
      customer_name:         params.customerName,
      customer_email:        params.customerEmail.toLowerCase(),
      customer_phone:        params.customerPhone,
      vehicle_make:          params.vehicleMake,
      vehicle_model:         params.vehicleModel,
      vehicle_year:          params.vehicleYear,
      vehicle_size:          params.vehicleSize,
      service_address:       params.serviceAddress,
      signup_date:           new Date().toISOString().split("T")[0],
      status:                "active",
    })
    .select("id")
    .single();

  if (error) {
    console.error("[createMonthlySubscriptionFromWebhook] insert error:", error);
    return null;
  }

  await sendSubscriptionConfirmationEmails({
    subscriptionId: sub.id,
    customerName:   params.customerName,
    customerEmail:  params.customerEmail,
    planName:       params.planName,
    planPrice:      params.planPrice,
    paymentMethod:  "stripe",
    vehicleMake:    params.vehicleMake,
    vehicleModel:   params.vehicleModel,
  });

  // Send first-month scheduling reminder immediately
  await sendFirstMonthScheduleReminder(sub.id, params.customerName, params.customerEmail, params.planName);

  return sub.id;
}

// ── Shared: send confirmation emails ─────────────────────────────────────────

async function sendSubscriptionConfirmationEmails(params: {
  subscriptionId: string;
  customerName: string;
  customerEmail: string;
  planName: string;
  planPrice: number;
  paymentMethod: "stripe" | "cash";
  vehicleMake: string;
  vehicleModel: string;
}) {
  const resend    = new Resend(process.env.RESEND_API_KEY);
  const firstName = params.customerName.trim().split(/\s+/)[0] || "there";

  await Promise.allSettled([
    // Customer confirmation
    resend.emails.send({
      from:    FROM,
      to:      params.customerEmail,
      subject: `You're in — ${params.planName} monthly plan confirmed!`,
      html:    getMonthlyPlanConfirmationHtml(firstName, params.planName, params.planPrice, params.paymentMethod, params.vehicleMake, params.vehicleModel),
      replyTo: "contact@ariseandshinevt.com",
    }),
    // Owner alert
    resend.emails.send({
      from:    FROM,
      to:      OWNER,
      subject: `New monthly plan subscriber: ${params.customerName} — ${params.planName}`,
      html:    `<p><strong>${params.customerName}</strong> (${params.customerEmail}) just signed up for the <strong>${params.planName}</strong> plan at $${params.planPrice}/mo (${params.paymentMethod}).</p><p>Vehicle: ${params.vehicleMake} ${params.vehicleModel}</p><p>Subscription ID: ${params.subscriptionId}</p>`,
    }),
  ]);
}

// ── Send first-month schedule reminder immediately after signup ───────────────

async function sendFirstMonthScheduleReminder(
  subscriptionId: string,
  customerName: string,
  customerEmail: string,
  planName: string
) {
  try {
    const now       = new Date();
    // Target: current month if before the 25th, otherwise next month
    const targetDt  = now.getDate() <= 25
      ? new Date(now.getFullYear(), now.getMonth(), 1)
      : new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const monthStr  = `${targetDt.getFullYear()}-${String(targetDt.getMonth() + 1).padStart(2, "0")}`;
    const monthName = targetDt.toLocaleDateString("en-US", { month: "long" });

    const token         = await signScheduleToken(subscriptionId, monthStr);
    const scheduleLink  = `${SITE}/schedule/monthly?token=${token}`;
    const firstName     = customerName.trim().split(/\s+/)[0] || "there";
    const resend        = new Resend(process.env.RESEND_API_KEY);

    await resend.emails.send({
      from:    FROM,
      to:      customerEmail,
      subject: `Pick your ${monthName} detail date — Arise & Shine VT`,
      html:    getMonthlyScheduleReminderHtml(firstName, planName, monthStr, scheduleLink),
      replyTo: "contact@ariseandshinevt.com",
    });

    // Record reminder sent
    const supabase = createAdminClient();
    await supabase.from("monthly_schedule_picks").upsert({
      subscription_id:  subscriptionId,
      month:            monthStr,
      reminder_sent_at: now.toISOString(),
      status:           "pending",
    }, { onConflict: "subscription_id,month", ignoreDuplicates: false });
  } catch (err) {
    console.error("[sendFirstMonthScheduleReminder] error:", err);
  }
}

// ── Schedule page: get subscription + available days ─────────────────────────

export type ScheduleSlot = { time24: string; time12: string };
export type ScheduleDay  = { date: string; label: string; slots: ScheduleSlot[] };

export type SchedulePageData = {
  subscription: {
    id: string;
    planName: string;
    planPrice: number;
    paymentMethod: string;
    vehicleMake: string;
    vehicleModel: string;
    vehicleYear: string;
    serviceAddress: string;
    customerName: string;
  };
  month: string;
  existingPick: { chosenDate: string | null; chosenTime: string | null; status: string } | null;
  availableDays: ScheduleDay[];
};

export async function getSchedulePageData(token: string): Promise<SchedulePageData | null> {
  const decoded = await verifyScheduleToken(token);
  if (!decoded) return null;

  const { subscriptionId, month } = decoded;
  const supabase = createAdminClient();

  const [{ data: sub }, { data: pick }] = await Promise.all([
    supabase
      .from("monthly_subscriptions")
      .select("id, plan_id, plan_name, plan_price, payment_method, vehicle_make, vehicle_model, vehicle_year, service_address, customer_name, status")
      .eq("id", subscriptionId)
      .maybeSingle(),
    supabase
      .from("monthly_schedule_picks")
      .select("chosen_date, chosen_time, status")
      .eq("subscription_id", subscriptionId)
      .eq("month", month)
      .maybeSingle(),
  ]);

  if (!sub || sub.status !== "active") return null;

  const availableDays = await getAvailableDaysForMonth(month, sub.plan_id);

  return {
    subscription: {
      id:             sub.id,
      planName:       sub.plan_name,
      planPrice:      sub.plan_price,
      paymentMethod:  sub.payment_method,
      vehicleMake:    sub.vehicle_make   || "",
      vehicleModel:   sub.vehicle_model  || "",
      vehicleYear:    sub.vehicle_year   || "",
      serviceAddress: sub.service_address || "",
      customerName:   sub.customer_name  || "",
    },
    month,
    existingPick: pick
      ? { chosenDate: pick.chosen_date, chosenTime: pick.chosen_time, status: pick.status }
      : null,
    availableDays,
  };
}

export async function getAvailableDaysForMonth(month: string, planId: string): Promise<ScheduleDay[]> {
  const { MONTHLY_PLAN_DURATIONS } = await import("@/lib/monthlyPlans");
  const planNames: Record<string, string> = {
    interior_refresh: "Interior Refresh",
    full_maintenance: "Full Maintenance",
  };
  const planName     = planNames[planId] || "Interior Refresh";
  const durationMins = MONTHLY_PLAN_DURATIONS[planName] ?? 90;

  const supabase = createAdminClient();
  const [ohResult, blockedResult] = await Promise.all([
    supabase.from("operating_hours").select("*"),
    supabase.from("blocked_dates").select("blocked_date"),
  ]);

  const operatingHours: any[] = ohResult.data ?? [];
  const blockedSet = new Set<string>((blockedResult.data ?? []).map((r: any) => r.blocked_date as string));

  // ── FIX: Batch-fetch ALL bookings for this month in one query (was N+1) ────
  const monthStart = `${month}-01`;
  const [y, mo]    = month.split("-").map(Number);
  const lastDay    = new Date(y, mo, 0).getDate();
  const monthEnd   = `${month}-${String(lastDay).padStart(2, "0")}`;

  const { data: monthBookingsRaw } = await supabase
    .from("bookings")
    .select("booking_date, booking_time, service_name, vehicle_size, status, duration_override, services(name)")
    .gte("booking_date", monthStart)
    .lte("booking_date", monthEnd)
    .neq("status", "cancelled")
    .neq("status", "no-show");

  // Group bookings by date — prefer direct service_name, fall back to services join
  const bookingsByDate = new Map<string, BookingSlot[]>();
  for (const b of monthBookingsRaw ?? []) {
    const key = b.booking_date as string;
    if (!bookingsByDate.has(key)) bookingsByDate.set(key, []);
    const directName = (b as any).service_name as string | null | undefined;
    const s = (b as any).services;
    const joinedName =
      s == null ? null
      : Array.isArray(s) ? (s[0] as { name?: string } | undefined)?.name ?? null
      : (s as { name?: string }).name ?? null;
    const override = (b as any).duration_override;
    bookingsByDate.get(key)!.push({
      booking_time:        b.booking_time ?? "00:00",
      service_name:        directName ?? joinedName,
      vehicle_size:        b.vehicle_size ?? null,
      status:              b.status ?? "confirmed",
      total_duration_mins: override != null ? override : undefined,
    });
  }
  // ─────────────────────────────────────────────────────────────────────────

  const DEFAULT_HOURS: Record<number, { start: string; end: string } | null> = {
    0: null,
    1: { start: "09:30", end: "18:00" },
    2: { start: "09:30", end: "18:00" },
    3: { start: "09:30", end: "18:00" },
    4: { start: "09:30", end: "18:00" },
    5: { start: "09:30", end: "18:00" },
    6: null,
  };

  const OVERTIME_GRACE = 30;
  const now       = new Date();
  const todayStr  = now.toISOString().slice(0, 10);

  // ── FIX: Loop over the full target month (not just 35 days from today) ───
  const results: ScheduleDay[] = [];
  for (let day = 1; day <= lastDay; day++) {
    const d       = new Date(y, mo - 1, day);
    const dateStr = d.toISOString().slice(0, 10);

    // Skip past dates
    if (dateStr < todayStr) continue;
    if (blockedSet.has(dateStr)) continue;

    const dow = d.getDay();
    const m   = d.getMonth() + 1;
    const overrideRow = operatingHours.find((h: any) => h.month === m && h.day_of_week === dow);
    const defaultRow  = operatingHours.find((h: any) => (h.month == null) && h.day_of_week === dow);
    const row = overrideRow ?? defaultRow;

    let dayStart: number, dayEnd: number;
    if (row) {
      if (!row.is_open) continue;
      dayStart = timeToMins(row.start_time ?? "08:00");
      dayEnd   = timeToMins(row.end_time   ?? "18:00");
    } else {
      const def = DEFAULT_HOURS[dow];
      if (!def) continue;
      dayStart = timeToMins(def.start);
      dayEnd   = timeToMins(def.end);
    }

    const existingBookings: BookingSlot[] = bookingsByDate.get(dateStr) ?? [];

    const slots: ScheduleSlot[] = [];
    const interval = 60;
    for (let mins = dayStart; mins + durationMins <= dayEnd + OVERTIME_GRACE; mins += interval) {
      if (dateStr === todayStr && mins <= now.getHours() * 60 + now.getMinutes()) continue;
      if (!checkSlotConflict(existingBookings, mins, durationMins)) {
        const h  = Math.floor(mins / 60);
        const mn = mins % 60;
        const time24 = `${String(h).padStart(2, "0")}:${String(mn).padStart(2, "0")}`;
        slots.push({ time24, time12: to12h(time24) });
      }
    }

    if (slots.length > 0) {
      const diff  = Math.round((d.getTime() - new Date(todayStr).getTime()) / 86400000);
      const label = diff === 0 ? "Today" : diff === 1 ? "Tomorrow"
        : d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
      results.push({ date: dateStr, label, slots });
    }
  }

  return results;
}

// ── Submit schedule pick ──────────────────────────────────────────────────────

export async function submitSchedulePick(params: {
  subscriptionId: string;
  month: string;
  date: string;
  time24: string;
  time12: string;
}): Promise<{ ok: boolean; error?: string }> {
  const supabase = createAdminClient();

  // Fetch subscription
  const { data: sub } = await supabase
    .from("monthly_subscriptions")
    .select("*")
    .eq("id", params.subscriptionId)
    .eq("status", "active")
    .maybeSingle();

  if (!sub) return { ok: false, error: "Subscription not found or inactive." };

  const plan = getPlanById(sub.plan_id);
  const durationMins = plan?.durationMins ?? 90;

  // Double-check availability — use the actual vehicle size, not hardcoded "medium"
  const { checkAvailability } = await import("@/app/actions/bookDetailing");
  const vehicleSize = (sub.vehicle_size as string) || "medium";
  const available = await checkAvailability(params.date, params.time12, sub.plan_name, vehicleSize, durationMins);
  if (!available) return { ok: false, error: "That time slot was just taken. Please pick another." };

  // Find or create profile
  let profileId = sub.profile_id;
  if (!profileId) {
    const { data: prof } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", sub.customer_email)
      .maybeSingle();
    profileId = prof?.id ?? null;
  }

  // Convert time to 24h for DB
  const { to24h } = await import("@/app/actions/bookDetailing");
  const bookingTime24 = await to24h(params.time12);

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
      user_id:         profileId,
      service_id:      null,
      booking_date:    params.date,
      booking_time:    bookingTime24,
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
      notes:          `Monthly plan: ${sub.plan_name} (${sub.payment_method === "cash" ? "pay at arrival" : "Stripe billing"})`,
      distance_miles: distanceMiles,
    })
    .select("id")
    .single();

  if (bookingErr || !booking) {
    console.error("[submitSchedulePick] booking insert error:", bookingErr);
    return { ok: false, error: "Could not create booking. Please try again." };
  }

  // Upsert schedule pick
  const { error: pickErr } = await supabase
    .from("monthly_schedule_picks")
    .upsert({
      subscription_id: params.subscriptionId,
      month:           params.month,
      chosen_date:     params.date,
      chosen_time:     params.time12,
      status:          "pending",
      booking_id:      booking.id,
    }, { onConflict: "subscription_id,month" });

  if (pickErr) {
    console.error("[submitSchedulePick] pick upsert error:", pickErr);
  }

  // Award loyalty points: 1 pt per $1 of plan price
  if (profileId && sub.plan_price > 0) {
    const pts = Math.floor(sub.plan_price);
    const { data: prof } = await supabase
      .from("profiles")
      .select("reward_points, lifetime_points")
      .eq("id", profileId)
      .maybeSingle();
    if (prof && typeof prof.reward_points === "number") {
      await supabase
        .from("profiles")
        .update({
          reward_points:   prof.reward_points   + pts,
          lifetime_points: (prof.lifetime_points ?? 0) + pts,
        })
        .eq("id", profileId);
      await supabase.from("point_transactions").insert({
        user_id:     profileId,
        amount:      pts,
        description: `Earned from ${sub.plan_name} (monthly)`,
      });
    }
  }

  // Send confirmation email to customer
  if (sub.customer_email) {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const firstName = (sub.customer_name ?? "there").trim().split(/\s+/)[0];
    const dateFormatted = new Date(params.date + "T12:00:00").toLocaleDateString("en-US", {
      weekday: "long", month: "long", day: "numeric",
    });
    resend.emails.send({
      from:    FROM,
      to:      sub.customer_email,
      subject: `Confirmed: ${dateFormatted} at ${params.time12} — Arise & Shine VT`,
      html:    getMonthlyAppointmentConfirmationHtml({
        firstName,
        planName:       sub.plan_name,
        date:           dateFormatted,
        time:           params.time12,
        serviceAddress: sub.service_address ?? "",
        paymentMethod:  sub.payment_method === "cash" ? "cash" : "stripe",
        reschedulePath: "/protected",
      }),
      replyTo: "contact@ariseandshinevt.com",
    }).catch(err => console.error("[submitSchedulePick] confirmation email error:", err));
  }

  return { ok: true };
}

// ── Schedule page: authenticated dashboard path (no token needed) ─────────────

export async function getSchedulePageDataBySubId(
  subscriptionId: string,
  userId: string,
  month: string
): Promise<SchedulePageData | null> {
  const supabase = createAdminClient();

  const [{ data: sub }, { data: pick }] = await Promise.all([
    supabase
      .from("monthly_subscriptions")
      .select("id, plan_id, plan_name, plan_price, payment_method, vehicle_make, vehicle_model, vehicle_year, service_address, customer_name, status")
      .eq("id", subscriptionId)
      .eq("profile_id", userId)
      .eq("status", "active")
      .maybeSingle(),
    supabase
      .from("monthly_schedule_picks")
      .select("chosen_date, chosen_time, status")
      .eq("subscription_id", subscriptionId)
      .eq("month", month)
      .maybeSingle(),
  ]);

  if (!sub) return null;

  const availableDays = await getAvailableDaysForMonth(month, sub.plan_id);

  return {
    subscription: {
      id:             sub.id,
      planName:       sub.plan_name,
      planPrice:      sub.plan_price,
      paymentMethod:  sub.payment_method,
      vehicleMake:    sub.vehicle_make   || "",
      vehicleModel:   sub.vehicle_model  || "",
      vehicleYear:    sub.vehicle_year   || "",
      serviceAddress: sub.service_address || "",
      customerName:   sub.customer_name  || "",
    },
    month,
    existingPick: pick
      ? { chosenDate: pick.chosen_date, chosenTime: pick.chosen_time, status: pick.status }
      : null,
    availableDays,
  };
}

// ── Dashboard: get active subscription + this month's pick ───────────────────

export async function getMyActiveSubscription(userId: string) {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("monthly_subscriptions")
    .select("id, plan_id, plan_name, plan_price, payment_method, status, signup_date, vehicle_make, vehicle_model")
    .eq("profile_id", userId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return null;

  // Scheduling target month: current if on or before the 25th, otherwise next month.
  // Must match the ≤25 cutoff used in sendFirstMonthScheduleReminder.
  const now = new Date();
  const useDate = now.getDate() <= 25
    ? new Date(now.getFullYear(), now.getMonth(), 1)
    : new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const scheduleMonth = `${useDate.getFullYear()}-${String(useDate.getMonth() + 1).padStart(2, "0")}`;

  const { data: pick } = await supabase
    .from("monthly_schedule_picks")
    .select("chosen_date, chosen_time, status, month")
    .eq("subscription_id", data.id)
    .eq("month", scheduleMonth)
    .maybeSingle();

  return { ...data, thisMonthPick: pick ?? null, scheduleMonth };
}

// ── Dashboard: past monthly visit history ─────────────────────────────────────

export async function getMyMonthlyHistory(userId: string) {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("bookings")
    .select("id, booking_date, booking_time, service_name, total_price, status")
    .eq("user_id", userId)
    .ilike("notes", "%Monthly plan:%")
    .order("booking_date", { ascending: false })
    .limit(24);
  return (data ?? []) as {
    id: string;
    booking_date: string;
    booking_time: string | null;
    service_name: string | null;
    total_price: number;
    status: string;
  }[];
}

// ── Cancel subscription ───────────────────────────────────────────────────────

export async function cancelMySubscription(subscriptionId: string, userId: string): Promise<{ ok: boolean }> {
  const supabase = createAdminClient();

  // Verify ownership
  const { data: sub } = await supabase
    .from("monthly_subscriptions")
    .select("id, stripe_subscription_id, profile_id")
    .eq("id", subscriptionId)
    .eq("profile_id", userId)
    .maybeSingle();

  if (!sub) return { ok: false };

  // Cancel Stripe subscription if present
  if (sub.stripe_subscription_id) {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (stripeKey) {
      const stripe = new Stripe(stripeKey, { apiVersion: "2026-02-25.clover" });
      await stripe.subscriptions.cancel(sub.stripe_subscription_id).catch(console.error);
    }
  }

  const today = new Date().toISOString().slice(0, 10);

  // Cancel the subscription row
  await supabase
    .from("monthly_subscriptions")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("id", subscriptionId);

  // ── FIX: Also cancel any future bookings tied to this subscription ────────
  // We match on the notes field since we don't store subscription_id on bookings.
  // This is a best-effort approach; misses edge cases but covers the common path.
  await supabase
    .from("bookings")
    .update({ status: "cancelled" })
    .eq("user_id", userId)
    .gte("booking_date", today)
    .ilike("notes", "%Monthly plan:%")
    .neq("status", "cancelled");

  return { ok: true };
}
