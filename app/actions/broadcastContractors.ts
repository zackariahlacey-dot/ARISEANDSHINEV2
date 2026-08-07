"use server";

import { headers } from "next/headers";
import { createResend } from "@/lib/mailer";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const FROM = process.env.EMAIL_FROM ?? "Arise And Shine Detailing <bookings@ariseandshinedetailing.com>";

async function requireAdmin(): Promise<{ ok: true; userId: string; ip: string | null } | { ok: false; error: string }> {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const admin = createAdminClient();
  const { data: row } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  const isAdminRole = ((row as { role?: string } | null)?.role ?? "").toLowerCase() === "admin";
  const allowlist = (process.env.ADMIN_EMAILS ?? process.env.ADMIN_EMAIL ?? "zackariahlacey@gmail.com")
    .toLowerCase().split(",").map(s => s.trim()).filter(Boolean);
  const emailMatch = !!user.email && allowlist.includes(user.email.toLowerCase());
  if (!isAdminRole && !emailMatch) return { ok: false, error: "Admin only." };

  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? h.get("x-real-ip") ?? "").split(",")[0]?.trim() || null;
  return { ok: true, userId: user.id, ip };
}

export type BroadcastTarget = "active" | "active_and_paused" | "all";

export type BroadcastPreview = {
  recipients: Array<{ contractorId: string; name: string; email: string }>;
  count: number;
};

export async function previewBroadcastRecipients(target: BroadcastTarget): Promise<BroadcastPreview> {
  const auth = await requireAdmin();
  if (!auth.ok) return { recipients: [], count: 0 };

  const admin = createAdminClient();
  let q = admin
    .from("profiles")
    .select("id, first_name, last_name, email, employment_status")
    .eq("role", "contractor")
    .not("email", "is", null);
  if (target === "active") q = q.eq("employment_status", "active");
  if (target === "active_and_paused") q = q.in("employment_status", ["active", "paused"]);

  const { data } = await q;
  const rows = (data ?? []).filter((r: any) => !!r.email);
  return {
    recipients: rows.map((r: any) => ({
      contractorId: r.id,
      name: `${r.first_name ?? ""} ${r.last_name ?? ""}`.trim() || "Contractor",
      email: r.email as string,
    })),
    count: rows.length,
  };
}

/**
 * Send a broadcast email to every contractor in the target set. Each
 * message is sent individually (so no recipient sees the others' addresses)
 * with the body lightly personalized via {{first_name}}.
 */
export async function broadcastToContractors(args: {
  target: BroadcastTarget;
  subject: string;
  body: string;
}): Promise<{ ok: boolean; sent: number; failed: number; error?: string }> {
  const auth = await requireAdmin();
  if (!auth.ok) return { ok: false, sent: 0, failed: 0, error: auth.error };

  const cleanSubject = args.subject.trim();
  const cleanBody = args.body.trim();
  if (cleanSubject.length < 3) return { ok: false, sent: 0, failed: 0, error: "Subject is too short." };
  if (cleanBody.length < 10) return { ok: false, sent: 0, failed: 0, error: "Message is too short." };
  if (!process.env.RESEND_API_KEY) return { ok: false, sent: 0, failed: 0, error: "Email is not configured." };

  const preview = await previewBroadcastRecipients(args.target);
  if (preview.count === 0) return { ok: true, sent: 0, failed: 0, error: "No contractors match the chosen target." };

  const resend = createResend();
  let sent = 0;
  let failed = 0;

  for (const r of preview.recipients) {
    const firstName = r.name.split(/\s+/)[0] ?? "there";
    const personalized = cleanBody.replace(/\{\{\s*first_name\s*\}\}/gi, firstName);
    const html = broadcastHtml({ firstName, bodyText: personalized });
    try {
      const res = await resend.emails.send({
        from: FROM,
        to: r.email,
        replyTo: "contact@ariseandshinedetailing.com",
        subject: cleanSubject,
        html,
      });
      if ((res as any)?.error) {
        failed += 1;
        console.error("[broadcastToContractors] send error for", r.email, (res as any).error);
      } else {
        sent += 1;
      }
    } catch (err) {
      failed += 1;
      console.error("[broadcastToContractors]", r.email, err);
    }
  }

  // Audit log
  try {
    const admin = createAdminClient();
    await admin.from("admin_audit_log").insert({
      admin_id: auth.userId,
      action: "broadcast_contractors",
      target_table: "profiles",
      target_id: null,
      payload: {
        target: args.target,
        subject: cleanSubject,
        recipient_count: preview.count,
        sent,
        failed,
      },
      ip_address: auth.ip,
    });
  } catch {}

  return { ok: true, sent, failed };
}

function broadcastHtml({ firstName, bodyText }: { firstName: string; bodyText: string }): string {
  const escaped = bodyText
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br/>");
  const escName = firstName.replace(/[<>&"']/g, "");
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px;">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
        <tr><td style="background:#0a0a0a;padding:24px 28px;border-radius:14px 14px 0 0;">
          <p style="color:#d4af37;font-size:13px;font-weight:900;margin:0;letter-spacing:0.18em;text-transform:uppercase;">Arise And Shine Detailing</p>
          <p style="color:#888;font-size:10px;margin:4px 0 0;letter-spacing:0.15em;text-transform:uppercase;">Contractor update</p>
        </td></tr>
        <tr><td style="background:#fff;padding:26px 28px;border-radius:0 0 14px 14px;">
          <p style="font-size:14px;color:#333;margin:0 0 14px;">Hi ${escName},</p>
          <div style="font-size:14px;color:#333;line-height:1.65;">${escaped}</div>
          <p style="font-size:12px;color:#666;margin:24px 0 0;">— Arise And Shine Detailing</p>
        </td></tr>
      </table>
    </td></tr></table>
  </body></html>`;
}
