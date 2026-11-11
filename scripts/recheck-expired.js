// Re-check EXPIRED conferences for the next year's edition.
//
// WHY THIS EXISTS
// Attrition is the dataset's biggest leak. The 9 Nov 2026 run expired 90 entries and found
// 10, and upcoming fell 1,376 -> 1,310 even after 22 hand-added rows. But a conference that
// ran once is the single best predictor of a conference that will run again: a society's
// 21st annual meeting is overwhelmingly likely to hold a 22nd. diff-sources.js cannot see
// any of this -- it watches a watch list derived from LIVE entries, so the moment a row
// expires it leaves the scanner's field of view permanently. This script is the other half:
// it looks only at what has already ended, and asks whether the successor is announced.
//
// IT REPORTS, IT DOES NOT EDIT -- same rule as diff-sources.js. A scraped date is a guess
// about which heading on a page belongs to which event, and this dataset's rule is that
// dates come from the organising society's own page read by a human. The script's job is to
// hand that human a short, ranked, evidence-carrying worklist instead of 662 expired rows.
//
// Usage:
//   node scripts/recheck-expired.js                 # full run, writes a dated report
//   node scripts/recheck-expired.js --limit 40      # cap the fetches
//   node scripts/recheck-expired.js --worklist-only # skip fetching, just list the gaps
const fs = require("fs");
const path = require("path");
const { conferenceDay, localDay } = require("./day.js");

const ROOT = path.join(__dirname, "..");
const OUTDIR = path.join(ROOT, "marketing", "recurrence");
const IGNORE = path.join(ROOT, "marketing", "recurrence-ignore.json");
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36";

const arg = (f, d) => { const i = process.argv.indexOf(f); return i > -1 ? process.argv[i + 1] : d; };
const LIMIT = +arg("--limit", 0) || 0;
const WORKLIST_ONLY = process.argv.includes("--worklist-only");
const TODAY = conferenceDay();      // event cutoff: "is this conference over?"
const REPORT_DAY = localDay();      // this report's own date

const CONFERENCES = eval(
  "(function(){" + fs.readFileSync(path.join(ROOT, "conferences.js"), "utf8") + "\nreturn CONFERENCES;})()");

// ---------------------------------------------------------------------------
// Does this expired row already have a successor in the dataset?
//
// Matching on the full hostname is too strict and produces phantom gaps. EFORT's 2026 row
// sits on www.efort.org and its 2027 row on congress.efort.org, under organizer "EFORT"
// rather than the full federation name -- so a host+organizer test called it an orphan while
// the successor was two screens away in the same file. Comparing the registrable domain and
// the acronyms in the name cleared 56 of 262 phantom gaps on the first run. Each phantom
// costs a human page-read, which is the scarce resource here, so this is worth the care.
const SLD = new Set(["co", "com", "org", "net", "ac", "gov", "edu", "or", "ne"]);
function regDomain(u) {
  try {
    const p = new URL(u).host.replace(/^www\./, "").split(".");
    if (p.length > 2 && SLD.has(p[p.length - 2])) return p.slice(-3).join(".");
    return p.slice(-2).join(".");
  } catch (e) { return ""; }
}
function acronyms(c) {
  const s = new Set();
  (c.name.match(/\b[A-Z][A-Z0-9]{2,}\b/g) || []).forEach((a) => s.add(a));
  const o = String(c.organizer || "").trim();
  // An all-caps/short organizer field IS the acronym ("EFORT", "EACTS / STS / LACES").
  if (/^[A-Z0-9 /&.-]{2,24}$/.test(o)) o.split(/[^A-Z0-9]+/).filter((x) => x.length > 2).forEach((a) => s.add(a));
  return s;
}

const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
const ignoreKey = (c) => `recur:${regDomain(c.url)}:${slug(c.name)}`;

let DECLINED = {};
try { DECLINED = JSON.parse(fs.readFileSync(IGNORE, "utf8")); } catch (e) { DECLINED = {}; }

const past = CONFERENCES.filter((c) => c.endDate < TODAY);
const future = CONFERENCES.filter((c) => c.endDate >= TODAY);
const futureDomains = new Set(future.map((c) => regDomain(c.url)));
const futureAcronyms = new Set();
future.forEach((c) => acronyms(c).forEach((a) => futureAcronyms.add(a)));

const declinedHits = new Set();
const gaps = past.filter((p) => {
  if (futureDomains.has(regDomain(p.url))) return false;
  for (const a of acronyms(p)) if (futureAcronyms.has(a)) return false;
  if (DECLINED[ignoreKey(p)]) { declinedHits.add(ignoreKey(p)); return false; }
  return true;
});

// A society that holds a numbered annual meeting is the strongest recurrence bet, so those
// sort to the top of the worklist. Everything else keeps its place.
const RECUR = /annual|congress|\bmeeting\b|symposium|\d+(st|nd|rd|th)\b|biennial/i;
gaps.sort((a, b) => (RECUR.test(b.name) ? 1 : 0) - (RECUR.test(a.name) ? 1 : 0)
  || a.name.localeCompare(b.name));

