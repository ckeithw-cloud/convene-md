#!/usr/bin/env node
// Weekly traffic snapshot for convene.md, pulled from Cloudflare's Web Analytics (RUM)
// GraphQL API. Invoked by scripts/traffic-report.sh via launchd; run by hand with:
//
//   node scripts/traffic-report.js            # last 7 days vs the 7 before
//   node scripts/traffic-report.js --days 30  # any window
//
// Why snapshot at all: Cloudflare's free Web Analytics retention is short, so the
// dashboard silently loses history. Each run appends a row to marketing/traffic/history.csv,
// which becomes the long-run series we compare posts and experiments against.
//
// The API token is never stored in this repo. It is read from $CLOUDFLARE_API_TOKEN or
// from ~/.config/convene/cloudflare-token (see scripts/traffic-report.sh).

const fs = require("fs");
const path = require("path");

const ACCOUNT_TAG = "86e2df40100c00350328477fcccf8a31";
const SITE_TAG = "f52c7677238046e6a6e393db9609d308";
const ROOT = path.join(__dirname, "..");
const OUT_DIR = path.join(ROOT, "marketing", "traffic");
const HISTORY = path.join(OUT_DIR, "history.csv");
const EXPERIMENTS = path.join(ROOT, "marketing", "experiments.md");

const argDays = (() => {
  const i = process.argv.indexOf("--days");
  return i > -1 ? Math.max(1, parseInt(process.argv[i + 1], 10) || 7) : 7;
})();

function tokenOrDie() {
  if (process.env.CLOUDFLARE_API_TOKEN) return process.env.CLOUDFLARE_API_TOKEN.trim();
  const f = path.join(process.env.HOME, ".config", "convene", "cloudflare-token");
  if (fs.existsSync(f)) return fs.readFileSync(f, "utf8").trim();
  console.error(
    "No Cloudflare API token found.\n" +
    "Set $CLOUDFLARE_API_TOKEN, or save the token to ~/.config/convene/cloudflare-token\n" +
    "(chmod 600). See marketing/traffic/README.md for how to create one."
  );
  process.exit(1);
}

const iso = (d) => d.toISOString().replace(/\.\d{3}Z$/, "Z");
const day = (d) => d.toISOString().slice(0, 10);

// One block of stats for a window. Cloudflare counts a "visit" as a pageload whose
// referrer host differs from the site's own host, so visits < page views by design.
const BLOCK = `
  count
  sum { visits }
`;

function query(start, end) {
  return `
{
  viewer {
    accounts(filter: { accountTag: "${ACCOUNT_TAG}" }) {
      totals: rumPageloadEventsAdaptiveGroups(
        filter: { siteTag: "${SITE_TAG}", datetime_geq: "${iso(start)}", datetime_lt: "${iso(end)}" }
        limit: 1
      ) { ${BLOCK} }

      referrers: rumPageloadEventsAdaptiveGroups(
        filter: { siteTag: "${SITE_TAG}", datetime_geq: "${iso(start)}", datetime_lt: "${iso(end)}" }
        limit: 50, orderBy: [count_DESC]
      ) { count dimensions { refererHost } }

      pages: rumPageloadEventsAdaptiveGroups(
        filter: { siteTag: "${SITE_TAG}", datetime_geq: "${iso(start)}", datetime_lt: "${iso(end)}" }
        limit: 25, orderBy: [count_DESC]
      ) { count dimensions { requestPath } }

      countries: rumPageloadEventsAdaptiveGroups(
        filter: { siteTag: "${SITE_TAG}", datetime_geq: "${iso(start)}", datetime_lt: "${iso(end)}" }
        limit: 15, orderBy: [count_DESC]
      ) { count dimensions { countryName } }

      devices: rumPageloadEventsAdaptiveGroups(
        filter: { siteTag: "${SITE_TAG}", datetime_geq: "${iso(start)}", datetime_lt: "${iso(end)}" }
        limit: 10, orderBy: [count_DESC]
      ) { count dimensions { deviceType } }

      daily: rumPageloadEventsAdaptiveGroups(
        filter: { siteTag: "${SITE_TAG}", datetime_geq: "${iso(start)}", datetime_lt: "${iso(end)}" }
        limit: 100, orderBy: [date_ASC]
      ) { count sum { visits } dimensions { date } }
    }
  }
}`;
}

