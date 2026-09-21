#!/usr/bin/env node
// Drill into individual pageloads behind a referrer in the weekly traffic report.
//
//   node scripts/traffic-drilldown.js teams.public.onecdn.static.microsoft m365.cloud.microsoft
//   node scripts/traffic-drilldown.js chatgpt.com --days 7
//
// Prints one line per pageload: minute (UTC), country, device/OS/browser, landing path and
// the referrer path. That is everything Cloudflare Web Analytics knows — there is no IP,
// city, region or organisation, so "which hospital" is unanswerable from this data. To make
// a share attributable, give it its own path (e.g. /go/<name>) rather than a utm tag.
//
// Two things learned building this (2026-09-21):
//  - Use a MIDNIGHT-ALIGNED window of 7 days or less. The same query over "the last 8 days"
//    or 30 days comes back adaptively sampled (every count a multiple of 10) and low-volume
//    referrers vanish entirely; the day-aligned 7-day window returns exact counts.
//  - `refererHost_like` returns nothing; use `refererHost_in` with exact hosts.
//
// Token: ~/.config/convene/cloudflare-token or $CLOUDFLARE_API_TOKEN, as in traffic-report.js.
const fs = require("fs"), path = require("path");
const ACCOUNT_TAG = "86e2df40100c00350328477fcccf8a31";
const SITE_TAG = "f52c7677238046e6a6e393db9609d308";

const args = process.argv.slice(2);
const di = args.indexOf("--days");
const days = di > -1 ? Math.min(7, Math.max(1, parseInt(args[di + 1], 10) || 7)) : 7;
const hosts = args.filter((a, i) => a !== "--days" && (di === -1 || i !== di + 1));
if (!hosts.length) { console.error("usage: traffic-drilldown.js <refererHost> [<refererHost>...] [--days N<=7]"); process.exit(2); }

const token = process.env.CLOUDFLARE_API_TOKEN ||
  (fs.existsSync(path.join(process.env.HOME, ".config/convene/cloudflare-token"))
    ? fs.readFileSync(path.join(process.env.HOME, ".config/convene/cloudflare-token"), "utf8").trim() : null);
if (!token) { console.error("no Cloudflare token — see marketing/traffic/README.md"); process.exit(1); }

// Midnight-aligned: [today-days 00:00Z, today 00:00Z)
const end = new Date(); end.setUTCHours(0, 0, 0, 0);
const start = new Date(end.getTime() - days * 86400000);
const iso = (d) => d.toISOString().replace(/\.\d{3}Z$/, "Z");
const hostList = hosts.map((h) => JSON.stringify(h)).join(",");

const q = `{ viewer { accounts(filter: { accountTag: "${ACCOUNT_TAG}" }) {
  hits: rumPageloadEventsAdaptiveGroups(
    filter: { siteTag: "${SITE_TAG}", datetime_geq: "${iso(start)}", datetime_lt: "${iso(end)}", refererHost_in: [${hostList}] }
    limit: 200, orderBy: [datetimeMinute_ASC]
  ) { count dimensions { datetimeMinute countryName refererHost refererPath requestPath deviceType userAgentOS userAgentBrowser } }
} } }`;

(async () => {
  const res = await fetch("https://api.cloudflare.com/client/v4/graphql", {
    method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: q }) });
  const body = await res.json();
  if (body.errors) { console.error(JSON.stringify(body.errors, null, 2)); process.exit(1); }
  const hits = body.data.viewer.accounts[0].hits;
  console.log(`${iso(start)} → ${iso(end)}  referrer in [${hosts.join(", ")}]  —  ${hits.length} row(s)`);
  for (const h of hits) {
    const d = h.dimensions;
    console.log(`${d.datetimeMinute}  ${d.countryName}  ${d.deviceType}/${d.userAgentOS}/${d.userAgentBrowser}  ->  ${d.requestPath}   (${d.refererHost}${d.refererPath || "/"}${h.count > 1 ? ", n=" + h.count : ""})`);
  }
})();