// ---------------------------------------------------------------------------
// Date extraction. Deliberately permissive about FORMAT and strict about WINDOW: anything
// it finds is quoted back with surrounding text for a human to judge, so a false positive
// costs a glance, while a missed format costs a conference. Only dates from tomorrow to
// ~30 months out count -- a page full of "© 2027" or a 2026 archive listing is noise.
const MONTHS = ["january","february","march","april","may","june","july","august","september","october","november","december"];
const MON3 = MONTHS.map((m) => m.slice(0, 3));
const monthNum = (w) => {
  const s = String(w).toLowerCase().replace(/\./g, "");
  let i = MONTHS.indexOf(s); if (i > -1) return i + 1;
  i = MON3.indexOf(s.slice(0, 3)); return i > -1 ? i + 1 : 0;
};
const MAXDATE = conferenceDay(Date.now() + 30 * 30.5 * 86400000);

// Page furniture that carries a timestamp but never an event date. The visitor-counter
// widget on thairheumatology.org was the worst case: it printed today's date next to the
// VISITOR'S OWN IP ADDRESS, which the first run copied verbatim into a report that gets
// committed and pushed to a public repo. Dates in this company are dropped, and any
// address-shaped token is redacted from every snippet regardless -- a report is a file
// that leaves this machine, so nothing scraped goes into one unfiltered.
const SNIP_NOISE = /your ip|visitors? counter|vinaora|hit ?counter|last (updated|modified)|©|copyright|cookie|privacy polic|session expir|page generated/i;
const REDACT = (s) => s
  .replace(/\b\d{1,3}(\.\d{1,3}){3}\b/g, "[ip]")
  .replace(/\b(?:[0-9a-f]{1,4}:){3,7}[0-9a-f]{0,4}\b/gi, "[ip]");

function futureDates(text) {
  const out = new Map(); // iso -> snippet
  const add = (y, m, d, idx) => {
    if (!y || !m || !d) return;
    const iso = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    if (iso <= TODAY || iso > MAXDATE) return;
    const raw = text.slice(Math.max(0, idx - 70), idx + 90).replace(/\s+/g, " ").trim();
    if (SNIP_NOISE.test(raw)) return;
    if (!out.has(iso)) out.set(iso, REDACT(raw));
  };
  let m;
  // "19-21 May 2027" / "19 May 2027"
  const re1 = /\b(\d{1,2})(?:\s*[–—-]\s*\d{1,2})?\s+([A-Za-z]{3,10})\.?,?\s+(20\d\d)/g;
  while ((m = re1.exec(text))) add(m[3], monthNum(m[2]), m[1], m.index);
  // "May 19-21, 2027" / "May 19, 2027"
  const re2 = /\b([A-Za-z]{3,10})\.?\s+(\d{1,2})(?:\s*[–—-]\s*\d{1,2})?(?:st|nd|rd|th)?,?\s+(20\d\d)/g;
  while ((m = re2.exec(text))) add(m[3], monthNum(m[1]), m[2], m.index);
  // ISO
  const re3 = /\b(20\d\d)-(\d{2})-(\d{2})\b/g;
  while ((m = re3.exec(text))) add(m[1], m[2], m[3], m.index);
  return [...out.entries()].sort((a, b) => a[0].localeCompare(b[0]));
}

