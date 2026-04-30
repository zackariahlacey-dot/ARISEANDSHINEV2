"use server";

import { createClient } from "@/lib/supabase/server";
import { Resend } from "resend";

export type PlanType = "interior_only" | "exterior_only" | "full_detail";
export type PlanFrequency = "weekly" | "biweekly" | "monthly";

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
  created_at: string;
  updated_at: string;
}

const FROM_ADDRESS = process.env.EMAIL_FROM ?? "Arise & Shine VT <bookings@ariseandshinevt.com>";
const ADMIN_EMAIL  = "zackariahlacey04@gmail.com";

const PLAN_LABELS: Record<PlanType, string> = {
  interior_only: "Interior Only",
  exterior_only: "Exterior Only",
  full_detail:   "Full Detail",
};

const FREQ_LABELS: Record<PlanFrequency, string> = {
  weekly:    "Weekly",
  biweekly:  "Every 2 Weeks",
  monthly:   "Monthly",
};

// ── Read ─────────────────────────────────────────────────────────────────────

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

// ── Submit ────────────────────────────────────────────────────────────────────

export async function submitPlanRequest(
  req: PlanRequestData
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  // Get name/email from profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, last_name, phone")
    .eq("id", user.id)
    .maybeSingle();

  const name  = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || user.email?.split("@")[0] || "Customer";
  const email = user.email ?? "";
  const phone = (profile as any)?.phone ?? null;

  // Upsert — cancel any prior pending request first
  await supabase
    .from("plan_requests")
    .delete()
    .eq("user_id", user.id)
    .eq("status", "pending");

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

  // Fire-and-forget emails
  sendPlanRequestEmails({ name, email, planLabel, freqLabel, vehicle, address: req.serviceAddress, notes: req.notes }).catch(() => {});

  return { ok: true };
}

async function sendPlanRequestEmails(p: {
  name: string;
  email: string;
  planLabel: string;
  freqLabel: string;
  vehicle: string;
  address: string;
  notes: string;
}) {
  const key = process.env.RESEND_API_KEY;
  if (!key?.trim()) return;
  const resend = new Resend(key);

  const details = `
    <table style="width:100%;border-collapse:collapse;font-family:sans-serif;font-size:14px;color:#e4e4e7;">
      <tr><td style="padding:6px 0;color:#71717a;width:140px">Plan</td><td style="padding:6px 0;font-weight:700;color:#D4AF37">${p.planLabel}</td></tr>
      <tr><td style="padding:6px 0;color:#71717a">Frequency</td><td style="padding:6px 0">${p.freqLabel}</td></tr>
      <tr><td style="padding:6px 0;color:#71717a">Vehicle</td><td style="padding:6px 0">${p.vehicle}</td></tr>
      ${p.address ? `<tr><td style="padding:6px 0;color:#71717a">Address</td><td style="padding:6px 0">${p.address}</td></tr>` : ""}
      ${p.notes ? `<tr><td style="padding:6px 0;color:#71717a">Notes</td><td style="padding:6px 0">${p.notes}</td></tr>` : ""}
    </table>
  `;

  const wrapHtml = (body: string) => `
    <!DOCTYPE html><html><body style="margin:0;padding:0;background:#09090b">
    <div style="max-width:540px;margin:32px auto;background:#18181b;border-radius:16px;border:1px solid rgba(255,255,255,0.08);overflow:hidden">
      <div style="height:3px;background:linear-gradient(90deg,transparent,#D4AF37,transparent)"></div>
      <div style="padding:32px">${body}</div>
    </div></body></html>`;

  // Customer confirmation
  await resend.emails.send({
    from: FROM_ADDRESS,
    to: p.email,
    replyTo: "contact@ariseandshinevt.com",
    subject: "Monthly Plan Request Received — Arise & Shine VT",
    html: wrapHtml(`
      <p style="font-family:sans-serif;color:#D4AF37;font-size:11px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;margin:0 0 8px">Monthly Plan Request</p>
      <h1 style="font-family:sans-serif;font-size:22px;font-weight:900;color:#fff;margin:0 0 6px">We got your request, ${p.name.split(" ")[0]}!</h1>
      <p style="font-family:sans-serif;font-size:14px;color:#71717a;margin:0 0 24px">We'll review your request and reach out within 24 hours to confirm your plan and schedule your first detail.</p>
      ${details}
      <p style="font-family:sans-serif;font-size:12px;color:#52525b;margin:24px 0 0">Questions? Reply to this email or text us directly.</p>
    `),
  });

  // Admin notification
  await resend.emails.send({
    from: FROM_ADDRESS,
    to: ADMIN_EMAIL,
    subject: `New Monthly Plan Request — ${p.name} (${p.planLabel})`,
    html: wrapHtml(`
      <p style="font-family:sans-serif;color:#D4AF37;font-size:11px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;margin:0 0 8px">New Plan Request</p>
      <h1 style="font-family:sans-serif;font-size:22px;font-weight:900;color:#fff;margin:0 0 6px">${p.name}</h1>
      <p style="font-family:sans-serif;font-size:14px;color:#71717a;margin:0 0 24px">${p.email}</p>
      ${details}
      <a href="https://www.ariseandshinevt.com/admin/monthly" style="display:inline-block;margin-top:20px;background:#D4AF37;color:#000;font-family:sans-serif;font-size:13px;font-weight:900;text-decoration:none;padding:12px 24px;border-radius:10px">Review in Admin →</a>
    `),
  });
}

