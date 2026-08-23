import { Clause, LegalPage } from "@/components/LegalPage";
import { CONTACT_EMAIL, POLICY_UPDATED, SITE_NAME } from "@/lib/config";

export const metadata = {
  title: "Privacy Policy",
  description: `What ${SITE_NAME} collects, why, and how to have it deleted.`,
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated={POLICY_UPDATED}>
      <Clause heading="The short version">
        <p>
          We collect very little. We do not run advertising trackers, we do not
          set tracking cookies, and we do not sell or share your data with
          anyone for marketing.
        </p>
      </Clause>

      <Clause heading="What we collect">
        <p>
          <span className="text-ink">The link you submit</span>, along with the
          title, description and icon we read from that page. This is public by
          design — it is the listing.
        </p>
        <p>
          <span className="text-ink">Your email address</span>, only if you
          choose to enter one for a receipt. It is never displayed publicly and
          is used solely to contact you about your payment.
        </p>
        <p>
          <span className="text-ink">A payment reference</span> from our payment
          provider, so we can match a payment to a listing and handle refunds.
        </p>
        <p>
          <span className="text-ink">A click count</span> per listing. This is a
          single number per listing. We do not record who clicked, their IP
          address, or any profile of visitors.
        </p>
        <p>
          <span className="text-ink">Standard server logs</span> kept briefly by
          our hosting provider for security and reliability, which may include
          IP addresses.
        </p>
      </Clause>

      <Clause heading="Payment data">
        <p>
          We never see or store your card details. Payments are processed by
          Dodo Payments, which acts as the merchant of record and handles your
          payment information under its own privacy policy.
        </p>
      </Clause>

      <Clause heading="Who processes data for us">
        <p>
          — <span className="text-ink">Dodo Payments</span> — payment processing,
          invoicing and tax.
          <br />— <span className="text-ink">Supabase</span> — database hosting.
          <br />— <span className="text-ink">Vercel</span> — website hosting.
        </p>
        <p>
          When your browser loads a listing icon, the request goes to Google&apos;s
          public favicon service, which will see your IP address.
        </p>
      </Clause>

      <Clause heading="How long we keep it">
        <p>
          Listings and their payment records are kept for as long as the board
          exists, because they are the public record of what was paid. Financial
          records may be retained longer where tax law requires it.
        </p>
      </Clause>

      <Clause heading="Your rights">
        <p>
          You can ask us for a copy of the data we hold about you, ask us to
          correct it, or ask us to delete it. Email{" "}
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="text-pop underline underline-offset-4"
          >
            {CONTACT_EMAIL}
          </a>{" "}
          and we will respond within 30 days.
        </p>
        <p>
          Deleting a listing removes it from the board. We may retain the
          minimum payment record needed for accounting and fraud prevention.
        </p>
      </Clause>

      <Clause heading="Children">
        <p>
          This service is not intended for anyone under 18 and we do not
          knowingly collect data from children.
        </p>
      </Clause>

      <Clause heading="Contact">
        <p>
          Questions about this policy:{" "}
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="text-pop underline underline-offset-4"
          >
            {CONTACT_EMAIL}
          </a>
        </p>
      </Clause>
    </LegalPage>
  );
}
