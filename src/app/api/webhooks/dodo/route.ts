import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { Webhook } from "standardwebhooks";
import { CATEGORY_SLUGS, MIN_BID_CENTS } from "@/lib/config";
import type { DodoWebhookPayload } from "@/lib/dodo";
import { reverseBid, settleBid } from "@/lib/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The only place a bid is ever written. Dodo retries until it gets a 2xx, so
 * every path here is safe to run twice — `settleBid` keys on `payment_id`.
 *
 * Note the two failure styles: a bad signature is a 400 (stop retrying, this
 * isn't us), while a database error is a 500 (please retry, we'll take it).
 */
export async function POST(req: Request) {
  const secret = process.env.DODO_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[webhook] DODO_WEBHOOK_SECRET is not set");
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  const rawBody = await req.text();
  const headers = {
    "webhook-id": req.headers.get("webhook-id") ?? "",
    "webhook-signature": req.headers.get("webhook-signature") ?? "",
    "webhook-timestamp": req.headers.get("webhook-timestamp") ?? "",
  };

  try {
    new Webhook(secret).verify(rawBody, headers);
  } catch {
    // Don't echo anything about why — an attacker probing signatures learns nothing.
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  let event: DodoWebhookPayload;
  try {
    event = JSON.parse(rawBody) as DodoWebhookPayload;
  } catch {
    return NextResponse.json({ error: "Malformed payload" }, { status: 400 });
  }

  // A refund or a lost dispute has to come off the board, or someone keeps a
  // paid rank they were paid back for.
  //
  // These four strings are exact — they come from Dodo's published event list.
  // dispute.won is deliberately absent: winning means we keep the money, so the
  // listing keeps its rank. dispute.opened is also absent, because funds are
  // only held at that point and the seller may still win.
  //
  // The payload for refund.* and dispute.* is a Refund or Dispute object, both
  // of which carry payment_id — which is what settleBid keyed on.
  if (
    event.type === "refund.succeeded" ||
    event.type === "dispute.accepted" ||
    event.type === "dispute.lost"
  ) {
    const id = event.data?.payment_id;
    if (id) {
      try {
        const reversed = await reverseBid(id);
        if (reversed) revalidatePath("/", "layout");
        return NextResponse.json({ received: true, reversed });
      } catch (error) {
        console.error("[webhook] reverse failed", error);
        return NextResponse.json({ error: "Reverse failed" }, { status: 500 });
      }
    }
    return NextResponse.json({ received: true });
  }

  // Anything other than a completed payment is acknowledged and ignored.
  if (event.type !== "payment.succeeded") {
    return NextResponse.json({ received: true });
  }

  const data = event.data ?? {};
  const meta = data.metadata ?? {};
  const paymentId = data.payment_id;

  if (!paymentId || !meta.url) {
    console.warn("[webhook] payment.succeeded without url metadata", paymentId);
    return NextResponse.json({ received: true });
  }

  // Trust our own metadata for the amount, not the charged total — the charged
  // total includes tax, and rank should reflect the bid, not the buyer's VAT.
  const amountCents = Number(meta.bid_cents);
  if (!Number.isFinite(amountCents) || amountCents < MIN_BID_CENTS) {
    console.warn("[webhook] implausible bid_cents", meta.bid_cents, paymentId);
    return NextResponse.json({ received: true });
  }

  const category = CATEGORY_SLUGS.includes(meta.category ?? "")
    ? meta.category
    : "other";

  try {
    const result = await settleBid({
      url: meta.url,
      displayName: meta.display_name || meta.url,
      title: meta.title || null,
      description: meta.description || null,
      faviconUrl: meta.favicon_url || null,
      category: category!,
      amountCents,
      paymentId,
      email: data.customer?.email ?? null,
    });

    if (result.applied) {
      revalidatePath("/", "layout");
    }

    return NextResponse.json({ received: true, applied: result.applied });
  } catch (error) {
    console.error("[webhook] settle failed", error);
    // 500 tells Dodo to retry — better than silently losing someone's money.
    return NextResponse.json({ error: "Settle failed" }, { status: 500 });
  }
}
