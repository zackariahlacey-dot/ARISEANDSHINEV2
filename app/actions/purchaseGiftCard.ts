"use server";

import Stripe from "stripe";

type PurchaseGiftCardInput = {
  amount: number; // $25, $50, $75, $100, $150, $200
  purchaserEmail: string;
  recipientEmail?: string;
  recipientName?: string;
  successUrl: string;
  cancelUrl: string;
};

export async function purchaseGiftCard(input: PurchaseGiftCardInput): Promise<
  { success: true; checkoutUrl: string } | { success: false; error: string }
> {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) return { success: false, error: "Payment not configured." };

  if (!input.amount || input.amount < 10) {
    return { success: false, error: "Minimum gift card amount is $10." };
  }
  if (!input.purchaserEmail) {
    return { success: false, error: "Your email is required." };
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2026-02-25.clover" });

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: Math.round(input.amount * 100),
            product_data: {
              name: `Arise & Shine VT Gift Card — $${input.amount}`,
              description: input.recipientName
                ? `Gift for ${input.recipientName}`
                : "Can be applied at checkout for any detailing service",
            },
          },
          quantity: 1,
        },
      ],
      customer_email: input.purchaserEmail,
      metadata: {
        sessionType: "gift_card",
        amount: String(input.amount),
        purchaserEmail: input.purchaserEmail,
        recipientEmail: input.recipientEmail ?? "",
        recipientName: (input.recipientName ?? "").slice(0, 200),
      },
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      expires_at: Math.floor(Date.now() / 1000) + 60 * 30,
    });

    return { success: true, checkoutUrl: session.url! };
  } catch (err) {
    console.error("[purchaseGiftCard]", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Checkout failed. Please try again.",
    };
  }
}
