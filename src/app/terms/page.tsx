import Link from "next/link";
import { Clause, LegalPage } from "@/components/LegalPage";
import { CONTACT_EMAIL, POLICY_UPDATED, SITE_NAME } from "@/lib/config";

export const metadata = {
  title: "Terms of Service",
  description: `The agreement you accept when you place a bid on ${SITE_NAME}.`,
};

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" updated={POLICY_UPDATED}>
      <Clause heading="What this service is">
        <p>
          {SITE_NAME} is a public leaderboard of links. Position on the board is
          determined solely by the amount paid for that listing. There is no
          voting, no editorial selection, and no algorithm.
        </p>
        <p>
          By placing a bid you agree to these terms. If you do not agree, do not
          place a bid.
        </p>
      </Clause>

      <Clause heading="What you are buying">
        <p>
          You are buying a listing on the board at the rank your payment
          purchases, held for as long as no one outbids you. You are not buying
          a guaranteed rank, a guaranteed duration, guaranteed traffic, or any
          minimum number of clicks.
        </p>
        <p>
          Your rank will fall over time as other people bid higher. This is the
          intended behaviour of the service, not a fault.
        </p>
      </Clause>

      <Clause heading="Pricing">
        <p>
          Listings start at $1 USD. You choose the amount you pay. Bids are
          whole US dollars. Payment is one-time — there is no subscription and
          nothing recurring will be charged.
        </p>
        <p>
          Bidding again on a link you already hold raises its standing bid to
          the new amount. Bids do not accumulate.
        </p>
        <p>
          Applicable sales tax, VAT or GST is calculated and added at checkout
          by our payment provider based on your location.
        </p>
      </Clause>

      <Clause heading="Payment and delivery">
        <p>
          Payments are processed by Dodo Payments, which acts as the merchant of
          record for the transaction. Your listing appears on the board
          automatically once payment is confirmed, normally within seconds.
        </p>
        <p>
          If your payment succeeds but your listing has not appeared after a few
          minutes, contact us at{""}
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="text-accent underline underline-offset-4"
          >
            {CONTACT_EMAIL}
          </a>
          {""}
          with your payment reference and we will resolve it.
        </p>
      </Clause>

      <Clause heading="What you may list">
        <p>
          You may list a product, company site, landing page, portfolio, or your
          own public profile. You must own the link you submit or be authorised
          to promote it.
        </p>
        <p>
          You may not list: malware, phishing or fraudulent sites; content that
          is illegal in India or in your own jurisdiction; sexually explicit
          material; content that sexualises or endangers minors; content
          promoting violence, hatred or discrimination; chat and invite links;
          link shorteners; or file-sharing links.
        </p>
        <p>
          Submitting variants of the same URL in order to occupy more than one
          position is not permitted.
        </p>
      </Clause>

      <Clause heading="Removal">
        <p>
          We may remove any listing at our discretion, and we will remove
          anything that breaches the section above. Listings removed for a
          breach of these terms are not refunded.
        </p>
        <p>
          Outbound links from this site carry a{""}
          <code className="text-ink">nofollow sponsored</code> attribute. These
          are paid placements and are marked as such.
        </p>
      </Clause>

      <Clause heading="Liability">
        <p>
          The service is provided as-is. We are not responsible for the content,
          security or accuracy of any site listed on the board, and a listing is
          not an endorsement.
        </p>
        <p>
          To the extent permitted by law, our total liability to you for any
          claim relating to this service is limited to the amount you paid us in
          the twelve months before the claim arose.
        </p>
      </Clause>

      <Clause heading="Changes and contact">
        <p>
          We may update these terms. Material changes will be reflected in the
          date at the top of this page, and apply to bids placed after that
          date.
        </p>
        <p>
          Questions:{""}
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="text-accent underline underline-offset-4"
          >
            {CONTACT_EMAIL}
          </a>
          . See also our{""}
          <Link
            href="/refunds"
            className="text-accent underline underline-offset-4"
          >
            Refund and Cancellation Policy
          </Link>
          {""}
          and{""}
          <Link
            href="/privacy"
            className="text-accent underline underline-offset-4"
          >
            Privacy Policy
          </Link>
          .
        </p>
      </Clause>
    </LegalPage>
  );
}
