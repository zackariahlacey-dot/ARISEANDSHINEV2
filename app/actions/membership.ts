"use server";

import Stripe from "stripe";
import { createResend } from "@/lib/mailer";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  MEMBERSHIP_PRICE_USD,
  MEMBERSHIP_CREDIT_USD,
  MEMBERSHIP_PRICE_CENTS,
  MEMBERSHIP_CREDIT_CENTS,
  MEMBERSHIP_TIER,
  type ActiveMembership,
} from "@/lib/membership";

const ADMIN_EMAIL  = process.env.ADMIN_EMAIL ?? "zackariahlacey@gmail.com";
const PUBLIC_INBOX = "contact@ariseandshinedetailing.com";
const FROM_EMAIL   = "Arise And Shine Detailing <noreply@ariseandshinedetailing.com>";

async function sendMembershipAdminAlert(args: {
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  amountPaidCents: number;
  membershipId: string;
  expiresAt: Date;
}) {
  try {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) return;
    const resend = createResend();
    const html = `
      <div style="font-family:system-ui,-apple-system,sans-serif;max-width:560px;margin:0 auto;color:#111;">
        <div style="background:linear-gradient(135deg,#D4AF37 0%,#F0D060 100%);padding:24px;color:#000;border-radius:10px 10px 0 0;">
          <div style="font-size:11px;font-weight:800;letter-spacing:.18em;text-transform:uppercase;opacity:.75;">New Premium Member</div>
          <div style="font-size:22px;font-weight:900;margin-top:4px;">$${(args.amountPaidCents / 100).toFixed(0)} Annual Membership</div>
          <div style="font-size:13px;font-weight:600;margin-top:2px;opacity:.85;">$${MEMBERSHIP_CREDIT_USD} credit · expires ${args.expiresAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</div>
        </div>
        <div style="background:#fff;border:1px solid #eee;border-top:none;padding:24px;border-radius:0 0 10px 10px;">
          <h2 style="font-size:13px;margin:0 0 8px;color:#666;text-transform:uppercase;letter-spacing:.1em;">Customer</h2>
          <p style="margin:0 0 4px;"><strong>${args.customerName ?? "Unknown"}</strong></p>
          ${args.customerEmail ? `<p style="margin:0 0 4px;">${args.customerEmail}</p>` : ""}
          ${args.customerPhone ? `<p style="margin:0 0 4px;">${args.customerPhone}</p>` : ""}
          <div style="margin-top:24px;padding-top:16px;border-top:1px solid #eee;font-size:12px;color:#888;">
            Membership ID: <code>${args.membershipId}</code>
          </div>
        </div>
      </div>
    `;
    await resend.emails.send({
      from:    FROM_EMAIL,
      to:      ADMIN_EMAIL,
      cc:      PUBLIC_INBOX,
      subject: `[Membership] ${args.customerName ?? "New member"} · $${(args.amountPaidCents / 100).toFixed(0)}`,
      html,
      replyTo: args.customerEmail ?? undefined,
    });
  } catch (e) {
    // Email failure shouldn't break the webhook — membership row is already saved.
    console.error("[sendMembershipAdminAlert]", e);
  }
}

/** Returns the current user's active membership (or null). */
export async function getMyActiveMembership(): Promise<ActiveMembership | null> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user?.id) return null;

  const { data } = await supabase
    .from("memberships")
    .select("id, tier, status, started_at, expires_at, credit_balance_cents, credit_total_cents")
    .eq("profile_id", auth.user.id)
    .eq("status", "active")
    .gt("expires_at", new Date().toISOString())
    .order("expires_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (data as ActiveMembership) ?? null;
}

/** Initiates Stripe checkout for the Premium Annual Membership.
 *  Requires the user to be logged in — checkout will fail otherwise. */
export async function createMembershipCheckout(input: {
  successUrl: string;
  cancelUrl: string;
}): Promise<{ success: true; checkoutUrl: string } | { success: false; error: string }> {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) return { success: false, error: "Payment not configured." };

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user?.id) {
    return { success: false, error: "You must be signed in to purchase a membership." };
  }

  // Block double-purchase if customer already has an active membership
  const existing = await getMyActiveMembership();
  if (existing) {
    return { success: false, error: "You already have an active membership." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, last_name, phone")
    .eq("id", auth.user.id)
    .maybeSingle();

  const stripe = new Stripe(stripeKey, { apiVersion: "2026-02-25.clover" });

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: MEMBERSHIP_PRICE_CENTS,
            product_data: {
              name: "Arise And Shine Detailing — Premium Annual Membership",
              description: `$${MEMBERSHIP_CREDIT_USD} service credit for $${MEMBERSHIP_PRICE_USD} · Use on any service or add-on · Valid 12 months`,
            },
          },
          quantity: 1,
        },
      ],
      customer_email: auth.user.email ?? undefined,
      metadata: {
        sessionType: "membership_purchase",
        profileId: auth.user.id,
        tier: MEMBERSHIP_TIER,
        customerName: `${profile?.first_name ?? ""} ${profile?.last_name ?? ""}`.trim(),
        customerPhone: profile?.phone ?? "",
      },
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      expires_at: Math.floor(Date.now() / 1000) + 60 * 30,
    });

    return { success: true, checkoutUrl: session.url! };
  } catch (err) {
    console.error("[createMembershipCheckout]", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Checkout failed. Please try again.",
    };
  }
}

