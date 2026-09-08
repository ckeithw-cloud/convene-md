#!/usr/bin/env node
// Diff the scriptable conference sources against conferences.js.
//
//   node scripts/diff-sources.js            # full run, writes a dated report
//   node scripts/diff-sources.js --source mer
//   node scripts/diff-sources.js --quiet    # report file only, no stdout detail
//
// WHY THIS EXISTS
// ~a third of the dataset sits on a handful of hosts that publish machine-readable
// catalogues (CloudCME's 15 provider instances, mer.org). Those can be checked in
// FULL every week for about a minute of HTTP — no searching, no model calls — so
// they should never be part of the weekly rotation. The rotation in
// marketing/scan-log.md exists for the ~415 bespoke society sites that genuinely
// cannot be enumerated; see that file for the split.
//
// This is also the only thing that looks at conferences we ALREADY hold. Everything
// else only ever hunts for missing events, so a meeting that moved city or was
// cancelled would sit wrong indefinitely. For a site whose pitch is "verified, unlike
// the aggregators", a wrong entry costs more than a missing one.
//
// It REPORTS, it does not edit. Scrapers misread pages, and silently rewriting dates
// from a regex would defeat the point. A human (or an agent run) applies the changes.

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const ROOT = path.join(__dirname, "..");
const OUTDIR = path.join(ROOT, "marketing", "source-diff");
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36";

const arg = (f, d) => { const i = process.argv.indexOf(f); return i > -1 ? process.argv[i + 1] : d; };
const QUIET = process.argv.includes("--quiet");
const ONLY = arg("--source", null);

// ---------------------------------------------------------------- dataset

const CONFERENCES = eval(
  "(function(){" + fs.readFileSync(path.join(ROOT, "conferences.js"), "utf8") + "\nreturn CONFERENCES;})()"
);
const TODAY = new Date().toISOString().slice(0, 10);

const norm = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "");

// A stable per-source key pulled out of the stored url. Entries that point at a
// category/listing page have no key -- those are reported separately, because
// update-prompt.md requires deep links and they cannot be tracked without one.
function datasetKey(url) {
  const eid = /[?&]EID=(\d+)/i.exec(url || "");
  if (eid) return "cloudcme:" + eid[1];
  const mer = /mer\.org\/conference\/+([A-Za-z0-9=+/]+)/.exec(url || "");
  if (mer) return "mer:" + mer[1];
  return null;
}

const byKey = new Map();
const byNameDate = new Map();
for (const c of CONFERENCES) {
  const k = datasetKey(c.url);
  if (k) byKey.set(k, c);
  byNameDate.set(norm(c.name) + "|" + c.startDate, c);
}

// Exact key and exact name+date are not enough. The same conference is routinely held
// under a different URL (a department page rather than the CloudCME course) and a slightly
// different title ("48th Annual Echo Northwestern" vs "... 2026", "UCSF Liver Symposium"
// vs "UCSF Liver Transplant Symposium 2026"). Without this, 49 of 130 candidates in the
// first full run were conferences we already held -- acting on that list would have
// created 49 duplicates. Match on token overlap within a +/-3 day window, the same test
// used by hand when this was caught.
const STOP = new Set(["the","of","and","for","in","on","annual","update","conference",
  "symposium","course","meeting","summit","review","advances","current",
  "2026","2027","2028","2029"]);
const toks = (n) => new Set(
  String(n || "").toLowerCase().match(/[a-z0-9]+/g)?.filter(w => w.length > 2 && !STOP.has(w)) || []);
const dayNum = (d) => Date.parse(d + "T00:00:00Z") / 86400000;

function fuzzyHeld(name, startDate) {
  const ct = toks(name);
  if (!ct.size || !startDate) return null;
  const cs = dayNum(startDate);
  for (const e of CONFERENCES) {
    if (Math.abs(dayNum(e.startDate) - cs) > 3) continue;
    const et = toks(e.name);
    if (!et.size) continue;
    let shared = 0;
    for (const w of ct) if (et.has(w)) shared++;
    if (shared / Math.min(ct.size, et.size) >= 0.6) return e;
  }
  return null;
}

