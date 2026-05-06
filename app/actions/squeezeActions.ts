"use server";

import { Resend } from "resend";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendBookingEmail } from "@/app/actions/sendBookingEmail";
import { logError } from "@/app/actions/logError";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "zackariahlacey@gmail.com";
const FROM_ADDR   = process.env.EMAIL_FROM  ?? "Arise & Shine VT <bookings@ariseandshinevt.com>";
const REPLY_TO    = "contact@ariseandshinevt.com";

/**
 * Send a Resend email with retry-on-failure.
 * Resend can throw (network/SDK error) OR return { error } (API rejection) — we
 * treat both as failures and retry with linear backoff.
 */
async function sendEmailWithRetry(
  resend: Resend,
  payload: Parameters<Resend["emails"]["send"]>[0],
  attempts = 2,
): Promise<{ ok: true } | { ok: false; error: string }> {
  let lastErr = "unknown error";
  for (let i = 0; i <= attempts; i++) {
    try {
      const r = await resend.emails.send(payload);
      if (r.error) {
        lastErr = `${r.error.name}: ${r.error.message}`;
      } else {
        return { ok: true };
      }
    } catch (err) {
      lastErr = err instanceof Error ? err.message : String(err);
    }
    if (i < attempts) await new Promise(res => setTimeout(res, 500 * (i + 1)));
  }
  return { ok: false, error: lastErr };
}

export type SqueezeRequest = {
  id: string;
  name: string;
  phone: string;
  email: string;
  service_type: string;
  specific_service: string | null;
  vehicle_info: string | null;
  service_address: string | null;
  contact_preference: string;
  urgency: string;
  available_dates: string;
  notes: string | null;
  status: string;
  created_at: string;
};

export type SqueezeStatus = "pending" | "contacted" | "booked" | "dismissed";