// `--probe` asks Cloudflare what this dataset actually exposes. Cloudflare validates the
// token before the query, so a wrong field name cannot be caught until a real token exists —
// if a run fails with "Unknown field", this prints the valid names in one command.
async function probe(token) {
  const q = `{ __type(name: "AccountRumPageloadEventsAdaptiveGroups") { fields { name } } }`;
  const res = await fetch("https://api.cloudflare.com/client/v4/graphql", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: q }),
  });
  const body = await res.json();
  if (body.errors) { console.error(JSON.stringify(body.errors, null, 2)); process.exit(1); }
  const t = body.data && body.data.__type;
  if (!t) { console.error("Introspection returned nothing; the type name may have changed."); process.exit(1); }
  console.log("Fields on rumPageloadEventsAdaptiveGroups:");
  for (const f of t.fields) console.log("  " + f.name);
  console.log("\n(dimensions live under the `dimensions` field; run with --probe-dims for those)");
}

async function probeDims(token) {
  const q = `{ __type(name: "AccountRumPageloadEventsAdaptiveGroupsDimensions") { fields { name } } }`;
  const res = await fetch("https://api.cloudflare.com/client/v4/graphql", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: q }),
  });
  const body = await res.json();
  const t = body.data && body.data.__type;
  if (!t) { console.error(JSON.stringify(body.errors || body, null, 2)); process.exit(1); }
  console.log("Available dimensions:");
  for (const f of t.fields) console.log("  " + f.name);
}

async function run(token, start, end) {
  const res = await fetch("https://api.cloudflare.com/client/v4/graphql", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: query(start, end) }),
  });
  const body = await res.json();
  if (body.errors && body.errors.length) {
    console.error("Cloudflare GraphQL returned errors:");
    for (const e of body.errors) console.error("  - " + (e.message || JSON.stringify(e)));
    process.exit(1);
  }
  const acct = body.data && body.data.viewer && body.data.viewer.accounts[0];
  if (!acct) { console.error("No account data returned — is the token scoped to this account?"); process.exit(1); }
  return acct;
}

const total = (rows) => rows.reduce((n, r) => n + r.count, 0);
const visitsOf = (a) => (a.totals[0] && a.totals[0].sum ? a.totals[0].sum.visits : 0);
const viewsOf = (a) => (a.totals[0] ? a.totals[0].count : 0);

// Cloudflare reports same-site navigation and unknown referrers alongside real
// referrals. Only the third bucket tells us whether a post did anything.
function bucketReferrers(rows) {
  const direct = [], internal = [], external = [];
  for (const r of rows) {
    const h = (r.dimensions.refererHost || "").toLowerCase();
    if (!h) direct.push(r);
    else if (h === "convene.md" || h === "www.convene.md") internal.push(r);
    else external.push(r);
  }
  return { direct: total(direct), internal: total(internal), external };
}

function delta(now, prev) {
  if (!prev) return now ? "new" : "—";
  const pct = Math.round(((now - prev) / prev) * 100);
  return `${pct >= 0 ? "+" : ""}${pct}%`;
}

// Experiments the owner logged, so each week's numbers sit next to what caused them.
function experimentsInWindow(start, end) {
  if (!fs.existsSync(EXPERIMENTS)) return [];
  const out = [];
  for (const line of fs.readFileSync(EXPERIMENTS, "utf8").split("\n")) {
    const m = line.match(/^\|\s*(\d{4}-\d{2}-\d{2})\s*\|(.*)\|\s*$/);
    if (!m) continue;
    const d = new Date(m[1] + "T12:00:00Z");
    if (d >= start && d < end) out.push({ date: m[1], rest: m[2].split("|").map((s) => s.trim()) });
  }
  return out;
}

function table(rows, label) {
  if (!rows.length) return `_none recorded_\n`;
  const w = Math.max(label.length, ...rows.map((r) => String(r.k).length));
  let s = `| ${label.padEnd(w)} | Views |\n| ${"-".repeat(w)} | ----: |\n`;
  for (const r of rows) s += `| ${String(r.k).padEnd(w)} | ${r.v} |\n`;
  return s;
}