// ---------------------------------------------------------------- sources

// Hosts are taken from the dataset itself rather than hard-coded guesses: an earlier
// pass probed a guessed list and missed yale, scripps, ucsd and uofuhealth entirely.
function cloudcmeHosts() {
  const set = new Set();
  for (const c of CONFERENCES) {
    const m = /https?:\/\/([a-z0-9-]+\.cloud-cme\.com)/i.exec(c.url || "");
    if (m) set.add(m[1].toLowerCase());
  }
  return [...set].sort();
}

// Most of a CloudCME catalogue is faculty development, remedial programmes and
// certificate courses. Same bar the manual sweeps use, so the NEW list stays readable.
// Widened after the first full run: the original missed whole categories that the
// audience rule or the "not a conference" rule excludes anyway -- Project ECHO
// telementoring series, "Master Clinician Series"-style monthly RSS, instructor
// certification, and anything explicitly aimed at APPs or nurses.
const JUNK = /T4UCSF|faculty development|fellowship|maintenance of certification|MOCA|grand round|journal club|tumou?r board|distressed physician|proper prescribing|research ethics|improvement science|certificate course|master of science|orientation|onboarding|advanced practice provider|\bAPP\b|for nurses|nursing|master clinician series|\bECHO\b|introductory training|instructor certification|didactic workshop|scholarship program|simulation training/i;

async function fetchCloudCME() {
  const out = [];
  for (const host of cloudcmeHosts()) {
    let rows;
    try {
      const raw = execFileSync("python3", [path.join(__dirname, "scrape-cloudcme.py"), host], {
        encoding: "utf8", maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", "ignore"], timeout: 180000
      });
      rows = JSON.parse(raw);
    } catch (e) {
      out.push({ __error: `${host}: ${String(e.message || e).split("\n")[0]}` });
      continue;
    }
    for (const r of rows) {
      const [s, e] = parseWhen(r.when);
      out.push({
        key: "cloudcme:" + r.eid,
        source: host,
        name: r.name,
        startDate: s,
        endDate: e,
        venue: r.where || "",
        online: !r.where || /\bonline\b|\bvirtual\b|internet live/i.test(r.where),
        cat1: !!r.cat1,
        hours: r.hours,
        url: r.url,
        junk: JUNK.test(r.name)
      });
    }
  }
  return out;
}

const MONTHS3 = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const MONTHSF = ["January","February","March","April","May","June","July","August","September","October","November","December"];

// CloudCME renders "Friday, October 23, 2026, 8:00 AM - 5:00 PM" or a two-date range.
function parseWhen(when) {
  const ds = [...String(when || "").matchAll(new RegExp(`(${MONTHSF.join("|")})\\s+(\\d{1,2}),\\s*(\\d{4})`, "g"))];
  if (!ds.length) return [null, null];
  const f = (m) => `${m[3]}-${String(MONTHSF.indexOf(m[1]) + 1).padStart(2, "0")}-${String(m[2]).padStart(2, "0")}`;
  return [f(ds[0]), f(ds[ds.length - 1])];
}

// mer.org month pages are server-rendered; same access pattern as scripts/import-mer.js.
const b64 = (s) => Buffer.from(s).toString("base64");
const dec = (s) => String(s).replace(/&amp;/g, "&").replace(/&#x27;|&#039;|&apos;/g, "'")
  .replace(/&quot;/g, '"').replace(/&nbsp;/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
  .replace(/\s+/g, " ").trim();

async function get(u, tries = 4) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(u, { headers: { "User-Agent": UA }, redirect: "follow" });
      if (!r.ok) throw new Error("http " + r.status);
      return await r.text();
    } catch (e) {
      if (i === tries - 1) throw e;
      await new Promise((r) => setTimeout(r, 600 * (i + 1)));
    }
  }
}