export async function createSqueezeRequest(input: {
  name: string;
  phone: string;
  email: string;
  serviceType: string;
  specificService?: string;
  vehicleInfo?: string;
  serviceAddress?: string;
  contactPreference: string;
  urgency: string;
  availableDates: string;
  notes?: string;
}): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient();

  const { error } = await supabase.from("squeeze_requests").insert({
    name:               input.name,
    phone:              input.phone,
    email:              input.email,
    service_type:       input.serviceType,
    specific_service:   input.specificService  || null,
    vehicle_info:       input.vehicleInfo      || null,
    service_address:    input.serviceAddress   || null,
    contact_preference: input.contactPreference,
    urgency:            input.urgency,
    available_dates:    input.availableDates,
    notes:              input.notes            || null,
  });

  if (error) return { success: false, error: error.message };

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    console.error("[squeezeActions] RESEND_API_KEY missing — admin notification skipped");
    await logError({
      type: "general",
      source: "squeezeActions/createSqueezeRequest",
      message: "RESEND_API_KEY missing — admin not notified of squeeze request",
      details: { name: input.name, phone: input.phone, email: input.email, urgency: input.urgency },
    });
    return { success: true }; // request is still in DB; surface in admin UI
  }

  const resend = new Resend(resendKey);

  const urgencyLabel: Record<string, string> = {
    today:      "TODAY 🔴",
    tomorrow:   "Tomorrow",
    this_week:  "This Week",
    soon:       "Soon (flexible)",
  };

  const serviceLabel: Record<string, string> = {
    auto: "Auto Detailing",
    boat: "Boat Detailing",
    rv:   "RV / Motorhome Detailing",
  };

  const contactLabel: Record<string, string> = {
    call:   "Call preferred",
    text:   "Text preferred",
    either: "Call or Text",
  };

  function row(label: string, value: string, highlight = false): string {
    return `
      <tr style="border-bottom:1px solid #f0f0f0">
        <td style="padding:10px 0;color:#888;width:130px;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;vertical-align:top">${label}</td>
        <td style="padding:10px 0;${highlight ? "font-weight:700;color:#D4AF37" : "color:#111"}">${value}</td>
      </tr>`;
  }

  // ── Admin notification (must reach the inbox — retry on failure) ──────────
  const adminPayload = {
    from:    FROM_ADDR,
    to:      ADMIN_EMAIL,
    replyTo: REPLY_TO,
    subject: `🚨 Squeeze Me In — ${input.name} (${urgencyLabel[input.urgency] ?? input.urgency})`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;color:#111;background:#fff;padding:24px;border-radius:8px">
        <div style="border-left:4px solid #D4AF37;padding-left:16px;margin-bottom:20px">
          <h2 style="color:#D4AF37;margin:0 0 4px;font-size:20px">Squeeze Me In Request</h2>
          <p style="margin:0;color:#888;font-size:13px">Someone needs to get in ASAP</p>
        </div>
        <table style="width:100%;border-collapse:collapse;font-size:14px">
          ${row("Name", `<strong>${input.name}</strong>`)}
          ${row("Phone", `<a href="tel:${input.phone}" style="color:#D4AF37;font-weight:600;text-decoration:none">${input.phone}</a>`)}
          ${row("Email", `<a href="mailto:${input.email}" style="color:#D4AF37;text-decoration:none">${input.email}</a>`)}
          ${row("Contact", contactLabel[input.contactPreference] ?? input.contactPreference)}
          ${row("Service", serviceLabel[input.serviceType] ?? input.serviceType)}
          ${input.specificService ? row("Details", input.specificService) : ""}
          ${input.vehicleInfo ? row("Vehicle / Unit", input.vehicleInfo) : ""}
          ${input.serviceAddress ? row("Location", input.serviceAddress) : ""}
          ${row("Urgency", urgencyLabel[input.urgency] ?? input.urgency, true)}
          ${row("Available", input.availableDates.replace(/\n/g, "<br/>"))}
          ${input.notes ? row("Notes", `<span style="color:#555">${input.notes}</span>`) : ""}
        </table>
        <div style="margin-top:24px;display:flex;gap:12px">
          <a href="https://ariseandshinevt.com/admin/schedule" style="display:inline-block;background:#D4AF37;color:#000;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:700;font-size:13px">
            Open Schedule →
          </a>
          <a href="tel:${input.phone}" style="display:inline-block;background:#f5f5f5;color:#333;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;font-size:13px">
            Call ${input.phone}
          </a>
        </div>
      </div>
    `,
  };

  const adminResult = await sendEmailWithRetry(resend, adminPayload, 2);
  if (!adminResult.ok) {
    console.error("[squeezeActions] Admin notification failed after retries:", adminResult.error);
    // Persist failure so the request shows up in error_logs and can be acted on.
    await logError({
      type: "general",
      source: "squeezeActions/createSqueezeRequest/adminEmail",
      message: `Admin squeeze notification failed: ${adminResult.error}`,
      details: {
        name: input.name,
        phone: input.phone,
        email: input.email,
        urgency: input.urgency,
        serviceType: input.serviceType,
        availableDates: input.availableDates,
      },
    });
  }

  // ── Customer confirmation (best-effort, but log on failure) ──────────────
  const customerPayload = {
    from:    FROM_ADDR,
    to:      input.email,
    replyTo: REPLY_TO,
    subject: "We got your request — Arise & Shine VT",
    html: `
      <div style="font-family:sans-serif;max-width:480px;color:#111;background:#fff;padding:24px;border-radius:8px">
        <h2 style="color:#D4AF37;margin:0 0 12px">Got it, ${input.name.split(" ")[0]}!</h2>
        <p style="color:#444;line-height:1.6;margin:0 0 12px">
          We received your request and will reach out as soon as we can fit you in.
          We&apos;ll contact you ${contactLabel[input.contactPreference] === "Call preferred" ? "by phone" : contactLabel[input.contactPreference] === "Text preferred" ? "by text" : "by call or text"}
          at <strong>${input.phone}</strong> or <strong>${input.email}</strong>.
        </p>
        <p style="color:#444;line-height:1.6;margin:0 0 20px">
          In the meantime, feel free to call or text directly at
          <a href="tel:8025855563" style="color:#D4AF37;font-weight:600">802-585-5563</a>.
        </p>
        <p style="color:#999;font-size:13px;margin:0">— Zack<br/>Arise &amp; Shine VT</p>
      </div>
    `,
  };
  const customerResult = await sendEmailWithRetry(resend, customerPayload, 1);
  if (!customerResult.ok) {
    console.error("[squeezeActions] Customer confirmation failed:", customerResult.error);
  }

  return { success: true };
}

/** Returns up to 3 unique vehicle strings from past bookings for this contact. */
export async function getRecentVehiclesByContact(phone: string, email: string): Promise<string[]> {
  const supabase = createAdminClient();
  const digits   = phone.replace(/\D/g, "");
  const seen     = new Set<string>();
  const results: string[] = [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function collect(query: any) {
    const { data } = await query;
    for (const b of (data ?? [])) {
      const v = [b.vehicle_year, b.vehicle_make, b.vehicle_model].filter(Boolean).join(" ").trim();
      if (v && !seen.has(v.toLowerCase())) { seen.add(v.toLowerCase()); results.push(v); }
      if (results.length >= 3) break;
    }
  }

  const sel = "vehicle_year, vehicle_make, vehicle_model";
  if (digits.length >= 10) {
    await collect(
      supabase.from("bookings").select(sel)
        .eq("customer_phone", digits.slice(0, 10))
        .not("vehicle_make", "is", null)
        .order("created_at", { ascending: false })
        .limit(5)
    );
  }
  if (email.trim() && results.length < 3) {
    await collect(
      supabase.from("bookings").select(sel)
        .ilike("customer_email", email.trim())
        .not("vehicle_make", "is", null)
        .order("created_at", { ascending: false })
        .limit(5)
    );
  }
  return results;
}

export async function getSqueezeRequests(): Promise<SqueezeRequest[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("squeeze_requests")
    .select("*")
    .order("created_at", { ascending: false });
  return (data ?? []) as SqueezeRequest[];
}

export async function updateSqueezeStatus(
  id: string,
  status: SqueezeStatus,
): Promise<{ success: boolean }> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("squeeze_requests")
    .update({ status })
    .eq("id", id);
  return { success: !error };
}

// ── Convert "9:30 AM" → "09:30:00" ───────────────────────────────────────────
function to24h(time12: string): string {
  const m = time12.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!m) return time12;
  let h = parseInt(m[1], 10);
  const min = m[2];
  const ampm = m[3].toUpperCase();
  if (ampm === "PM" && h !== 12) h += 12;
  if (ampm === "AM" && h === 12) h = 0;
  return `${String(h).padStart(2, "0")}:${min}:00`;
}

/** Split "2019 Honda Civic" → { year, make, model }. Safe fallback for empty/null. */
function parseVehicle(v: string | null): { year: string; make: string; model: string } {
  if (!v) return { year: "", make: "", model: "" };
  const parts = v.trim().split(/\s+/);
  const year  = /^(19|20)\d{2}$/.test(parts[0] ?? "") ? parts[0] : "";
  const rest  = year ? parts.slice(1) : parts;
  return { year, make: rest[0] ?? "", model: rest.slice(1).join(" ") };
}

export type ScheduleSqueezeInput = {
  squeezeId: string;
  date: string;     // "YYYY-MM-DD"
  time: string;     // "9:00 AM"
  price: number;
};

export async function scheduleSqueezeRequest(
  input: ScheduleSqueezeInput,
): Promise<{ success: boolean; bookingId?: string; error?: string }> {
  const supabase = createAdminClient();

  // 1. Fetch the squeeze request
  const { data: sq, error: sqErr } = await supabase
    .from("squeeze_requests")
    .select("*")
    .eq("id", input.squeezeId)
    .single();

  if (sqErr || !sq) return { success: false, error: "Squeeze request not found." };

  // 2. Look up service_id by name (best-effort; null is fine)
  let serviceId: string | null = null;
  if (sq.specific_service) {
    const { data: svc } = await supabase
      .from("services")
      .select("id")
      .ilike("name", sq.specific_service.trim())
      .limit(1)
      .maybeSingle();
    serviceId = svc?.id ?? null;
  }

  // 3. Parse vehicle info
  const vehicle = parseVehicle(sq.vehicle_info ?? null);

  // 4. Build notes
  const notesParts = [
    `📋 Scheduled from Squeeze Me In request`,
    sq.urgency ? `⚡ Original urgency: ${sq.urgency}` : null,
    sq.available_dates ? `📅 Customer availability: ${sq.available_dates}` : null,
    sq.contact_preference ? `📞 Contact preference: ${sq.contact_preference}` : null,
    sq.notes ? `💬 Notes: ${sq.notes}` : null,
  ].filter(Boolean).join("\n");

  // 5. Insert booking (snapshot columns only — no profile/vehicle FK required)
  const { data: booking, error: bookingErr } = await supabase
    .from("bookings")
    .insert({
      booking_date:    input.date,
      booking_time:    to24h(input.time),
      status:          "confirmed",
      total_price:     input.price,
      service_id:      serviceId,
      notes:           notesParts,
      customer_name:   sq.name,
      customer_email:  sq.email  || null,
      customer_phone:  sq.phone.replace(/\D/g, "").slice(0, 10),
      service_name:    sq.specific_service ?? (sq.service_type === "boat" ? "Boat Detail" : sq.service_type === "rv" ? "RV Detail" : "Auto Detail"),
      service_address: sq.service_address ?? null,
      vehicle_make:    vehicle.make || null,
      vehicle_model:   vehicle.model || null,
      vehicle_year:    vehicle.year || null,
    })
    .select("id")
    .single();

  if (bookingErr || !booking) {
    console.error("[scheduleSqueezeRequest] booking insert:", bookingErr);
    return { success: false, error: "Could not create booking." };
  }

  // 6. Mark squeeze request as booked + store booking_id
  await supabase
    .from("squeeze_requests")
    .update({ status: "booked", booking_id: booking.id })
    .eq("id", input.squeezeId);

  // 7. Send confirmation email to customer
  if (sq.email?.trim()) {
    await sendBookingEmail({
      customerEmail: sq.email.trim(),
      bookingDetails: {
        customerName:   sq.name,
        customerPhone:  sq.phone,
        customerEmail:  sq.email,
        serviceAddress: sq.service_address ?? undefined,
        serviceName:    sq.specific_service ?? "Detailing",
        vehicleYear:    vehicle.year,
        vehicleMake:    vehicle.make,
        vehicleModel:   vehicle.model,
        bookingDate:    input.date,
        bookingTime:    input.time,
        travelFee:      0,
        totalPrice:     input.price,
      },
      totalPrice: input.price,
    }).catch(err => console.error("[scheduleSqueezeRequest] email:", err));
  }

  // 8. Send admin alert (retry on failure, log to error_logs if it never lands)
  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    const resend = new Resend(resendKey);
    const formattedDate = new Date(input.date + "T12:00:00").toLocaleDateString("en-US", {
      weekday: "long", month: "long", day: "numeric",
    });
    const adminAlert = await sendEmailWithRetry(resend, {
      from:    FROM_ADDR,
      to:      ADMIN_EMAIL,
      replyTo: REPLY_TO,
      subject: `✅ Squeezed In — ${sq.name} · ${formattedDate} at ${input.time}`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;color:#111;background:#fff;padding:24px;border-radius:8px">
          <h2 style="color:#D4AF37;margin:0 0 16px">Squeeze Me In — Scheduled</h2>
          <table style="width:100%;border-collapse:collapse;font-size:14px">
            <tr><td style="padding:8px 0;color:#888;width:110px">Customer</td><td style="font-weight:700">${sq.name}</td></tr>
            <tr><td style="padding:8px 0;color:#888">Phone</td><td><a href="tel:${sq.phone}" style="color:#D4AF37">${sq.phone}</a></td></tr>
            <tr><td style="padding:8px 0;color:#888">Date</td><td>${formattedDate}</td></tr>
            <tr><td style="padding:8px 0;color:#888">Time</td><td>${input.time}</td></tr>
            <tr><td style="padding:8px 0;color:#888">Service</td><td>${sq.specific_service ?? "—"}</td></tr>
            <tr><td style="padding:8px 0;color:#888">Price</td><td style="font-weight:700;color:#D4AF37">$${input.price}</td></tr>
            ${sq.service_address ? `<tr><td style="padding:8px 0;color:#888">Location</td><td>${sq.service_address}</td></tr>` : ""}
          </table>
          <p style="margin-top:20px;font-size:12px;color:#aaa">Confirmation email sent to ${sq.email || "no email on file"}.</p>
        </div>
      `,
    }, 2);
    if (!adminAlert.ok) {
      console.error("[scheduleSqueezeRequest] Admin alert failed after retries:", adminAlert.error);
      await logError({
        type: "general",
        source: "squeezeActions/scheduleSqueezeRequest/adminEmail",
        message: `Squeeze-scheduled admin alert failed: ${adminAlert.error}`,
        details: { customerName: sq.name, bookingId: booking.id, date: input.date, time: input.time },
      });
    }
  }

  return { success: true, bookingId: booking.id };
}
