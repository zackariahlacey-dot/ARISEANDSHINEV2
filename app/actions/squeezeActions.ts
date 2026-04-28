"use server";

import { Resend } from "resend";
import { createAdminClient } from "@/lib/supabase/admin";

const ADMIN_EMAIL  = "zackariahlacey@gmail.com";
const FROM_ADDR    = "Arise & Shine VT <bookings@ariseandshinevt.com>";

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

  const resend = new Resend(process.env.RESEND_API_KEY);

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

  try {
    await resend.emails.send({
      from:    FROM_ADDR,
      to:      ADMIN_EMAIL,
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
    });
  } catch (emailErr) {
    console.error("[squeezeActions] Failed to send admin notification:", emailErr);
  }

  // Customer confirmation
  resend.emails.send({
    from:    FROM_ADDR,
    to:      input.email,
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
  }).catch(() => {});

  return { success: true };
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