const strip = (html) => html
  .replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ")
  .replace(/<[^>]+>/g, " ")
  .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&#8211;|&ndash;/g, "-")
  .replace(/&[a-z#0-9]+;/gi, " ").replace(/\s+/g, " ");

async function get(url) {
  try {
    const r = await fetch(url, {
      redirect: "follow", signal: AbortSignal.timeout(25000),
      headers: { "User-Agent": UA, "Accept": "text/html,*/*" },
    });
    const body = r.ok ? await r.text() : "";
    return { status: r.status, url: r.url, body };
  } catch (e) { return { status: 0, url, body: "", err: String(e.message || e).slice(0, 60) }; }
}

// A year-stamped url (isw2026.org, events.aats.org/am26) is dead the moment the event ends,
// so the successor lives at a DIFFERENT address. Guessing it is cheap and the guess either
// resolves or it does not -- a 200 on the +1 variant is a strong, checkable lead.
function nextYearUrls(url, year) {
  const out = new Set();
  const y = String(year), y1 = String(year + 1);
  if (url.includes(y)) out.add(url.split(y).join(y1));
  const s = y.slice(2), s1 = y1.slice(2);
  if (new RegExp(`[a-z]${s}\\b`).test(url)) out.add(url.replace(new RegExp(`([a-z])${s}\\b`), `$1${s1}`));
  out.delete(url);
  return [...out];
}

(async () => {
  if (!fs.existsSync(OUTDIR)) fs.mkdirSync(OUTDIR, { recursive: true });

  const rows = [];
  const todo = LIMIT ? gaps.slice(0, LIMIT) : gaps;

  if (!WORKLIST_ONLY) {
    const POOL = 6;
    let i = 0;
    await Promise.all(Array.from({ length: POOL }, async () => {
      while (i < todo.length) {
        const c = todo[i++];
        const r = await get(c.url);
        const hits = r.body ? futureDates(strip(r.body)) : [];
        let guess = null;
        if (!hits.length) {
          for (const u of nextYearUrls(c.url, +c.startDate.slice(0, 4))) {
            const g = await get(u);
            if (g.status === 200 && g.body.length > 500) {
              // A society that has not built next year's site yet often 302s the guessed
              // address to its generic homepage. That is a soft 404, not a lead, and it
              // ranked above real finds on the first run -- so say so in the report.
              // Serving the guessed address as-asked is a real lead. Bouncing it somewhere
              // that does not carry the year is the society's "no such page" behaviour.
              const y1 = String(+c.startDate.slice(0, 4) + 1);
              const samePath = new URL(g.url).pathname.replace(/\/+$/, "")
                            === new URL(u).pathname.replace(/\/+$/, "");
              const soft = !samePath && !new URL(g.url).pathname.includes(y1);
              guess = { url: u, final: g.url, soft, dates: futureDates(strip(g.body)).slice(0, 3) };
              break;
            }
          }
        }
        rows.push({ c, status: r.status, err: r.err, hits: hits.slice(0, 4), guess });
        process.stderr.write(`\r  checked ${rows.length}/${todo.length}   `);
      }
    }));
    process.stderr.write("\n");
  }

  // Rank: a future date on the society's own page is the only thing worth a human's first
  // minute; a resolving +1 url is second; a page that is simply still up is last.
  const tier = (r) => (r.hits.length ? 0 : (r.guess && !r.guess.soft) ? 1 : r.status === 200 ? 2 : 3);
  rows.sort((a, b) => tier(a) - tier(b) || a.c.name.localeCompare(b.c.name));

  const L = [];
  L.push(`# Expired-conference recurrence check — ${REPORT_DAY}`, "");
  L.push(`Expired rows in dataset: **${past.length}**`);
  L.push(`Expired with a successor already held: **${past.length - gaps.length - declinedHits.size}**`);
  L.push(`Previously declined, suppressed this run: **${declinedHits.size}**`);
  L.push(`**Gaps to chase: ${gaps.length}**${LIMIT ? ` (checked ${todo.length} this run)` : ""}`, "");
  L.push("Nothing below is added automatically. Confirm the date and city on the society's own");
  L.push("page, then add with `node scripts/add-conferences.js`. Dead ends belong in");
  L.push("`marketing/recurrence-ignore.json` so they stop resurfacing every week.", "");

  const g = (n) => rows.filter((r) => tier(r) === n);
  const section = (title, list, note) => {
    if (!list.length) return;
    L.push(`## ${title} (${list.length})`, "");
    if (note) L.push(note, "");
    list.forEach((r) => {
      L.push(`- **${r.c.name}**`);
      L.push(`  - last held ${r.c.startDate} → ${r.c.endDate}, ${r.c.city}, ${r.c.country} · ${r.c.specialty}`);
      L.push(`  - ${r.c.url}${r.status && r.status !== 200 ? ` (HTTP ${r.status})` : ""}${r.err ? ` (${r.err})` : ""}`);
      r.hits.forEach(([iso, snip]) => L.push(`  - **${iso}** — "${snip}"`));
      if (r.guess) {
        L.push(`  - next-year url resolves: ${r.guess.url}${r.guess.final !== r.guess.url ? ` → ${r.guess.final}` : ""}`
          + (r.guess.soft ? "  ⚠︎ redirected to a generic page — probably not a new edition" : ""));
        r.guess.dates.forEach(([iso, snip]) => L.push(`    - **${iso}** — "${snip}"`));
      }
      L.push(`  - ignore key: \`${ignoreKey(r.c)}\``);
    });
    L.push("");
  };

  if (WORKLIST_ONLY) {
    L.push(`## Worklist (${gaps.length})`, "");
    gaps.forEach((c) => L.push(`- ${c.startDate} · ${c.name} · ${c.url}`));
  } else {
    section("Future date found on the society's own page", g(0),
      "Strongest leads. The date below was read off the page the expired row already points at.");
    section("Next-year url resolves", g(1),
      "No date parsed, but the +1-year address is live — usually the new edition's site before it is fully populated.");
    section("Page still up, no future date", g(2),
      "Either the successor is not announced yet or the date sits in an image or a script. Worth one look, low yield.");
    section("Page gone or unreachable", g(3),
      "The society may have moved domains. Only chase these if the meeting matters.");
  }

  const out = path.join(OUTDIR, `${REPORT_DAY}.md`);
  fs.writeFileSync(out, L.join("\n") + "\n");
  console.log(`recheck-expired: ${gaps.length} gap(s), ${declinedHits.size} suppressed → ${path.relative(ROOT, out)}`);
  if (!WORKLIST_ONLY) {
    console.log(`  with a future date on their own page: ${g(0).length}`);
    console.log(`  next-year url resolves:               ${g(1).length}`);
    console.log(`  page up, nothing parsed:              ${g(2).length}`);
    console.log(`  page gone/unreachable:                ${g(3).length}`);
  }
})();