/** Webhook-only: creates the membership row after Stripe confirms payment. */
export async function createMembershipFromWebhook(input: {
  profileId: string;
  stripeCheckoutSessionId: string;
  stripePaymentIntentId: string | null;
  amountPaidCents: number;
}): Promise<{ success: true; membershipId: string } | { success: false; error: string }> {
  if (!input.profileId) {
    return { success: false, error: "Missing profile id" };
  }

  const supabase = createAdminClient();

  // Idempotency: skip if a row with this checkout session already exists
  const { data: existing } = await supabase
    .from("memberships")
    .select("id")
    .eq("stripe_checkout_session_id", input.stripeCheckoutSessionId)
    .maybeSingle();
  if (existing) return { success: true, membershipId: existing.id };

  const startedAt = new Date();
  const expiresAt = new Date(startedAt);
  expiresAt.setFullYear(expiresAt.getFullYear() + 1);

  const { data, error } = await supabase
    .from("memberships")
    .insert({
      profile_id: input.profileId,
      tier: MEMBERSHIP_TIER,
      status: "active",
      started_at: startedAt.toISOString(),
      expires_at: expiresAt.toISOString(),
      credit_balance_cents: MEMBERSHIP_CREDIT_CENTS,
      credit_total_cents:   MEMBERSHIP_CREDIT_CENTS,
      amount_paid_cents: input.amountPaidCents || MEMBERSHIP_PRICE_CENTS,
      stripe_checkout_session_id: input.stripeCheckoutSessionId,
      stripe_payment_intent_id: input.stripePaymentIntentId,
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("[createMembershipFromWebhook]", error);
    return { success: false, error: error?.message ?? "Insert failed" };
  }

  // Fire admin notification email (best-effort — failure doesn't block the
  // webhook). Look up the buyer's name/email/phone for the alert.
  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("first_name, last_name, phone")
      .eq("id", input.profileId)
      .maybeSingle();
    const { data: authUser } = await supabase.auth.admin.getUserById(input.profileId);
    const customerName = profile
      ? [profile.first_name, profile.last_name].filter(Boolean).join(" ").trim() || null
      : null;
    await sendMembershipAdminAlert({
      customerName,
      customerEmail: authUser?.user?.email ?? null,
      customerPhone: profile?.phone ?? null,
      amountPaidCents: input.amountPaidCents || MEMBERSHIP_PRICE_CENTS,
      membershipId: data.id,
      expiresAt,
    });
  } catch (e) {
    console.error("[createMembershipFromWebhook] admin alert lookup failed:", e);
  }

  return { success: true, membershipId: data.id };
}

/** Atomically decrements the membership credit balance.
 *  Returns the new balance in cents, or an error if insufficient.
 *  Uses the consume_membership_credit Postgres function for atomicity. */
export async function consumeMembershipCredit(input: {
  membershipId: string;
  amountCents: number;
}): Promise<{ success: true; newBalanceCents: number } | { success: false; error: string }> {
  if (input.amountCents <= 0) {
    return { success: false, error: "Amount must be positive" };
  }
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("consume_membership_credit", {
    p_membership_id: input.membershipId,
    p_amount_cents:  input.amountCents,
  });
  if (error) {
    console.error("[consumeMembershipCredit]", error);
    return { success: false, error: error.message };
  }
  return { success: true, newBalanceCents: Number(data) };
}

/** Restores credit to a membership (e.g. when a booking is cancelled). */
export async function restoreMembershipCredit(input: {
  membershipId: string;
  amountCents: number;
}): Promise<{ success: true; newBalanceCents: number } | { success: false; error: string }> {
  if (input.amountCents <= 0) {
    return { success: false, error: "Amount must be positive" };
  }
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("restore_membership_credit", {
    p_membership_id: input.membershipId,
    p_amount_cents:  input.amountCents,
  });
  if (error) {
    console.error("[restoreMembershipCredit]", error);
    return { success: false, error: error.message };
  }
  return { success: true, newBalanceCents: Number(data) };
}

/** Customer-initiated cancellation. Marks the membership cancelled but keeps
 *  the credit balance available until expires_at (they prepaid). */
export async function cancelMyMembership(): Promise<
  { success: true } | { success: false; error: string }
> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user?.id) {
    return { success: false, error: "You must be signed in." };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("memberships")
    .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
    .eq("profile_id", auth.user.id)
    .eq("status", "active");

  if (error) {
    console.error("[cancelMyMembership]", error);
    return { success: false, error: error.message };
  }
  return { success: true };
}