// ── Admin actions ─────────────────────────────────────────────────────────────

export async function adminGetPlanRequests(status?: string) {
  const supabase = await createClient();
  let q = supabase
    .from("plan_requests")
    .select("*")
    .order("created_at", { ascending: false });
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
    .from("plan_requests")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchErr || !req) return { ok: false, error: "Request not found" };

  const { error } = await supabase
    .from("plan_requests")
    .update({ status: decision, admin_notes: adminNotes ?? null, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };

  const pr = req as PlanRequest;
  if (pr.customer_email) {
    sendResponseEmail(pr, decision, adminNotes ?? "").catch(() => {});
  }

  return { ok: true };
}

async function sendResponseEmail(pr: PlanRequest, decision: "approved" | "declined", adminNotes: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key?.trim()) return;
  const resend = new Resend(key);

  const planLabel = PLAN_LABELS[pr.plan_type] + (pr.ultimate_upgrade ? " — Ultimate" : "");
  const firstName = pr.customer_name.split(" ")[0];

  const isApproved = decision === "approved";

  const html = `
    <!DOCTYPE html><html><body style="margin:0;padding:0;background:#09090b">
    <div style="max-width:540px;margin:32px auto;background:#18181b;border-radius:16px;border:1px solid rgba(255,255,255,0.08);overflow:hidden">
      <div style="height:3px;background:linear-gradient(90deg,transparent,${isApproved ? "#22c55e" : "#ef4444"},transparent)"></div>
      <div style="padding:32px">
        <p style="font-family:sans-serif;color:${isApproved ? "#22c55e" : "#ef4444"};font-size:11px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;margin:0 0 8px">
          Monthly Plan ${isApproved ? "Approved" : "Update"}
        </p>
        <h1 style="font-family:sans-serif;font-size:22px;font-weight:900;color:#fff;margin:0 0 6px">
          ${isApproved ? `You're all set, ${firstName}!` : `Hey ${firstName}, about your request…`}
        </h1>
        <p style="font-family:sans-serif;font-size:14px;color:#71717a;margin:0 0 20px">
          ${isApproved
            ? `Your <strong style="color:#D4AF37">${planLabel}</strong> monthly plan has been approved. We'll be in touch shortly to schedule your first detail and lock in your recurring day.`
            : `Unfortunately we're unable to accommodate your <strong style="color:#fff">${planLabel}</strong> monthly plan request at this time.`}
        </p>
        ${adminNotes ? `<div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:14px;margin-bottom:20px"><p style="font-family:sans-serif;font-size:13px;color:#a1a1aa;margin:0">${adminNotes}</p></div>` : ""}
        ${isApproved ? `<a href="https://www.ariseandshinevt.com/protected" style="display:inline-block;background:#D4AF37;color:#000;font-family:sans-serif;font-size:13px;font-weight:900;text-decoration:none;padding:12px 24px;border-radius:10px">View My Dashboard →</a>` : ""}
        <p style="font-family:sans-serif;font-size:12px;color:#52525b;margin:24px 0 0">Questions? Reply to this email or text us directly.</p>
      </div>
    </div></body></html>`;

  await resend.emails.send({
    from: FROM_ADDRESS,
    to: pr.customer_email,
    replyTo: "contact@ariseandshinevt.com",
    subject: isApproved
      ? `Monthly Plan Approved — Arise & Shine VT`
      : `Monthly Plan Request Update — Arise & Shine VT`,
    html,
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
