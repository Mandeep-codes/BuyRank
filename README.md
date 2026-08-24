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


## Board lift (Aug 2026)

- Hero names the current #1 ("outcode.lol holds #1 at $2 — take it for $3")
  and vertical space is tightened so the top of the board reaches the first
  screen.
- Stat pill is curated, never fabricated: "online" appears at 5+, "paid so
  far" at $100+, and a "clicks delivered" stat appears at 10+ clicks.
  Thresholds live in `src/lib/config.ts`.
- New `click_events` table logs every /r/[id] redirect; a one-line ticker
  under the pill rotates real clicks from the last 24h and renders nothing
  when there are none.
- Right rail: rentable Sponsored card ($5/day, 1–7 days, queues back-to-back,
  same Dodo product + webhook, idempotent on payment_id, reversed on refund).
  Shows clicks measured inside the rental window and a live countdown. When
  unrented, the slot is the rent form.
- Category pills only render categories that have listings.

- Favicons fixed at three layers: the scraper now uses the page's real
  `<link rel="icon">` (verified) before falling back to `/favicon.ico` and
  only then Google's proxy; a `<Favicon>` component self-heals broken icon
  URLs at render time; and `scripts/refresh-favicons.mjs` re-resolves icons
  for existing listings (the deploy script runs it once). The site itself
  now ships a real multi-size `/favicon.ico`.
- Presence counting corrected: the per-IP heartbeat limit was 6/min, which
  silently stopped counting people behind shared IPs (carrier NAT, offices)
  — now 60/min. Heartbeats every 60s, and private-browsing tabs use a
  per-tab token instead of minting a new one per page load, so "visitors
  since launch" no longer inflates.

Deliberately absent: any seeded or offset counter. The numbers are the
product being sold, so they have to be measured.


## Growth kit (Aug 2026)

- Mobile board rows now show favicons (they were hidden below the sm
  breakpoint by design; now 32px on phones, 44px on desktop).
- Leader line fixed: postgres returns window-function ranks as strings, so
  the #1 check now coerces before comparing. Stats cache key bumped to -v2
  so the clicks-delivered stat can't be masked by a stale pre-deploy cache.
- Every listing has a share page at /l/[id] with a live OG card ("#2 on
  BuyRank"), visit + takeover CTAs, share buttons, and an embeddable SVG
  badge at /api/badge/[id] whose rank updates as the board moves.
- Board rows link to their share page, and the #1 row shows how long the
  leader has held the top ("on top 3h"), measured from their winning bid.
- The success page now knows who just paid (checkout passes the display
  name through the return URL), polls /api/rank while the webhook settles,
  then shows the rank they took with share buttons — the moment a buyer is
  most willing to post it.


## UI lift (Aug 2026)

Consistency pass, no new concepts: one card style (18px radius, hairline
border) shared by board rows, recent bids, and the sponsor slot; recent
bids get favicon tiles; board rows get a larger icon tile and a thinner
meta line (time - clicks - take-for, share as an icon); #1 carries a soft
tint plus the reign chip as the only emphasis; hero rhythm tightened.


## Fix pack (Aug 2026)

- New-listing metadata fixed: the scraper's UA said "Bot", so Cloudflare-
  fronted product sites returned 403 and listings arrived with no title,
  description, or icon. It now identifies as a normal browser (one fetch
  per submission of a page the submitter asked us to read), the webhook
  re-scrapes once at settlement if anything is still missing, and
  scripts/refresh-meta.mjs heals existing rows (deploy runs it once).
- Stat pill fixed on refresh: online and visitor counts are now computed
  server-side inside getStats and rendered on first paint, with the
  heartbeat updating them live after — no more vanishing segments or the
  orphan dot while the first heartbeat is in flight.
