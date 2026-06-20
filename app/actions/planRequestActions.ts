"use server";

import { createClient } from "@/lib/supabase/server";
import { Resend } from "resend";

export type PlanType = "interior_only" | "exterior_only" | "full_detail";
export type PlanFrequency = "weekly" | "biweekly" | "monthly";
export type SchedulePreference = "monthly_pick" | "fixed_day";

export interface PlanRequestData {
  planType: PlanType;
  ultimateUpgrade: boolean;
  vehicleMake: string;
  vehicleModel: string;
  vehicleYear: string;
  vehicleSize: string;
  serviceAddress: string;
  preferredFrequency: PlanFrequency;
  notes: string;
}

export interface PlanRequest {
  id: string;
  user_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  plan_type: PlanType;
  ultimate_upgrade: boolean;
  vehicle_make: string | null;
  vehicle_model: string | null;
  vehicle_year: string | null;
  vehicle_size: string;
  service_address: string | null;
  preferred_frequency: PlanFrequency;
  notes: string | null;
  status: "pending" | "approved" | "declined";
  admin_notes: string | null;
  schedule_preference: SchedulePreference | null;
  fixed_day_of_week: number | null;    // 0=Mon … 4=Fri
  fixed_week_of_month: number | null;  // 1–4
  schedule_confirmed_at: string | null;
  created_at: string;
  updated_at: string;
}

const FROM_ADDRESS = process.env.EMAIL_FROM ?? "Arise And Shine Detailing <bookings@ariseandshinedetailing.com>";
const ADMIN_EMAIL  = "zackariahlacey@gmail.com";
const SITE_URL     = "https://www.ariseandshinedetailing.com";

const PLAN_LABELS: Record<PlanType, string> = {
  interior_only: "Interior Only",
  exterior_only: "Exterior Only",
  full_detail:   "Full Detail",
};

const FREQ_LABELS: Record<PlanFrequency, string> = {
  weekly:   "Weekly",
  biweekly: "Every 2 Weeks",
  monthly:  "Monthly",
};

const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const WEEK_NAMES = ["1st", "2nd", "3rd", "4th"];

