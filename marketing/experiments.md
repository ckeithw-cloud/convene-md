# Growth experiments log

Every post, comment, outreach attempt and site change that could move traffic goes here.
`scripts/traffic-report.js` reads this file and pastes the matching rows into each weekly
report, so the numbers arrive next to the thing that caused them.

**Format matters** — the parser only reads table rows that begin with a `YYYY-MM-DD` date:

```
| 2026-08-08 | Instagram | Commented on @wildernessmedicine Big Sky post | link |
```

Keep one row per action. Log the attempt even when it flops — a post that got removed or
buried is a result, and unlogged failures are how you end up repeating them.

## Tagging links

Cloudflare can only report a referrer the browser actually sends, and Instagram, Reddit
and LinkedIn in-app browsers usually strip it. Anything you post from here on should carry
a `utm_source`, otherwise the click lands in "direct" and is indistinguishable from someone
typing the URL:

- `https://convene.md/specialty/dermatology/?utm_source=instagram`
- `https://convene.md/specialty/sports-and-wilderness-medicine/?utm_source=reddit`
- `https://convene.md/browse/?utm_source=linkedin`

## Log

| Date | Channel | What | Link / notes |
| --- | --- | --- | --- |
| 2026-08-08 | Site | Added full MER catalogue — 848 → 1013 conferences, 165 new destination-CME meetings | mer.org import |
| 2026-08-08 | Site | Removed 2 stale hub pages; generator now prunes them automatically | — |
| 2026-08-08 | Analytics | Started weekly Cloudflare traffic snapshots | this report |
| 2026-08-10 | Instagram | POSTED — Kyoto autumn CME card (Nov 10–13, Four Seasons Kyoto). First post ever with a tagged bio link, so the first one we can actually attribute | `/city/kyoto/?utm_source=instagram&utm_campaign=kyoto-nov` · caption #10, image 2026-11-kyoto.png |
| 2026-08-24 | Instagram | QUEUED — Maui "two conferences, one airfare" card. Insight-led rather than destination-led, after Kyoto drove no measurable referrals | `/how-to/deduct-cme-travel/?utm_source=instagram&utm_campaign=maui-stack` · caption #11, image 2027-01-maui-stack.png |

## Backfill needed

These happened in the days before the log existed but the exact dates were not recorded.
Fill in the dates and move them into the table above — the first few weekly reports will be
hard to interpret without them.

- Reddit — comments on CME-spending threads, deep-linked to specialty hub pages. One was
  confirmed visible; at least one other may have been filtered. Note: Reddit silently
  removes link comments, so re-check logged out.
- Instagram — comment on the Maui Derm post listing their upcoming conferences, linking the
  dermatology hub.
- Instagram — comment on @wildernessmedicine's Big Sky registration post.
- LinkedIn — first post about convene.md; profile website field set to "Other".
- YouTube — comment with link on a CME video; never appeared, likely filtered.
- Google Search Console — sitemap submitted and indexing requested.
- Site — 279 hub pages published (`/specialty/`, `/country/`, `/city/`, `/year/`, `/browse/`)
  and the Browse A–Z link added to the homepage.

## Reading the reports

- **Referred visits** is the number that reflects a post working. Page views and visits
  both drift with crawlers and your own visits.
- Expect SEO to lag. New hub pages typically take weeks to index and longer to rank, so
  flat organic numbers in the first month are not evidence the hub pages failed.
- Cloudflare's free retention is short. `marketing/traffic/history.csv` is the only durable
  record — the dashboard will not show you these weeks later.
