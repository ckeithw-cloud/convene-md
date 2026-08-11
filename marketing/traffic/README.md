# Weekly traffic snapshots

`scripts/traffic-report.js` pulls Cloudflare Web Analytics (real visitors, not bots) and
writes a dated report here every Monday, plus one row in `history.csv`.

Cloudflare's free Web Analytics retention is short — the dashboard quietly drops older
weeks. `history.csv` is the durable record, and the only way to compare a post made in
August against traffic six months later.

## One-time setup: the API token

The token is a password. It is deliberately **not** stored in this repo, and Claude will
not create or handle it — create it yourself:

1. Go to https://dash.cloudflare.com/profile/api-tokens
2. **Create Token** → **Create Custom Token** (bottom option, "Get started")
3. Name: `convene traffic report`
4. Permissions — add exactly one:
   - **Account** · **Account Analytics** · **Read**
5. Account Resources: **Include** → your account (`Ckeithw@gmail.com's Account`)
6. TTL: leave as is, or set a long expiry. Create, then copy the token — Cloudflare shows
   it once.
7. Save it, readable only by you:

```bash
mkdir -p ~/.config/convene && touch ~/.config/convene/cloudflare-token && chmod 600 ~/.config/convene/cloudflare-token
```

Then paste the token into that file with your editor and save. Verify:

```bash
cd "/Users/ckeithw/projects/convene-md" && node scripts/traffic-report.js --days 7
```

If the token is wrong or under-scoped, Cloudflare's own error is printed verbatim.

If it instead fails with something like `Unknown field "refererHost"`, Cloudflare has
renamed part of the analytics schema. These two commands print the valid names so the
query in `scripts/traffic-report.js` can be corrected:

```bash
node scripts/traffic-report.js --probe
```

```bash
node scripts/traffic-report.js --probe-dims
```

## Schedule

Weekly on Mondays at 08:20, via `~/Library/LaunchAgents/com.medconf.traffic.plist`. It runs
an hour before the conference updater so the two never contend for the same git checkout.

```bash
launchctl list | grep medconf          # is it loaded
tail -40 logs/traffic.log              # what happened last run
```

Run any window by hand:

```bash
node scripts/traffic-report.js --days 30
```

## Reading a report

- **Referred visits** is the honest signal that a post did something. Page views and total
  visits move with crawlers, your own browsing, and noise.
- **Direct is not "nobody"** — Instagram, Reddit and LinkedIn in-app browsers strip the
  referrer, so social clicks land there. That is why links you post should carry
  `?utm_source=instagram` and friends; see `marketing/experiments.md`.
- The **"What we tried"** section is filled from `marketing/experiments.md`. If it says
  nothing was logged, the report cannot explain its own numbers — log the posts.
