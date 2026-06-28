/**
 * Cron: Reverse cross-sell — emails detailing customers an exterior-site
 * coupon ~14 days after their completed detailing job.
 *
 * Vercel calls this on the schedule defined in vercel.json (daily 14:00
 * UTC). Companion to the existing exterior → detailing cron on the
 * sister site — full bidirectional flywheel runs unattended once both
 * sites are deployed.
 *
 * What it does per run:
 *   1. Find detailing customers whose jobs completed ~14 days ago.
 *   2. Skip anyone we've already cross-sold to exterior in the last 90
 *      days (anti-spam — one offer per customer per direction per quarter).
 *   3. For each remaining candidate:
 *        - INSERT a row into public.cross_sell_events with
 *          from_business='detailing', to_business='exterior',
 *          discount_pct=15, 60-day expiry, unique coupon_code.
 *        - Email the customer with a button linking to the exterior
 *          site at ?coupon=CODE — exterior's existing capture
 *          component auto-applies on landing.
 *
 * Constraints honored:
 *   - cross_sell_events schema untouched — INSERT only.
 *   - No exterior_* tables touched.
 *   - Service-role client throughout (exterior RLS would otherwise
 *     block the insert from this side).
 *   - LIMIT 50 per run keeps a single fire from blasting the list.
 *   - Anti-spam 90-day cooldown enforced in the candidate query.
 *
 * Auth: same CRON_SECRET pattern as every other cron route on the
 * detailing site. Vercel sets the header automatically; manual curl
 * runs need to pass `Authorization: Bearer $CRON_SECRET`.
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Resend } from "resend";
import { getCrossSellExteriorHtml } from "@/emails/CrossSellExterior";
import { logError } from "@/app/actions/logError";

export const dynamic = "force-dynamic";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.EMAIL_FROM ?? "Arise And Shine <bookings@ariseandshinedetailing.com>";
const SUBJECT = "Your car shines — let's make your home match";

// Tunables (env-driven; sensible defaults match the spec).
const DISCOUNT_PCT  = Math.max(5, Math.min(50, Number(process.env.CROSS_SELL_DISCOUNT_PCT) || 15));
const DELAY_DAYS    = Math.max(1, Math.min(60, Number(process.env.CROSS_SELL_DELAY_DAYS)    || 14));
const COOLDOWN_DAYS = 90;
const EXPIRY_DAYS   = 60;
const PER_RUN_CAP   = 50;
// Hard kill switch — set CROSS_SELL_ENABLED=false in env to pause sends
// without removing the Vercel cron entry. Defaults ENABLED.
const ENABLED = String(process.env.CROSS_SELL_ENABLED ?? "true").toLowerCase() !== "false";

// ── Coupon generator ───────────────────────────────────────────────────────
// Visually-distinct alphabet (no 0/O/1/I) — same approach as the gift-card
// codes elsewhere in the codebase. EXT- prefix matches the spec so codes
// look like "EXT-A4B8K".
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function makeCouponCode(): string {
  const bytes = new Uint8Array(7);
  crypto.getRandomValues(bytes);
  let body = "";
  for (let i = 0; i < bytes.length; i++) body += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  return `EXT-${body}`;
}

type Candidate = {
  bookingId: string;
  userId:    string;
  email:     string;
  firstName: string;
};

export async function GET(req: NextRequest) {
  // ── Auth ─────────────────────────────────────────────────────────────────
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!ENABLED) {
    return NextResponse.json({ ok: true, sent: 0, skipped: 0, disabled: true });
  }
  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ ok: false, error: "RESEND_API_KEY not configured" }, { status: 500 });
  }

  const supabase = createAdminClient();
  const today = new Date();
  const startCutoff = new Date(today.getTime() - DELAY_DAYS * 24 * 60 * 60 * 1000);
  const endCutoff   = new Date(today.getTime() - (DELAY_DAYS + 46) * 24 * 60 * 60 * 1000); // ~60d window so we don't miss days the cron failed
  const ymd = (d: Date) => d.toISOString().slice(0, 10);
  const cooldownIso = new Date(today.getTime() - COOLDOWN_DAYS * 24 * 60 * 60 * 1000).toISOString();

  // ── 1. Candidate bookings ────────────────────────────────────────────────
  // PostgREST doesn't support NOT EXISTS subqueries directly, so we do two
  // queries and filter in JS. Both queries use the service-role client so
  // RLS won't trim the result set.
  const { data: doneBookings, error: fetchErr } = await supabase
    .from("bookings")
    .select("id, user_id, booking_date, status, customer_email, customer_name, profiles:user_id(first_name, last_name, email)")
    .in("status", ["completed", "complete", "done"])
    .lte("booking_date", ymd(startCutoff))
    .gt ("booking_date", ymd(endCutoff))
    .not("user_id", "is", null)
    .order("booking_date", { ascending: false })
    .limit(PER_RUN_CAP * 4); // overshoot — many will dedupe

  if (fetchErr) {
    console.error("[cron/cross-sell-to-exterior] candidate fetch failed:", fetchErr.message);
    logError({
      type: "cron",
      source: "cross-sell-to-exterior/fetch",
      message: fetchErr.message,
    });
    return NextResponse.json({ ok: false, error: fetchErr.message }, { status: 500 });
  }
  if (!doneBookings || doneBookings.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, skipped: 0, message: "No completed bookings in window." });
  }

  // Dedup by user — only need one row per customer per run.
  const seenUsers = new Set<string>();
  const candidates: Candidate[] = [];
  for (const b of doneBookings as Array<{
    id: string;
    user_id: string;
    customer_email: string | null;
    customer_name: string | null;
    profiles: { first_name?: string | null; last_name?: string | null; email?: string | null } |
              Array<{ first_name?: string | null; last_name?: string | null; email?: string | null }> | null;
  }>) {
    const uid = b.user_id;
    if (!uid || seenUsers.has(uid)) continue;
    seenUsers.add(uid);
    const prof = Array.isArray(b.profiles) ? b.profiles[0] : b.profiles;
    const email = (b.customer_email ?? prof?.email ?? "").trim().toLowerCase();
    if (!email) continue;
    const firstName =
      (b.customer_name?.trim().split(/\s+/)[0]) ||
      (prof?.first_name?.trim()) ||
      "there";
    candidates.push({
      bookingId: b.id,
      userId:    uid,
      email,
      firstName,
    });
  }

  if (candidates.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, skipped: 0, message: "No eligible customers." });
  }

  // ── 2. Filter by 90-day cooldown ─────────────────────────────────────────
  const userIds = candidates.map((c) => c.userId);
  const { data: recentEvents } = await supabase
    .from("cross_sell_events")
    .select("customer_profile_id")
    .eq("from_business", "detailing")
    .gt("sent_at", cooldownIso)
    .in("customer_profile_id", userIds);

  const blocked = new Set<string>(
    (recentEvents ?? []).map((r: { customer_profile_id: string }) => r.customer_profile_id),
  );

  const eligible = candidates.filter((c) => !blocked.has(c.userId)).slice(0, PER_RUN_CAP);

  // ── 3. Issue + email ─────────────────────────────────────────────────────
  type Result = {
    bookingId: string;
    email:     string;
    status:    "sent" | "skipped_cooldown" | "skipped_no_code" | "error";
    code?:     string;
    error?:    string;
  };
  const results: Result[] = [];
  const blockedRecord: Record<string, true> = {};
  for (const u of blocked) blockedRecord[u] = true;

  // Track per-run skips (customers in our cooldown set).
  for (const c of candidates) {
    if (blockedRecord[c.userId]) {
      results.push({ bookingId: c.bookingId, email: c.email, status: "skipped_cooldown" });
    }
  }

  for (const cand of eligible) {
    // Try up to 5 times to issue a unique coupon code.
    let inserted: { id: string; coupon_code: string; expires_at: string } | null = null;
    for (let attempt = 0; attempt < 5 && !inserted; attempt++) {
      const code = makeCouponCode();
      const expiresAt = new Date(Date.now() + EXPIRY_DAYS * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from("cross_sell_events")
        .insert({
          customer_profile_id: cand.userId,
          from_business:       "detailing",
          to_business:         "exterior",
          coupon_code:         code,
          discount_pct:        DISCOUNT_PCT,
          expires_at:          expiresAt,
          sent_at:             new Date().toISOString(),
        })
        .select("id, coupon_code, expires_at")
        .single();
      if (!error && data) {
        inserted = data as { id: string; coupon_code: string; expires_at: string };
        break;
      }
      // 23505 = unique_violation — try again with a fresh code.
      if (error && (error.code === "23505" || /duplicate key/i.test(error.message))) continue;
      // Any other error — log + bail.
      console.error("[cron/cross-sell-to-exterior] insert failed:", error?.message);
      logError({
        type: "cron",
        source: "cross-sell-to-exterior/insert",
        message: error?.message ?? "unknown insert error",
        details: { userId: cand.userId, email: cand.email },
      });
      results.push({ bookingId: cand.bookingId, email: cand.email, status: "error", error: error?.message });
      break;
    }
    if (!inserted) {
      if (!results.find((r) => r.bookingId === cand.bookingId && r.status === "error")) {
        results.push({ bookingId: cand.bookingId, email: cand.email, status: "skipped_no_code" });
      }
      continue;
    }

    // Email the customer.
    try {
      const html = getCrossSellExteriorHtml({
        firstName:    cand.firstName,
        couponCode:   inserted.coupon_code,
        discountPct:  DISCOUNT_PCT,
        expiresAtIso: inserted.expires_at,
      });
      const { error: sendErr } = await resend.emails.send({
        from:    FROM,
        to:      cand.email,
        subject: SUBJECT,
        html,
        replyTo: "contact@ariseandshinedetailing.com",
      });
      if (sendErr) throw sendErr;
      results.push({ bookingId: cand.bookingId, email: cand.email, status: "sent", code: inserted.coupon_code });
      console.log(`[cron/cross-sell-to-exterior] sent → ${cand.email} (${inserted.coupon_code})`);
    } catch (err) {
      // Email failed AFTER insert — surface but don't try to roll back the
      // cross_sell_events row. The owner gets an alert via logError so we
      // can manually resend if needed; the row sitting there also prevents
      // re-spamming the same customer within the 90-day cooldown.
      const msg = err instanceof Error ? err.message : "Email send failed";
      console.error(`[cron/cross-sell-to-exterior] email failed for ${cand.email}:`, err);
      logError({
        type: "cron",
        source: "cross-sell-to-exterior/email",
        message: msg,
        details: { userId: cand.userId, email: cand.email, code: inserted.coupon_code },
      });
      results.push({ bookingId: cand.bookingId, email: cand.email, status: "error", error: msg, code: inserted.coupon_code });
    }
  }

  const sent    = results.filter((r) => r.status === "sent").length;
  const skipped = results.filter((r) => r.status === "skipped_cooldown" || r.status === "skipped_no_code").length;
  const errors  = results.filter((r) => r.status === "error").length;

  console.log(`[cron/cross-sell-to-exterior] done — sent:${sent} skipped:${skipped} errors:${errors}`);
  return NextResponse.json({ ok: true, sent, skipped, errors, results });
}