function scheduleLabel(pr: PlanRequest): string {
  if (pr.schedule_preference === "monthly_pick") return "Monthly email reminder";
  if (
    pr.schedule_preference === "fixed_day" &&
    pr.fixed_day_of_week !== null &&
    pr.fixed_week_of_month !== null
  ) {
    return `Every ${WEEK_NAMES[pr.fixed_week_of_month - 1]} ${DAY_NAMES[pr.fixed_day_of_week]}`;
  }
  return "Not set";
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function wrapHtml(body: string, accentColor = "#D4AF37") {
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#09090b">
  <div style="max-width:540px;margin:32px auto;background:#18181b;border-radius:16px;border:1px solid rgba(255,255,255,0.08);overflow:hidden">
    <div style="height:3px;background:linear-gradient(90deg,transparent,${accentColor},transparent)"></div>
    <div style="padding:32px">${body}</div>
  </div></body></html>`;
}

// ── Read ──────────────────────────────────────────────────────────────────────

export async function getUserPlanRequest(): Promise<PlanRequest | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("plan_requests")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data as PlanRequest | null;
}

// ── Submit (customer) ────────────────────────────────────────────────────────

export async function submitPlanRequest(
  req: PlanRequestData
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, last_name, phone")
    .eq("id", user.id)
    .maybeSingle();

  const name  = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || user.email?.split("@")[0] || "Customer";
  const email = user.email ?? "";
  const phone = (profile as any)?.phone ?? null;

  await supabase.from("plan_requests").delete().eq("user_id", user.id).eq("status", "pending");

  const { error } = await supabase.from("plan_requests").insert({
    user_id:             user.id,
    customer_name:       name,
    customer_email:      email,
    customer_phone:      phone,
    plan_type:           req.planType,
    ultimate_upgrade:    req.ultimateUpgrade,
    vehicle_make:        req.vehicleMake.trim() || null,
    vehicle_model:       req.vehicleModel.trim() || null,
    vehicle_year:        req.vehicleYear.trim() || null,
    vehicle_size:        req.vehicleSize,
    service_address:     req.serviceAddress.trim() || null,
    preferred_frequency: req.preferredFrequency,
    notes:               req.notes.trim() || null,
    status:              "pending",
  });

  if (error) return { ok: false, error: error.message };

  const planLabel = PLAN_LABELS[req.planType] + (req.ultimateUpgrade ? " — Ultimate" : "");
  const freqLabel = FREQ_LABELS[req.preferredFrequency];
  const vehicle   = [req.vehicleYear, req.vehicleMake, req.vehicleModel].filter(Boolean).join(" ") || "Not specified";

  sendPlanRequestEmails({ name, email, planLabel, freqLabel, vehicle, address: req.serviceAddress, notes: req.notes }).catch(() => {});
  return { ok: true };
}

async function sendPlanRequestEmails(p: {
  name: string; email: string; planLabel: string; freqLabel: string;
  vehicle: string; address: string; notes: string;
}) {
  const key = process.env.RESEND_API_KEY;
  if (!key?.trim()) return;
  const resend = new Resend(key);

  const details = `<table style="width:100%;border-collapse:collapse;font-family:sans-serif;font-size:14px;color:#e4e4e7;">
    <tr><td style="padding:6px 0;color:#71717a;width:140px">Plan</td><td style="padding:6px 0;font-weight:700;color:#D4AF37">${p.planLabel}</td></tr>
    <tr><td style="padding:6px 0;color:#71717a">Frequency</td><td style="padding:6px 0">${p.freqLabel}</td></tr>
    <tr><td style="padding:6px 0;color:#71717a">Vehicle</td><td style="padding:6px 0">${p.vehicle}</td></tr>
    ${p.address ? `<tr><td style="padding:6px 0;color:#71717a">Address</td><td style="padding:6px 0">${p.address}</td></tr>` : ""}
    ${p.notes ? `<tr><td style="padding:6px 0;color:#71717a">Notes</td><td style="padding:6px 0">${p.notes}</td></tr>` : ""}
  </table>`;

  await resend.emails.send({
    from: FROM_ADDRESS, to: p.email, replyTo: "contact@ariseandshinedetailing.com",
    subject: "Monthly Plan Request Received — Arise And Shine Detailing",
    html: wrapHtml(`
      <p style="font-family:sans-serif;color:#D4AF37;font-size:11px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;margin:0 0 8px">Monthly Plan Request</p>
      <h1 style="font-family:sans-serif;font-size:22px;font-weight:900;color:#fff;margin:0 0 6px">We got your request, ${p.name.split(" ")[0]}!</h1>
      <p style="font-family:sans-serif;font-size:14px;color:#71717a;margin:0 0 24px">We'll review it and get back to you within 24 hours.</p>
      ${details}
      <p style="font-family:sans-serif;font-size:12px;color:#52525b;margin:24px 0 0">Questions? Reply to this email or text us directly.</p>
    `),
  });

  await resend.emails.send({
    from: FROM_ADDRESS, to: ADMIN_EMAIL,
    subject: `New Monthly Plan Request — ${p.name} (${p.planLabel})`,
    html: wrapHtml(`
      <p style="font-family:sans-serif;color:#D4AF37;font-size:11px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;margin:0 0 8px">New Plan Request</p>
      <h1 style="font-family:sans-serif;font-size:22px;font-weight:900;color:#fff;margin:0 0 6px">${p.name}</h1>
      <p style="font-family:sans-serif;font-size:14px;color:#71717a;margin:0 0 24px">${p.email}</p>
      ${details}
      <a href="${SITE_URL}/admin/monthly" style="display:inline-block;margin-top:20px;background:#D4AF37;color:#000;font-family:sans-serif;font-size:13px;font-weight:900;text-decoration:none;padding:12px 24px;border-radius:10px">Review in Admin →</a>
    `),
  });
}

// ── Save schedule preference (customer) ───────────────────────────────────────

export async function saveSchedulePreference(params: {
  requestId: string;
  preference: SchedulePreference;
  fixedDayOfWeek?: number;
  fixedWeekOfMonth?: number;
}): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const updates: Record<string, unknown> = {
    schedule_preference:    params.preference,
    schedule_confirmed_at:  new Date().toISOString(),
    updated_at:             new Date().toISOString(),
    fixed_day_of_week:      params.preference === "fixed_day" ? (params.fixedDayOfWeek ?? null) : null,
    fixed_week_of_month:    params.preference === "fixed_day" ? (params.fixedWeekOfMonth ?? null) : null,
  };

  const { data: req, error: fetchErr } = await supabase
    .from("plan_requests")
    .select("*")
    .eq("id", params.requestId)
    .eq("user_id", user.id)
    .single();

  if (fetchErr || !req) return { ok: false, error: "Request not found" };
  if (req.status !== "approved") return { ok: false, error: "Plan not approved yet" };

  const { error } = await supabase
    .from("plan_requests")
    .update(updates)
    .eq("id", params.requestId)
    .eq("user_id", user.id);

  if (error) return { ok: false, error: error.message };

  const pr = { ...req, ...updates } as PlanRequest;
  sendScheduleConfirmationEmail(pr).catch(() => {});
  return { ok: true };
}

async function sendScheduleConfirmationEmail(pr: PlanRequest) {
  const key = process.env.RESEND_API_KEY;
  if (!key?.trim() || !pr.customer_email) return;
  const resend = new Resend(key);

  const planLabel = PLAN_LABELS[pr.plan_type] + (pr.ultimate_upgrade ? " — Ultimate" : "");
  const firstName = pr.customer_name.split(" ")[0];
  const sched     = scheduleLabel(pr);
  const isFixed   = pr.schedule_preference === "fixed_day";

  const bodyDetail = isFixed
    ? `<p style="font-family:sans-serif;font-size:14px;color:#71717a;margin:0 0 20px">
         Your plan is set to run <strong style="color:#fff">${sched}</strong> every month.
         We'll show up on that day — no action needed on your end.
       </p>`
    : `<p style="font-family:sans-serif;font-size:14px;color:#71717a;margin:0 0 20px">
         At the start of each month we'll send you a quick email so you can pick the day that works best that month.
         You can always reply to any email or text us to adjust.
       </p>`;

  await resend.emails.send({
    from: FROM_ADDRESS, to: pr.customer_email, replyTo: "contact@ariseandshinedetailing.com",
    subject: "Your recurring schedule is set — Arise And Shine Detailing",
    html: wrapHtml(`
      <p style="font-family:sans-serif;color:#D4AF37;font-size:11px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;margin:0 0 8px">Schedule Confirmed</p>
      <h1 style="font-family:sans-serif;font-size:22px;font-weight:900;color:#fff;margin:0 0 6px">You're all locked in, ${firstName}!</h1>
      ${bodyDetail}
      <table style="width:100%;border-collapse:collapse;font-family:sans-serif;font-size:14px;margin-bottom:24px">
        <tr><td style="padding:6px 0;color:#71717a;width:120px">Plan</td><td style="color:#D4AF37;font-weight:700">${planLabel}</td></tr>
        <tr><td style="padding:6px 0;color:#71717a">Schedule</td><td style="color:#fff">${sched}</td></tr>
        <tr><td style="padding:6px 0;color:#71717a">Frequency</td><td style="color:#fff">${FREQ_LABELS[pr.preferred_frequency]}</td></tr>
      </table>
      <a href="${SITE_URL}/protected" style="display:inline-block;background:#D4AF37;color:#000;font-family:sans-serif;font-size:13px;font-weight:900;text-decoration:none;padding:12px 24px;border-radius:10px">View My Dashboard →</a>
      <p style="font-family:sans-serif;font-size:12px;color:#52525b;margin:24px 0 0">Questions? Reply here or text us directly.</p>
    `),
  });

  // Admin notification
  await resend.emails.send({
    from: FROM_ADDRESS, to: ADMIN_EMAIL,
    subject: `Schedule set — ${pr.customer_name} (${sched})`,
    html: wrapHtml(`
      <p style="font-family:sans-serif;color:#D4AF37;font-size:11px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;margin:0 0 8px">Schedule Confirmed</p>
      <h1 style="font-family:sans-serif;font-size:22px;font-weight:900;color:#fff;margin:0 0 6px">${pr.customer_name}</h1>
      <p style="font-family:sans-serif;font-size:14px;color:#71717a;margin:0 0 20px">${planLabel} · <strong style="color:#fff">${sched}</strong></p>
      <a href="${SITE_URL}/admin/monthly" style="display:inline-block;background:#D4AF37;color:#000;font-family:sans-serif;font-size:13px;font-weight:900;text-decoration:none;padding:12px 24px;border-radius:10px">View in Admin →</a>
    `),
  });
}

// ── Admin: send monthly reminder ──────────────────────────────────────────────

export async function adminSendMonthlyReminder(
  requestId: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();

  const { data: req, error: fetchErr } = await supabase
    .from("plan_requests")
    .select("*")
    .eq("id", requestId)
    .single();

  if (fetchErr || !req) return { ok: false, error: "Request not found" };

  const pr = req as PlanRequest;
  if (!pr.customer_email) return { ok: false, error: "No email on file" };
  if (pr.schedule_preference !== "monthly_pick") return { ok: false, error: "Only for monthly_pick customers" };

  const key = process.env.RESEND_API_KEY;
  if (!key?.trim()) return { ok: false, error: "Email not configured" };

  const resend = new Resend(key);
  const planLabel = PLAN_LABELS[pr.plan_type] + (pr.ultimate_upgrade ? " — Ultimate" : "");
  const firstName = pr.customer_name.split(" ")[0];
  const month = new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const { error } = await resend.emails.send({
    from: FROM_ADDRESS, to: pr.customer_email, replyTo: "contact@ariseandshinedetailing.com",
    subject: `Pick your ${month} detail day — Arise And Shine Detailing`,
    html: wrapHtml(`
      <p style="font-family:sans-serif;color:#D4AF37;font-size:11px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;margin:0 0 8px">Monthly Scheduling</p>
      <h1 style="font-family:sans-serif;font-size:22px;font-weight:900;color:#fff;margin:0 0 6px">Time to pick your ${month} day, ${firstName}!</h1>
      <p style="font-family:sans-serif;font-size:14px;color:#71717a;margin:0 0 20px">
        Your <strong style="color:#D4AF37">${planLabel}</strong> is ready to schedule for ${month}.
        Just reply to this email with a day that works for you, or text us directly — we'll lock it in.
      </p>
      <p style="font-family:sans-serif;font-size:13px;color:#a1a1aa;margin:0 0 24px">
        We're available <strong style="color:#fff">Monday through Friday</strong>. Morning or afternoon — just let us know your preference.
      </p>
      <a href="${SITE_URL}/protected" style="display:inline-block;background:#D4AF37;color:#000;font-family:sans-serif;font-size:13px;font-weight:900;text-decoration:none;padding:12px 24px;border-radius:10px">View Dashboard →</a>
      <p style="font-family:sans-serif;font-size:12px;color:#52525b;margin:24px 0 0">Reply to this email or text us to schedule.</p>
    `),
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// ── Admin: read / respond / notes ─────────────────────────────────────────────

export async function adminGetPlanRequests(status?: string) {
  const supabase = await createClient();
  let q = supabase.from("plan_requests").select("*").order("created_at", { ascending: false });
  if (status && status !== "all") q = q.eq("status", status);
  const { data, error } = await q;
  if (error) return [];
  return data as PlanRequest[];
}

export async function adminRespondToPlanRequest(
  id: string,
  decision: "approved" | "declined",
  adminNotes?: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();

  const { data: req, error: fetchErr } = await supabase
    .from("plan_requests").select("*").eq("id", id).single();

  if (fetchErr || !req) return { ok: false, error: "Request not found" };

  const { error } = await supabase
    .from("plan_requests")
    .update({ status: decision, admin_notes: adminNotes ?? null, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };

  const pr = req as PlanRequest;
  if (pr.customer_email) sendResponseEmail(pr, decision, adminNotes ?? "").catch(() => {});
  return { ok: true };
}

async function sendResponseEmail(pr: PlanRequest, decision: "approved" | "declined", adminNotes: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key?.trim()) return;
  const resend = new Resend(key);

  const planLabel  = PLAN_LABELS[pr.plan_type] + (pr.ultimate_upgrade ? " — Ultimate" : "");
  const firstName  = pr.customer_name.split(" ")[0];
  const isApproved = decision === "approved";
  const accent     = isApproved ? "#22c55e" : "#ef4444";

  await resend.emails.send({
    from: FROM_ADDRESS, to: pr.customer_email, replyTo: "contact@ariseandshinedetailing.com",
    subject: isApproved
      ? "Monthly Plan Approved — Set Up Your Schedule"
      : "Monthly Plan Request Update — Arise And Shine Detailing",
    html: wrapHtml(`
      <p style="font-family:sans-serif;color:${accent};font-size:11px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;margin:0 0 8px">
        Monthly Plan ${isApproved ? "Approved" : "Update"}
      </p>
      <h1 style="font-family:sans-serif;font-size:22px;font-weight:900;color:#fff;margin:0 0 6px">
        ${isApproved ? `You're approved, ${firstName}!` : `Hey ${firstName}, about your request…`}
      </h1>
      <p style="font-family:sans-serif;font-size:14px;color:#71717a;margin:0 0 20px">
        ${isApproved
          ? `Your <strong style="color:#D4AF37">${planLabel}</strong> plan is confirmed. One last step — head to your dashboard to choose how you'd like to schedule your recurring detail.`
          : `Unfortunately we're unable to accommodate your <strong style="color:#fff">${planLabel}</strong> monthly plan request at this time.`}
      </p>
      ${adminNotes ? `<div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:14px;margin-bottom:20px"><p style="font-family:sans-serif;font-size:13px;color:#a1a1aa;margin:0">${adminNotes}</p></div>` : ""}
      ${isApproved ? `
        <a href="${SITE_URL}/protected" style="display:inline-block;background:#D4AF37;color:#000;font-family:sans-serif;font-size:13px;font-weight:900;text-decoration:none;padding:14px 28px;border-radius:10px">
          Set Up My Schedule →
        </a>
      ` : ""}
      <p style="font-family:sans-serif;font-size:12px;color:#52525b;margin:24px 0 0">Questions? Reply to this email or text us directly.</p>
    `, accent),
  });
}

export async function adminUpdatePlanRequestNotes(
  id: string,
  adminNotes: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("plan_requests")
    .update({ admin_notes: adminNotes, updated_at: new Date().toISOString() })
    .eq("id", id);
  return error ? { ok: false, error: error.message } : { ok: true };
}
