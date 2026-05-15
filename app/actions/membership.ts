"use server";

import Stripe from "stripe";
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
              name: "Arise & Shine VT — Premium Annual Membership",
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
