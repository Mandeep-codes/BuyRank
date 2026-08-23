import { SITE_NAME, SITE_URL } from "./config";

/**
 * Thin wrapper over the Dodo Payments REST API. We call it directly rather than
 * through the SDK so the exact request body is visible and easy to debug.
 *
 * Requires a *Pay What You Want* one-time product: Dashboard > Products > new
 * product > Pricing > enable "Pay What You Want", minimum price $1. Without
 * PWYW enabled the `amount` field below is silently ignored and every bidder
 * gets charged the product's fixed price instead.
 */

const IS_TEST = (process.env.DODO_ENVIRONMENT ?? "test_mode") === "test_mode";

const API_BASE = IS_TEST
  ? "https://test.dodopayments.com"
  : "https://live.dodopayments.com";

export type CheckoutMetadata = {
  url: string;
  display_name: string;
  category: string;
  bid_cents: string;
  title: string;
  description: string;
  favicon_url: string;
};

export async function createCheckoutSession(input: {
  amountCents: number;
  metadata: CheckoutMetadata;
  email?: string;
}): Promise<{ checkoutUrl: string; sessionId: string }> {
  const apiKey = process.env.DODO_PAYMENTS_API_KEY;
  const productId = process.env.DODO_PRODUCT_ID;

  if (!apiKey) throw new Error("DODO_PAYMENTS_API_KEY is not set.");
  if (!productId) throw new Error("DODO_PRODUCT_ID is not set.");

  const res = await fetch(`${API_BASE}/checkouts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      product_cart: [
        {
          product_id: productId,
          quantity: 1,
          // PWYW amount, in the lowest denomination (cents for USD).
          amount: input.amountCents,
        },
      ],
      ...(input.email ? { customer: { email: input.email } } : {}),
      return_url: `${SITE_URL}/success`,
      cancel_url: SITE_URL,
      billing_currency: "USD",
      // Bids are anonymous — don't make people type a full address for $1.
      minimal_address: true,
      metadata: input.metadata,
      feature_flags: {
        allow_discount_code: false,
        allow_phone_number_collection: false,
        redirect_immediately: true,
      },
      customization: {
        theme: "light",
        show_order_details: true,
      },
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(
      `Dodo checkout failed (${res.status}): ${detail.slice(0, 400)}`,
    );
  }

  const json = (await res.json()) as {
    session_id: string;
    checkout_url: string | null;
  };

  if (!json.checkout_url) {
    throw new Error("Dodo returned a session without a checkout URL.");
  }

  return { checkoutUrl: json.checkout_url, sessionId: json.session_id };
}

/** Shape of the bits of the webhook payload we actually read. */
export type DodoWebhookPayload = {
  type: string;
  data: {
    payload_type?: string;
    payment_id?: string;
    total_amount?: number;
    settlement_amount?: number;
    currency?: string;
    metadata?: Record<string, string>;
    customer?: { email?: string; name?: string };
  };
};

export const PRODUCT_LABEL = `${SITE_NAME} listing`;

/**
 * Whether payments can actually run. Lets the site go live before Dodo
 * verification comes through: the board works, and the bid form says so
 * plainly instead of sending people into a checkout that 502s.
 */
export function paymentsConfigured(): boolean {
  return Boolean(
    process.env.DODO_PAYMENTS_API_KEY?.trim() &&
      process.env.DODO_PRODUCT_ID?.trim(),
  );
}
