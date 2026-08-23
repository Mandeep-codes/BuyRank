# bidboard

A pay-to-rank leaderboard. People pay to list a product; the amount they pay is
their rank. Pay more than the row above you and you take its place.

Built with Next.js 15 (App Router), Postgres + Drizzle, and Dodo Payments.

---

## Getting it running

### 1. Install

```bash
npm install
cp .env.example .env.local
```

### 2. Database

Any Postgres works. Run `npm run db:check` at any point and it will tell you
what you're connected to and what's missing.

**Supabase.** Dashboard → **Connect** gives you three strings, and they are not
interchangeable:

| String | Port | Put it in |
| --- | --- | --- |
| Transaction pooler | `6543` | `DATABASE_URL` — the app uses this |
| Session pooler | `5432` (host has `pooler`) | `DIRECT_DATABASE_URL` — migrations use this |
| Direct | `5432` (host is `db.xxx.supabase.co`) | Nothing. IPv6 only, Vercel can't reach it |

Transaction mode doesn't support prepared statements, which is why the client
sets `prepare: false`. It also makes DDL unreliable, so `db:push` uses
`DIRECT_DATABASE_URL` when you've set one. Setting both takes ten seconds and
saves a confusing failure later.

**Neon.** Use the pooled string (host contains `-pooler`) and **delete
`&channel_binding=require`** if the copy button included it — the driver
forwards that to the server and the connection dies with `unrecognized
configuration parameter "channel_binding"`. Keep `sslmode=require`. Neon needs
only `DATABASE_URL`.

Then create the tables:

```bash
npm run db:push
```

Want to see the layout before you have real bids? Seed 120 fake listings:

```bash
node scripts/seed.mjs
```

The seed **wipes both tables first**. Never point it at production.

### 3. Dodo Payments

You need a merchant account, and Dodo verifies businesses before you can take
live payments — **start this first**, it gates everything else.

Once you're in:

1. **Products → New product → One-time**
2. Under Pricing, **enable "Pay What You Want"** and set the minimum to **$1**.
   This is the part that makes the whole site work. Without PWYW enabled, Dodo
   ignores the bid amount we send and charges every bidder the same fixed price.
3. Copy the product ID (`pdt_...`) into `DODO_PRODUCT_ID`.
4. **Developer → API** → generate a key → `DODO_PAYMENTS_API_KEY`. Use a `test_`
   key while building.
5. **Developer → Webhooks** → add an endpoint pointing at
   `https://yoursite.com/api/webhooks/dodo` → copy the secret into
   `DODO_WEBHOOK_SECRET`.

Keep `DODO_ENVIRONMENT="test_mode"` until you're ready. Flip it to `live_mode`
and swap in a live API key to go live.

### 4. Run

```bash
npm run dev
```

To test the payment loop locally, expose your machine so Dodo can reach the
webhook:

```bash
npx untun@latest tunnel http://localhost:3000
```

Point a test webhook endpoint at the tunnel URL. **A bid only appears on the
board when the webhook fires** — not when the browser redirects back. If your
listing never shows up, the webhook is what to check first.

---

## When something won't connect

Run `npm run db:check` first — it names the problem. In development the board
also replaces the crash screen with a plain-English one for database errors it
recognises (missing tables, bad password, unreachable host), so you get told
what to fix instead of a wall of SQL. Unknown errors still throw normally.

Most common causes, in order:

1. **`relation "entries" does not exist`** — `db:push` never finished. Run it again.
2. **`ENOTFOUND` / `ENETUNREACH` on `db.xxx.supabase.co`** — that's the direct,
   IPv6-only host. Switch to a pooler string.
3. **`password authentication failed`** — on Supabase the pooler username is
   `postgres.yourprojectref`, not plain `postgres`.

## Going live before payments are ready

Dodo verification takes a while, and the site is useful before it clears. Leave
`DODO_PAYMENTS_API_KEY` and `DODO_PRODUCT_ID` empty and everything still works —
the board, categories, click tracking and the tape all run, the bid button reads
**Opening soon**, and `/api/checkout` returns a clean 503 instead of an error.

Fill the two keys in and the form switches itself on. No code change, no redeploy
beyond the env var update.

**Clear the seed data before you launch.** Fake listings on a site taking real
money is not a good look:

```sql
truncate table bids, entries restart identity cascade;
```

## Deploying

