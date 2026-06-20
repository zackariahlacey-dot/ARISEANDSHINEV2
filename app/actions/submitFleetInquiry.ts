"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { Resend } from "resend";

export type FleetSizeMix = { sedan: number; suv: number; xl: number };

export type FleetInquiryPayload = {
  businessName?: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  serviceAddress?: string;
  vehicleCount: number;
  vehicleMix: FleetSizeMix;
  serviceTier: string;
  estimatedTotal: number;     // dollars (after fleet discount)
  fleetDiscountPct: number;   // 5/10/15/20
  preferredWindow?: string;
  notes?: string;
};

export type FleetInquiryResult =
  | { status: "ok"; inquiryId: string }
  | { status: "error"; message: string };

/** Owner's personal inbox for fleet inquiries — matches the same pattern as
 *  every other admin email in the system. ADMIN_EMAIL env var overrides. */
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "zackariahlacey@gmail.com";
/** Public-facing inbox CC'd on every inquiry so the team has a shared record. */
const PUBLIC_INBOX_CC = "contact@ariseandshinevt.com";
const FROM_EMAIL  = "Arise & Shine VT <noreply@ariseandshinevt.com>";

function formatPhone(raw: string): string {
  const d = raw.replace(/\D/g, "");
  if (d.length === 10) return `(${d.slice(0,3)}) ${d.slice(3,6)}-${d.slice(6)}`;
  if (d.length === 11 && d.startsWith("1")) return `(${d.slice(1,4)}) ${d.slice(4,7)}-${d.slice(7)}`;
  return raw;
}

export async function submitFleetInquiry(payload: FleetInquiryPayload): Promise<FleetInquiryResult> {
  // ── Validate ────────────────────────────────────────────────────────────
  if (!payload.contactName?.trim() || !payload.contactEmail?.trim() || !payload.contactPhone?.trim()) {
    return { status: "error", message: "Please fill in name, email, and phone." };
  }
  if (payload.vehicleCount < 4) {
    return { status: "error", message: "Fleet quotes start at 4 vehicles. For smaller jobs, book directly." };
  }

  // ── Persist ─────────────────────────────────────────────────────────────
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("fleet_inquiries")
    .insert({
      business_name:         payload.businessName?.trim() || null,
      contact_name:          payload.contactName.trim(),
      contact_email:         payload.contactEmail.trim().toLowerCase(),
      contact_phone:         payload.contactPhone.trim(),
      service_address:       payload.serviceAddress?.trim() || null,
      vehicle_count:         payload.vehicleCount,
      vehicle_mix_json:      payload.vehicleMix,
      service_tier:          payload.serviceTier,
      estimated_total_cents: Math.round(payload.estimatedTotal * 100),
      fleet_discount_pct:    payload.fleetDiscountPct,
      preferred_window:      payload.preferredWindow?.trim() || null,
      notes:                 payload.notes?.trim() || null,
      status:                "pending",
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("[submitFleetInquiry] insert error:", error?.message);
    return { status: "error", message: "We couldn't save your inquiry. Please call us at 802-585-5563." };
  }

  // ── Notify admin via email ─────────────────────────────────────────────
  try {
    const apiKey = process.env.RESEND_API_KEY;
    if (apiKey) {
      const resend = new Resend(apiKey);
      const mix = payload.vehicleMix;
      const mixLine = [
        mix.sedan > 0 ? `${mix.sedan} sedan/coupe` : null,
        mix.suv   > 0 ? `${mix.suv} SUV/truck`     : null,
        mix.xl    > 0 ? `${mix.xl} 3-row/work van` : null,
      ].filter(Boolean).join(" · ");

      const html = `
        <div style="font-family:system-ui,-apple-system,sans-serif;max-width:560px;margin:0 auto;color:#111;">
          <div style="background:linear-gradient(135deg,#D4AF37 0%,#F0D060 100%);padding:24px;color:#000;border-radius:10px 10px 0 0;">
            <div style="font-size:11px;font-weight:800;letter-spacing:.18em;text-transform:uppercase;opacity:.7;">New Fleet Inquiry</div>
            <div style="font-size:22px;font-weight:900;margin-top:4px;">${payload.vehicleCount} vehicles · ${payload.serviceTier}</div>
            <div style="font-size:14px;font-weight:700;margin-top:2px;">Estimated $${payload.estimatedTotal.toLocaleString()} after ${payload.fleetDiscountPct}% fleet discount</div>
          </div>
          <div style="background:#fff;border:1px solid #eee;border-top:none;padding:24px;border-radius:0 0 10px 10px;">
            <h2 style="font-size:13px;margin:0 0 8px;color:#666;text-transform:uppercase;letter-spacing:.1em;">Contact</h2>
            <p style="margin:0 0 4px;"><strong>${payload.contactName}</strong>${payload.businessName ? ` — ${payload.businessName}` : ""}</p>
            <p style="margin:0 0 4px;">${payload.contactEmail}</p>
            <p style="margin:0 0 4px;">${formatPhone(payload.contactPhone)}</p>
            ${payload.serviceAddress ? `<p style="margin:0 0 16px;color:#444;">${payload.serviceAddress}</p>` : ""}

            <h2 style="font-size:13px;margin:16px 0 8px;color:#666;text-transform:uppercase;letter-spacing:.1em;">Job</h2>
            <p style="margin:0 0 4px;"><strong>Vehicle mix:</strong> ${mixLine}</p>
            <p style="margin:0 0 4px;"><strong>Service tier:</strong> ${payload.serviceTier}</p>
            ${payload.preferredWindow ? `<p style="margin:0 0 4px;"><strong>Preferred timing:</strong> ${payload.preferredWindow}</p>` : ""}
            ${payload.notes ? `<p style="margin:8px 0 0;color:#444;"><strong>Notes:</strong> ${payload.notes}</p>` : ""}

            <div style="margin-top:24px;padding-top:16px;border-top:1px solid #eee;font-size:12px;color:#888;">
              Review and respond in the admin portal: <a href="https://www.ariseandshinevt.com/admin/fleet" style="color:#D4AF37;">/admin/fleet</a>
            </div>
          </div>
        </div>
      `;

      await resend.emails.send({
        from:    FROM_EMAIL,
        to:      ADMIN_EMAIL,
        cc:      PUBLIC_INBOX_CC,
        subject: `[Fleet] ${payload.vehicleCount} vehicles · ${payload.businessName || payload.contactName}`,
        html,
        replyTo: payload.contactEmail,
      });
    }
  } catch (e) {
    // Email failure shouldn't break the form — the row is already saved.
    console.error("[submitFleetInquiry] email error:", e);
  }

  return { status: "ok", inquiryId: data.id };
}