function merDates(d) {
  let m = d.match(/^(\w{3})\s+(\d{1,2})-(\d{1,2}),\s*(\d{4})$/);
  if (m) {
    const mo = String(MONTHS3.indexOf(m[1]) + 1).padStart(2, "0");
    return [`${m[4]}-${mo}-${m[2].padStart(2, "0")}`, `${m[4]}-${mo}-${m[3].padStart(2, "0")}`];
  }
  m = d.match(/^(\w{3})\s+(\d{1,2})\s*-\s*(\w{3})\s+(\d{1,2}),\s*(\d{4})$/);
  if (m) {
    const a = String(MONTHS3.indexOf(m[1]) + 1).padStart(2, "0");
    const b = String(MONTHS3.indexOf(m[3]) + 1).padStart(2, "0");
    return [`${m[5]}-${a}-${m[2].padStart(2, "0")}`, `${m[5]}-${b}-${m[4].padStart(2, "0")}`];
  }
  return [null, null];
}

async function fetchMER() {
  const months = [];
  const now = new Date();
  for (let i = 0; i < 18; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    months.push(`${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()}`);
  }
  const seen = new Map();
  const out = [];
  for (const mo of months) {
    let html;
    try { html = await get(`https://www.mer.org/conference-schedule//${b64(mo)}`); }
    catch (e) { out.push({ __error: `mer.org ${mo}: ${String(e.message || e).split("\n")[0]}` }); continue; }
    // Card markup: the title anchor, then the date and location in SIBLING divs.
    // An earlier version captured only the anchor's own text, so every record came
    // back date-less, the source yielded 0 rows, and all 156 MER entries were
    // reported "gone". Keep the sibling divs in the pattern.
    // `class="header"` also avoids the decoy `/view-agenda` link on the same card.
    const re = /<a class="header"\s+href="(https:\/\/www\.mer\.org\/conference\/\/[^"]+)">([\s\S]*?)<\/a>[\s\S]{0,300}?date_label">[\s\S]*?<\/i>\s*([^<]*?)<\/div>[\s\S]{0,300}?<div class="description">\s*([^<]*?)<\/div>/g;
    let m;
    while ((m = re.exec(html))) {
      const url = m[1];
      const cid = (url.match(/conference\/+([^/"]+)/) || [])[1];
      if (!cid || seen.has(cid)) continue;
      const [s, e] = merDates(dec(m[3]));
      if (!s) continue;
      seen.set(cid, true);
      out.push({
        key: "mer:" + cid, source: "mer.org",
        name: dec(m[2]), startDate: s, endDate: e,
        venue: dec(m[4]), online: false, cat1: true, hours: null,
        url, junk: false
      });
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  return out;
}

const SOURCES = { cloudcme: fetchCloudCME, mer: fetchMER };

// ---------------------------------------------------------------- diff

(async () => {
  const errors = [];
  let live = [];
  for (const [name, fn] of Object.entries(SOURCES)) {
    if (ONLY && ONLY !== name) continue;
    process.stderr.write(`  fetching ${name} ...\n`);
    const rows = await fn();
    for (const r of rows) (r.__error ? errors : live).push(r.__error || r);
  }

  const liveKeys = new Set(live.map((r) => r.key));

  // A source yielding zero live records means the scraper broke, not that every
  // conference was cancelled. Without this guard a single markup change on mer.org
  // produced a report claiming 156 events had disappeared. Suppress "gone" for any
  // source prefix that came back empty, and say so loudly instead.
  const emptySources = [];
  for (const prefix of ["cloudcme", "mer"]) {
    if (ONLY && ONLY !== prefix) continue;
    const liveN = live.filter((r) => r.key.startsWith(prefix + ":")).length;
    const heldN = CONFERENCES.filter((c) => c.endDate >= TODAY && (datasetKey(c.url) || "").startsWith(prefix + ":")).length;
    if (liveN === 0 && heldN > 0) {
      emptySources.push(`${prefix}: fetched 0 live records but ${heldN} entries are held — treating as a scraper failure, "gone" suppressed for this source`);
    }
  }
  const suppressed = new Set(emptySources.map((e) => e.split(":")[0]));
  const isNew = [], changed = [], gone = [], badLink = [];

  for (const r of live) {
    if (!r.startDate || r.endDate < TODAY) continue;
    // Identity confidence matters here, and the two checks need different bars.
    //
    // A KEY match (same EID / MER id) is proof of identity, so it can drive the
    // "changed dates" report. A FUZZY match is only evidence that we probably already
    // hold this event -- good enough to suppress a duplicate, NOT good enough to claim a
    // date changed. Letting fuzzy matches feed "changed" produced cross-institution
    // nonsense on the first run: Mount Sinai's "Echo NY 2026" paired with a WashU record,
    // "Dubai Derma" with a Utah listing. Acting on those would have corrupted correct rows.
    const exact = byKey.get(r.key) || byNameDate.get(norm(r.name) + "|" + r.startDate);
    const held = exact || fuzzyHeld(r.name, r.startDate);
    if (!held) {
      // Only surface plausible additions, else the report is mostly noise.
      if (r.online || r.junk || !r.cat1) continue;
      if (r.hours != null && r.hours < 4) continue;
      isNew.push(r);
      continue;
    }
    if (!exact) continue;   // fuzzy-only: suppress the duplicate, assert nothing about dates
    const d = [];
    if (exact.startDate !== r.startDate) d.push(`start ${exact.startDate} → ${r.startDate}`);
    if (exact.endDate !== r.endDate) d.push(`end ${exact.endDate} → ${r.endDate}`);
    if (d.length) changed.push({ held: exact, r, diffs: d });
  }

  // Anything we hold whose source key has vanished from the live catalogue.
  const coveredHosts = new Set([...cloudcmeHosts(), "www.mer.org", "mer.org"]);
  for (const c of CONFERENCES) {
    if (c.endDate < TODAY) continue;
    let host = "";
    try { host = new URL(c.url).host.toLowerCase(); } catch (e) { /* ignore */ }
    if (!coveredHosts.has(host)) continue;
    const k = datasetKey(c.url);
    if (!k) { badLink.push(c); continue; }
    if (ONLY && !k.startsWith(ONLY)) continue;
    if (suppressed.has(k.split(":")[0])) continue;
    if (!liveKeys.has(k)) gone.push(c);
  }

  // A delisted course usually still has a live page (registration merely closed).
  // Probing the handful of "gone" URLs makes the difference visible in the report
  // instead of leaving every row ambiguous. Only runs for the gone set, so it is cheap.
  for (const c of gone) {
    try {
      const r = await fetch(c.url, { headers: { "User-Agent": UA }, redirect: "follow" });
      c.__alive = r.ok ? "still live" : `HTTP ${r.status}`;
    } catch (e) {
      c.__alive = "unreachable";
    }
  }

  // ------------------------------------------------------------- report
  const L = [];
  L.push(`# Source diff — ${TODAY}`);
  L.push("");
  L.push(`Machine-readable sources checked in full: **${cloudcmeHosts().length} CloudCME instances + mer.org**.`);
  L.push(`Live records fetched: **${live.length}**. Dataset entries on those hosts: **${CONFERENCES.filter(c => { let h=""; try{h=new URL(c.url).host.toLowerCase()}catch(e){} return coveredHosts.has(h) && c.endDate >= TODAY; }).length}**.`);
  L.push("");
  L.push("This is a report, not an edit. Scrapers misread pages; apply changes by hand after checking the source.");
  L.push("");

  const sec = (title, n, body) => { L.push(`## ${title} (${n})`); L.push(""); body(); L.push(""); };

  sec("Changed dates", changed.length, () => {
    if (!changed.length) return L.push("_None._");
    L.push("| Conference | Change | Source |");
    L.push("| --- | --- | --- |");
    for (const { held, r, diffs } of changed.sort((a, b) => a.held.startDate < b.held.startDate ? -1 : 1))
      L.push(`| ${held.name.slice(0, 60)} | ${diffs.join("; ")} | [${r.source}](${r.url}) |`);
  });

  sec("Gone from source", gone.length, () => {
    if (!gone.length) return L.push("_None._");
    L.push("Dropped out of the provider's live listing. That is NOT the same as cancelled — a course");
    L.push("often leaves the listing simply because registration closed, while its own page stays up.");
    L.push("The `page` column separates the two. Verify before changing anything.");
    L.push("");
    L.push("| Conference | Dates | Page | URL |");
    L.push("| --- | --- | --- | --- |");
    for (const c of gone.sort((a, b) => a.startDate < b.startDate ? -1 : 1))
      L.push(`| ${c.name.slice(0, 56)} | ${c.startDate} → ${c.endDate} | ${c.__alive} | ${c.url} |`);
  });

  sec("New candidates", isNew.length, () => {
    if (!isNew.length) return L.push("_None._");
    L.push("In-person, Category 1, ≥4 credits, not a faculty-development/RSS pattern. Still needs the usual verification before adding.");
    L.push("");
    L.push("| Dates | Conference | Venue | Source |");
    L.push("| --- | --- | --- | --- |");
    for (const r of isNew.sort((a, b) => a.startDate < b.startDate ? -1 : 1))
      L.push(`| ${r.startDate} → ${r.endDate} | [${r.name.slice(0, 58)}](${r.url}) | ${r.venue.slice(0, 40)} | ${r.source} |`);
  });

  sec("Entries with no deep link", badLink.length, () => {
    if (!badLink.length) return L.push("_None._");
    L.push("These point at a category/listing page rather than the course, so they cannot be tracked by this diff and break update-prompt.md's deep-link rule. Worth repointing.");
    L.push("");
    const g = {};
    for (const c of badLink) (g[c.url] = g[c.url] || []).push(c.name);
    for (const [u, names] of Object.entries(g).sort((a, b) => b[1].length - a[1].length))
      L.push(`- \`${u}\` — ${names.length} entr${names.length === 1 ? "y" : "ies"}: ${names.slice(0, 3).map(n => n.slice(0, 44)).join("; ")}${names.length > 3 ? " …" : ""}`);
  });

  if (emptySources.length) sec("Scraper failures", emptySources.length, () => {
    L.push("**A source returned nothing.** This is almost always a markup change, not mass cancellation. Fix the scraper before trusting anything else in this report.");
    L.push("");
    emptySources.forEach((e) => L.push(`- ${e}`));
  });
  if (errors.length) sec("Fetch errors", errors.length, () => errors.forEach((e) => L.push(`- ${e}`)));

  fs.mkdirSync(OUTDIR, { recursive: true });
  const out = path.join(OUTDIR, `${TODAY}.md`);
  fs.writeFileSync(out, L.join("\n") + "\n");

  console.log(`diff-sources: ${out}`);
  console.log(`  ${live.length} live records | changed ${changed.length} | gone ${gone.length} | new ${isNew.length} | no-deep-link ${badLink.length}${errors.length ? ` | errors ${errors.length}` : ""}`);
  if (!QUIET && (changed.length || gone.length)) {
    for (const { held, diffs } of changed) console.log(`  CHANGED  ${held.name.slice(0, 56)} — ${diffs.join("; ")}`);
    for (const c of gone) console.log(`  GONE     ${c.name.slice(0, 56)} (${c.startDate})`);
  }
})().catch((e) => { console.error("diff-sources failed:", e); process.exit(1); });