Push to GitHub first (`.env.local` is gitignored, so your keys stay out of it),
then import the repo at [vercel.com/new](https://vercel.com/new). Or from the
project folder:

```bash
npx vercel
```

Add every variable from `.env.example` in the Vercel dashboard. Set
`NEXT_PUBLIC_SITE_URL` to your real domain — the OG image, sitemap and payment
return URLs are all built from it, and a wrong value here breaks link previews
and sends payers to the wrong place after checkout.

Then update the Dodo webhook endpoint to the production URL.

---

## How it works

### The bid flow

```
browser  →  POST /api/checkout
              ├── normalises the URL, rejects chat/shortener links
              ├── re-derives the minimum bid from the database
              ├── scrapes the page for title/description/favicon
              └── creates a Dodo PWYW checkout session
         →  Dodo hosted checkout
         →  POST /api/webhooks/dodo   (payment.succeeded)
              ├── verifies the Standard Webhooks signature
              ├── settleBid() in a transaction
              └── revalidates the board
```

**The price is never trusted from the browser.** `/api/checkout` re-reads the
current standing bid from the database before creating a session, so editing the
amount in devtools gets you nothing.

**Rank comes from our own metadata, not the amount charged.** The charged total
includes sales tax, which varies by the buyer's country — ranking on it would
mean a German bidder outranks an American who paid the same.

### Why replayed webhooks are safe

Dodo retries until it gets a 2xx, so `settleBid()` has to survive running twice:

- `payment_id` is **unique** on the `bids` table, so a replay hits the conflict
  clause and inserts nothing.
- The entry upsert uses `greatest(current, incoming)`, so a webhook arriving
  late can never *lower* a bid that has since been raised.

A bad signature returns **400** (stop retrying, this isn't from you). A database
error returns **500** (please retry — better than losing someone's money).

### Ranking

`ORDER BY bid_cents DESC, created_at ASC` — highest bid wins, ties break on
seniority. Category pages show each listing's **global** rank, not its rank
within the category, which is what people expect when they share the link.

---

## Moderation

Scam and malware listings need to come off in seconds, so removal is a curl
command rather than an admin UI you'd use twice a week:

```bash
curl -X POST https://yoursite.com/api/admin \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action":"hide","url":"scam.example"}'
```

`action` is `hide` or `restore`. Hiding keeps the payment history — you'll want
it if they open a dispute.

Set `ADMIN_TOKEN` to something long and random. The endpoint refuses to work
while it's still the default value.

### What's blocked automatically

- Chat and invite links (Telegram, WhatsApp, Discord, Messenger, Signal)
- Link shorteners and file-sharing hosts
- IP addresses, `.onion`, `.local`, `.internal`

Tracking and affiliate parameters (`utm_*`, `ref`, `fbclid`, `aff`, and friends)
are stripped from every submission, so nobody can list the same page twice by
adding `?ref=x`.

---

## Things worth knowing before launch

**Outbound links carry `rel="nofollow sponsored"`.** Don't remove this. These are
paid links, and without the attribute Google eventually treats the whole board as
a link scheme and deindexes it. That would take the site's own search traffic
down with it.

**`/r/` is disallowed in robots.txt.** Crawlers following the click tracker would
inflate every listing's click count.

**Rate limiting is in-process.** Fine on a single instance. If you scale past one
region, swap `src/lib/ratelimit.ts` for `@upstash/ratelimit`, or the limits
become per-instance and effectively meaningless.

**Refunds and chargebacks aren't automated.** A refunded bid keeps its rank until
you hide it manually. If disputes become common, handle `payment.refunded` in the
webhook.

---

## Making it yours

| What | Where |
| --- | --- |
| Site name | `NEXT_PUBLIC_SITE_NAME` |
| Tagline and copy | `src/lib/config.ts`, `src/app/about`, `src/app/rules` |
| Categories | `CATEGORIES` in `src/lib/config.ts` |
| Minimum bid, page size | `src/lib/config.ts` |
| Colours and fonts | `tailwind.config.ts`, `src/app/globals.css`, `src/app/layout.tsx` |

Changing a category slug orphans existing listings in that category — they'll
fall back to "Other" on display but keep the old slug in the database. Decide the
list before you launch.

---

## Scripts

| Command | Does |
| --- | --- |
| `npm run dev` | Local dev server |
| `npm run build` | Production build |
| `npm run db:check` | Show what you're connected to and what's missing |
| `npm run db:push` | Sync schema to the database |
| `npm run db:studio` | Browse the data |
| `node scripts/seed.mjs` | Fill the board with fake listings |
