/**
 * Resend webhook: email.sent / delivered / opened / clicked / bounced /
 * complained / delivery_delayed.
 *
 * Resend signs payloads with the svix protocol — we verify manually rather
 * than pull in the svix package. Each event is persisted to email_events
 * (unique on svix_id so retries can't double-write).
 *
 * Configure: in Resend dashboard add a webhook endpoint
 *   https://YOUR-DOMAIN/api/webhooks/resend
 * and copy the signing secret into RESEND_WEBHOOK_SECRET (env). The secret
 * is the raw `whsec_...` value Resend gives you.
 *
 * Migration: supabase/email_events_2026.sql
 */
import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

const WEBHOOK_SECRET = process.env.RESEND_WEBHOOK_SECRET;

// 5-minute clock-skew tolerance — same window svix uses.
const TIMESTAMP_TOLERANCE_SECONDS = 300;

function verifySvixSignature(opts: {
  body: string;
  svixId: string;
  svixTimestamp: string;
  svixSignature: string;
  secret: string;
}): boolean {
  // Secret format: "whsec_<base64>". Strip the prefix, decode the rest.
  const raw = opts.secret.startsWith("whsec_") ? opts.secret.slice(6) : opts.secret;
  let keyBytes: Buffer;
  try {
    keyBytes = Buffer.from(raw, "base64");
  } catch {
    return false;
  }

  const toSign = `${opts.svixId}.${opts.svixTimestamp}.${opts.body}`;
  const expected = crypto.createHmac("sha256", keyBytes).update(toSign).digest("base64");

  // Header may carry multiple sigs (rotation): "v1,sig1 v1,sig2"
  const sigList = opts.svixSignature.split(" ");
  for (const entry of sigList) {
    const [version, sig] = entry.split(",");
    if (version !== "v1" || !sig) continue;
    if (sig.length !== expected.length) continue;
    if (crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return true;
  }
  return false;
}

export async function POST(req: NextRequest) {
  if (!WEBHOOK_SECRET) {
    console.error("[webhooks/resend] RESEND_WEBHOOK_SECRET is not set — webhook is unsecured");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  const body = await req.text();
  const svixId = req.headers.get("svix-id");
  const svixTimestamp = req.headers.get("svix-timestamp");
  const svixSignature = req.headers.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: "Missing svix headers" }, { status: 400 });
  }

  // Reject stale events to prevent replay
  const ts = Number(svixTimestamp);
  if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > TIMESTAMP_TOLERANCE_SECONDS) {
    return NextResponse.json({ error: "Stale timestamp" }, { status: 400 });
  }

  if (!verifySvixSignature({ body, svixId, svixTimestamp, svixSignature, secret: WEBHOOK_SECRET })) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event: any;
  try {
    event = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const eventType: string = event?.type ?? "unknown";
  const data = event?.data ?? {};
  const occurredAtRaw = event?.created_at ?? data?.created_at ?? null;
  const occurredAt = occurredAtRaw ? new Date(occurredAtRaw) : new Date();

  const recipient = Array.isArray(data?.to) ? data.to[0] : data?.to ?? data?.email ?? null;

  const supabase = createAdminClient();
  const { error } = await supabase.from("email_events").upsert(
    {
      svix_id: svixId,
      event_type: eventType,
      email_id: data?.email_id ?? data?.id ?? null,
      recipient,
      subject: data?.subject ?? null,
      payload: event,
      occurred_at: occurredAt.toISOString(),
    },
    { onConflict: "svix_id" },
  );

  if (error) {
    console.error("[webhooks/resend] DB insert failed:", error.message);
    // Return 500 so Resend retries — we don't want to lose events.
    return NextResponse.json({ error: "Persist failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
