import { Clause, LegalPage } from "@/components/LegalPage";
import { CONTACT_EMAIL, POLICY_UPDATED, SITE_NAME } from "@/lib/config";

export const metadata = {
  title: "Refund and Cancellation Policy",
  description: `How refunds and cancellations work on ${SITE_NAME}.`,
};

export default function RefundsPage() {
  return (
    <LegalPage title="Refund and Cancellation Policy" updated={POLICY_UPDATED}>
      <Clause heading="Nothing recurring to cancel">
        <p>
          Every bid is a single one-time payment. There is no subscription, no
          membership and no recurring charge, so there is nothing to cancel and
          no renewal to stop.
        </p>
      </Clause>

      <Clause heading="Bids are final">
        <p>
          A listing is delivered immediately on payment, so bids are
          non-refundable once the listing is live. You are paying for the
          position you hold, for as long as you hold it.
        </p>
        <p>
          Being outbid is not grounds for a refund. Your money does not return
          when someone pays more than you — that is how the board works and it
          is stated before you pay.
        </p>
      </Clause>

      <Clause heading="When we do refund">
        <p>We will refund you in full in these cases:</p>
        <p>
          — You were charged but your listing never appeared on the board, and
          we cannot make it appear.
          <br />— You were charged more than once for the same listing.
          <br />— A technical fault on our side made the listing unusable, for
          example the wrong destination link was saved and we cannot correct it.
        </p>
        <p>
          If we remove your listing for a reason that is not your fault, we will
          refund it.
        </p>
      </Clause>

      <Clause heading="When we do not refund">
        <p>
          — You changed your mind, or bid the wrong amount.
          <br />— You were outbid and your rank fell.
          <br />— The listing did not bring you the traffic you expected. We do
          not guarantee traffic.
          <br />— Your listing was removed for breaching our{""}
          <span className="text-ink">Terms of Service</span>.
        </p>
      </Clause>

      <Clause heading="How to request a refund">
        <p>
          Email{""}
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="text-accent underline underline-offset-4"
          >
            {CONTACT_EMAIL}
          </a>
          {""}
          from the address you used at checkout, within 14 days of the payment,
          including your payment reference and the link you listed.
        </p>
        <p>
          We reply to every request within 3 business days. Approved refunds are
          issued to your original payment method by Dodo Payments, our payment
          provider, and typically arrive within 5&ndash;10 business days
          depending on your bank.
        </p>
        <p>
          Please contact us before opening a dispute with your bank. We will fix
          genuine errors. A refunded listing is removed from the board.
        </p>
      </Clause>
    </LegalPage>
  );
}