(async () => {
  const token = tokenOrDie();
  if (process.argv.includes("--probe")) return probe(token);
  if (process.argv.includes("--probe-dims")) return probeDims(token);
  const end = new Date(day(new Date()) + "T00:00:00Z");         // midnight UTC today
  const start = new Date(end.getTime() - argDays * 86400000);
  const prevStart = new Date(start.getTime() - argDays * 86400000);

  const cur = await run(token, start, end);
  const prev = await run(token, prevStart, start);

  const views = viewsOf(cur), visits = visitsOf(cur);
  const pViews = viewsOf(prev), pVisits = visitsOf(prev);
  const refs = bucketReferrers(cur.referrers);
  const prevExternal = total(bucketReferrers(prev.referrers).external);
  const externalTotal = total(refs.external);

  const label = `${day(start)} → ${day(new Date(end.getTime() - 86400000))}`;
  const exps = experimentsInWindow(start, end);

  let md = `# convene.md traffic — ${label}\n\n`;
  md += `_${argDays}-day window, compared with the ${argDays} days before it. `;
  md += `Generated ${day(new Date())} from Cloudflare Web Analytics._\n\n`;

  // At convene.md's current volume Cloudflare's adaptive sampling scales a handful of real
  // events up by a fixed interval, so every figure lands on a round multiple. Saying so in
  // the report stops us reading "10 referred visits" as ten separate people.
  const allRound = [views, visits, externalTotal, refs.direct].every((n) => n % 10 === 0);
  if (allRound && views > 0) {
    md += `> **Read magnitudes loosely.** Every figure below is a multiple of 10, which means `;
    md += `Cloudflare's adaptive sampling is scaling up a small number of real events — `;
    md += `"10 visits" may be a single person. Trends and the direction of change are `;
    md += `meaningful; exact counts are not, and will not be until volume rises.\n\n`;
  }

  md += `## Headline\n\n`;
  md += `| Metric | This period | Previous | Change |\n| --- | ---: | ---: | ---: |\n`;
  md += `| Page views | ${views} | ${pViews} | ${delta(views, pViews)} |\n`;
  md += `| Visits | ${visits} | ${pVisits} | ${delta(visits, pVisits)} |\n`;
  md += `| **Referred visits** | **${externalTotal}** | ${prevExternal} | ${delta(externalTotal, prevExternal)} |\n\n`;

  md += `## Where it came from\n\n`;
  md += `Referred visits are the only number that reflects a post working. `;
  md += `Direct includes anyone who typed the URL — and, importantly, most in-app browsers `;
  md += `(Instagram, Reddit, LinkedIn) strip the referrer, so real social clicks hide in there.\n\n`;
  // Verified 26 Aug 2026: Cloudflare Web Analytics discards the query string — every
  // requestPath comes back as "/city/whistler/", never with "?utm_source=...". So utm tags
  // are invisible here and cannot separate social clicks from direct. A distinct PATH per
  // campaign (e.g. /go/maui/ redirecting onward) is the only thing this stack can attribute.
  md += `> Note: utm tags do **not** work with Cloudflare Web Analytics — it stores the path `;
  md += `and drops the query string. To attribute a campaign, give it its own path rather than `;
  md += `a query parameter.\n\n`;
  md += `- **Referred: ${externalTotal}**\n- Direct / unknown: ${refs.direct}\n- Internal navigation: ${refs.internal}\n\n`;
  md += table(refs.external.map((r) => ({ k: r.dimensions.refererHost, v: r.count })), "External referrer");

  md += `\n## Top pages\n\n`;
  md += table(cur.pages.map((r) => ({ k: r.dimensions.requestPath, v: r.count })), "Path");

  md += `\n## Countries\n\n`;
  md += table(cur.countries.map((r) => ({ k: r.dimensions.countryName, v: r.count })), "Country");

  md += `\n## Devices\n\n`;
  md += table(cur.devices.map((r) => ({ k: r.dimensions.deviceType || "unknown", v: r.count })), "Device");

  md += `\n## Day by day\n\n| Date | Views | Visits |\n| --- | ---: | ---: |\n`;
  for (const d of cur.daily) {
    md += `| ${d.dimensions.date} | ${d.count} | ${d.sum ? d.sum.visits : 0} |\n`;
  }

  md += `\n## What we tried in this window\n\n`;
  if (!exps.length) {
    md += `_Nothing logged in \`marketing/experiments.md\`. Log posts and outreach there `;
    md += `so the next report can attribute changes instead of guessing._\n`;
  } else {
    for (const e of exps) md += `- **${e.date}** — ${e.rest.filter(Boolean).join(" · ")}\n`;
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const outFile = path.join(OUT_DIR, `${day(new Date())}.md`);
  fs.writeFileSync(outFile, md);

  if (!fs.existsSync(HISTORY)) {
    fs.writeFileSync(HISTORY, "generated,window_start,window_end,days,page_views,visits,referred_visits,direct,internal\n");
  }
  fs.appendFileSync(HISTORY,
    [day(new Date()), day(start), day(new Date(end.getTime() - 86400000)), argDays,
     views, visits, externalTotal, refs.direct, refs.internal].join(",") + "\n");

  console.log(`traffic-report: ${outFile}`);
  console.log(`  ${views} views / ${visits} visits / ${externalTotal} referred (prev: ${pViews}/${pVisits}/${prevExternal})`);
  if (exps.length) console.log(`  ${exps.length} logged experiment(s) in window`);
})();
