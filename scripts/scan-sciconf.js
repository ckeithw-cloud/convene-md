// Scan sciconf.cn (Medcon / 会务通) for upcoming Chinese physician congresses.
//
// WHY THIS EXISTS
// On 16 Nov 2026 /country/china/ was the site's third-most-visited page -- 50 views in a
// week, behind only /country/usa/ and /country/uk/ -- with four upcoming conferences, three
// of which expired that same week. The page was about to show one. The cause was not thin
// research: China's catalogue was 22 Chinese Medical Association national congresses, and
// every one of their 2026 editions had run. Hand-adding a dozen 2027 rows fixed that day.
// It does not fix next year, which is what this script is for.
//
// WHY THIS SOURCE IS NOT AN AGGREGATOR
// The rule is that dates come from the organising society's own page, never from
// conferenceindex / 10times / allconferencealert and the rest, which fabricate templated
// listings. sciconf.cn is the opposite kind of thing: it is the conference-management
// platform the CMA and the provincial medical associations run their OWN congress sites on
// (they are listed as its tenants), so ccsn2026.sciconf.cn IS the Chinese Society of
// Nephrology's official congress site -- the same relationship through which we already
// scan CloudCME and mer.org. The directory is discovery; the subdomain is the primary source.
//
// IT REPORTS, IT DOES NOT EDIT -- same rule as diff-sources.js and recheck-expired.js. The
// cards here are rich enough to tempt a direct append and must not be trusted that far:
// the live directory contains a card dated "2017年12月01日-2107年12月03日", cards whose end
// date is a registration deadline years out, and plenty of entries that are not conferences
// at all ("个人会员财务收费" -- member fee payment). Every row this prints still has to be
// opened and read before it becomes a record.
//
// Two sections come out:
//   1. CANDIDATES -- upcoming congresses not already in the dataset, ranked.
//   2. DATE DRIFT -- sciconf urls we already hold where the platform's dates disagree with
//      ours. This is not hypothetical: it is how the 27th CMA National Congress of Internal
//      Medicine was caught on 16 Nov 2026 holding 17-19 September when its own site said
//      4-6 December, so it had expired two months early and hidden a live conference.
//
// Usage:
//   node scripts/scan-sciconf.js              # full crawl, writes a dated report
//   node scripts/scan-sciconf.js --pages 20   # cap the crawl
const fs = require("fs");
const path = require("path");
const { conferenceDay, localDay } = require("./day.js");

const ROOT = path.join(__dirname, "..");
const OUTDIR = path.join(ROOT, "marketing", "sciconf");
const IGNORE = path.join(ROOT, "marketing", "sciconf-ignore.json");
const LIST = "https://www.sciconf.cn/cn/meeting-list";
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36";

const arg = (f, d) => { const i = process.argv.indexOf(f); return i > -1 ? process.argv[i + 1] : d; };
const MAXPAGES = +arg("--pages", 0) || 120;
const TODAY = conferenceDay();   // event cutoff: "is this conference over?"
const REPORT_DAY = localDay();   // this report's own date

const CONFERENCES = eval(
  "(function(){" + fs.readFileSync(path.join(ROOT, "conferences.js"), "utf8") + "\nreturn CONFERENCES;})()");

let DECLINED = {};
try { DECLINED = JSON.parse(fs.readFileSync(IGNORE, "utf8")); } catch (e) { DECLINED = {}; }

// Reports land in a public repo, so nothing scraped goes in unredacted. A visitor-counter
// widget on thairheumatology.org once printed the fetching machine's public IP beside the
// date, and the first draft of a recurrence report copied it verbatim.
const REDACT = (s) => String(s || "")
  .replace(/\b\d{1,3}(\.\d{1,3}){3}\b/g, "[ip]")
  .replace(/\b(?:[0-9a-f]{1,4}:){3,7}[0-9a-f]{0,4}\b/gi, "[ip]");

// Both subdomain shapes appear: named (ccos2026.sciconf.cn) and numeric (42684.sciconf.cn).
const sciKey = (u) => {
  const m = /^https?:\/\/([^./]+)\.sciconf\.cn/i.exec(u || "");
  return m ? `sciconf:${m[1].toLowerCase()}` : "";
};
const OURS = new Map();
for (const c of CONFERENCES) { const k = sciKey(c.url); if (k) OURS.set(k, c); }

const clean = (x) => REDACT(String(x || "")
  .replace(/<[^>]+>/g, "")
  .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&")
  .replace(/&[a-z#0-9]+;/gi, " ").replace(/\s+/g, " ").trim());

// Four date shapes live in these cards, and only the first two are common:
//   2026年11月19-22日   2026年12月4日-6日   2026年11月04日-12月24日   2026年10月23日-2027年10月25日
const pad = (n) => String(+n).padStart(2, "0");
function parseSpan(s) {
  const t = String(s).replace(/\s+/g, "");
  let m = /^(\d{4})年(\d{1,2})月(\d{1,2})日?[-—~至](\d{1,2})日$/.exec(t);
  if (m) return [`${m[1]}-${pad(m[2])}-${pad(m[3])}`, `${m[1]}-${pad(m[2])}-${pad(m[4])}`];
  m = /^(\d{4})年(\d{1,2})月(\d{1,2})日?[-—~至](\d{1,2})月(\d{1,2})日$/.exec(t);
  if (m) return [`${m[1]}-${pad(m[2])}-${pad(m[3])}`, `${m[1]}-${pad(m[4])}-${pad(m[5])}`];
  m = /^(\d{4})年(\d{1,2})月(\d{1,2})日?[-—~至](\d{4})年(\d{1,2})月(\d{1,2})日$/.exec(t);
  if (m) return [`${m[1]}-${pad(m[2])}-${pad(m[3])}`, `${m[4]}-${pad(m[5])}-${pad(m[6])}`];
  m = /^(\d{4})年(\d{1,2})月(\d{1,2})日$/.exec(t);
  if (m) { const d = `${m[1]}-${pad(m[2])}-${pad(m[3])}`; return [d, d]; }
  return null;
}

// Not conferences: provincial training courses, nursing certifications, governance meetings,
// industry expos, fee collection, single-session webinar series. These are the bulk of the
// directory -- 822 of 1,057 cards were upcoming on 16 Nov 2026 and only ~45 were congresses.
const JUNK = /学习班|培训班|训练营|筹备会|换届|护理|护士|资质认证|惠基层|公益活动|工作会|财务|收费|评审会|签约|巡讲|沙龙|第[一二三四五六七八九十百\d]+期|读片|义诊|药师|药学|验配|技师|考试|申报|例会|启动会|座谈|视频展演|手术演示|代表大会|内部审计/;
const CONGRESS = /大会|学术年会|学术会议|年会|国际会议|论坛|congress|conference|symposium|summit/i;
const INTL = /国际|世界|亚洲|亚太|全球|international|world|asia|asian|pacific|global/i;
const NATIONAL = /中华医学会|中国医师协会|中国抗癌协会|中国康复医学会|中国医院协会|中国研究型医院|中国[^\s]{0,8}(?:学会|协会)|全国/;
// A card titled entirely in Latin script on a Chinese platform is almost always an
// international meeting being advertised to a Chinese audience, and it will carry none of
// the Chinese congress words above. Brain & Brain PET 2027 -- the ISCBFM's 33rd symposium,
// in China for the first time -- is exactly that shape, and an earlier draft of this filter
// dropped it on the floor.
const LATIN_ONLY = (s) => !/[\u4e00-\u9fff]/.test(s);
const LATIN_EVENT = (s) => /\b[A-Z][A-Z0-9&]{2,}\b/.test(s) && /\b20\d\d\b/.test(s);

async function get(url) {
  try {
    const r = await fetch(url, {
      redirect: "follow", signal: AbortSignal.timeout(30000),
      headers: { "User-Agent": UA, "Accept": "text/html,*/*", "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8" },
    });
    return { status: r.status, body: r.ok ? await r.text() : "" };
  } catch (e) { return { status: 0, body: "", err: String(e.message || e).slice(0, 60) }; }
}

function parseCards(html) {
  const out = [];
  const re = /<li>\s*<div class="w1200 clearfix">([\s\S]*?)<\/li>/g;
  let m;
  while ((m = re.exec(html))) {
    const body = m[1];
    const a = /<a href="(https?:\/\/[^"]+)" class="mitem-title[^"]*"[^>]*>([\s\S]*?)<\/a>/.exec(body);
    if (!a) continue;
    const spans = [...body.matchAll(/<span>([\s\S]*?)<\/span>/g)].map((x) => clean(x[1]));
    const dress = /<span class="mitem-dress">([\s\S]*?)<\/span>/.exec(body);
    let span = null, place = "";
    for (const s of spans) {
      const p = parseSpan(s);
      if (p && !span) span = p;
      else if (s && !/^\d{4}年/.test(s)) place = place || s;
    }
    out.push({ url: a[1].trim(), name: clean(a[2]), span, place, prov: dress ? clean(dress[1]) : "" });
  }
  return out;
}

(async () => {
  if (!fs.existsSync(OUTDIR)) fs.mkdirSync(OUTDIR, { recursive: true });
  const seen = new Set(), cards = [];
  let pages = 0;
  for (let p = 1; p <= MAXPAGES; p++) {
    const r = await get(`${LIST}?page=${p}`);
    if (!r.body) break;
    const got = parseCards(r.body);
    if (!got.length) break;
    let fresh = 0;
    for (const c of got) {
      const k = `${c.url}|${c.name}`;
      if (seen.has(k)) continue;
      seen.add(k); cards.push(c); fresh++;
    }
    pages = p;
    if (!fresh) break;
    await new Promise((s) => setTimeout(s, 350));
  }

  const cands = [], drift = [], undated = [];
  for (const c of cards) {
    if (!c.span) { if (CONGRESS.test(c.name) && !JUNK.test(c.name)) undated.push(c); continue; }
    const [start, end] = c.span;
    const key = sciKey(c.url);
    const mine = key && OURS.get(key);
    if (mine) {
      // The platform is the organiser's own system, so a disagreement means our row is
      // probably stale -- but only flag it where the platform still says the event is ahead.
      if ((mine.startDate !== start || mine.endDate !== end) && end >= TODAY) {
        drift.push({ c, mine, start, end });
      }
      continue;
    }
    if (end < TODAY || start > `${new Date().getFullYear() + 3}-12-31`) continue;
    if (JUNK.test(c.name)) continue;
    if (!CONGRESS.test(c.name) && !LATIN_EVENT(c.name)) continue;
    const intl = INTL.test(c.name) || LATIN_ONLY(c.name), nat = NATIONAL.test(c.name);
    const acronym = /\b[A-Z][A-Z0-9&-]{2,}\b/.test(c.name);
    if (!intl && !nat && !acronym) continue;
    const days = Math.round((Date.parse(end) - Date.parse(start)) / 86400000);
    cands.push({ ...c, start, end, days, intl, nat,
      // A span longer than ~10 days is a registration window or a typo, not a congress.
      suspectEnd: days > 10 || days < 0,
      tier: intl && days >= 1 ? 0 : nat && days >= 1 ? 1 : 2,
      declined: !!DECLINED[sciKey(c.url)] });
  }
  const open = cands.filter((c) => !c.declined);
  open.sort((a, b) => a.tier - b.tier || a.start.localeCompare(b.start));
  drift.sort((a, b) => a.start.localeCompare(b.start));

  const L = [];
  L.push(`# sciconf.cn scan — ${REPORT_DAY}`, "");
  L.push(`_${cards.length} cards across ${pages} page(s). Event cutoff ${TODAY}._`, "");
  L.push("> The directory is **discovery only**. Open each conference's own subdomain and read");
  L.push("> its dates, city and credits there before adding it — the cards carry typo'd years,");
  L.push("> registration windows in the end-date slot, and non-conferences.", "");
  L.push(`**${open.length} candidate(s)**, ${drift.length} date-drift flag(s), ` +
         `${cands.length - open.length} previously declined.`, "");

  if (drift.length) {
    L.push("## Date drift — rows we already hold", "");
    L.push("Our dates disagree with the organiser's own platform and the platform says the event");
    L.push("is still ahead. A wrong date expires a record early and hides a live conference.", "");
    L.push("| ours | platform | city | conference | url |", "| --- | --- | --- | --- | --- |");
    for (const d of drift) {
      L.push(`| ${d.mine.startDate}→${d.mine.endDate} | **${d.start}→${d.end}** | ${d.mine.city} | ` +
             `${d.mine.name} | ${d.c.url} |`);
    }
    L.push("", "Fix with `scripts/roll-forward.js` (it refuses to touch a live row, so a record whose",
           "stated dates have not yet passed must be corrected by hand).", "");
  }

  const TIER = ["International / Asia-Pacific", "National society", "Other"];
  for (const t of [0, 1, 2]) {
    const g = open.filter((c) => c.tier === t);
    if (!g.length) continue;
    L.push(`## ${TIER[t]} (${g.length})`, "");
    L.push("| dates | province | venue / city | conference | url |", "| --- | --- | --- | --- | --- |");
    for (const c of g) {
      const dates = c.suspectEnd ? `${c.start} → ${c.end} ⚠` : `${c.start} → ${c.end}`;
      L.push(`| ${dates} | ${c.prov} | ${c.place || "—"} | ${c.name} | ${c.url} |`);
    }
    L.push("");
  }
  if (undated.length) {
    L.push(`## Congress-shaped cards with no parsable date (${undated.length})`, "");
    for (const c of undated.slice(0, 30)) L.push(`- ${c.prov} — ${c.name} — ${c.url}`);
    L.push("");
  }
  L.push("---", "", "⚠ marks a span over 10 days: almost always a registration window or a typo,",
         "not the meeting's length. Record declines in `marketing/sciconf-ignore.json` keyed by",
         "`sciconf:<subdomain>` so they stop resurfacing.", "");

  const out = path.join(OUTDIR, `${REPORT_DAY}.md`);
  fs.writeFileSync(out, L.join("\n") + "\n");
  console.log(`scan-sciconf: ${cards.length} cards / ${pages} pages → ` +
    `${open.length} candidate(s) [${open.filter((c) => !c.tier).length} international], ` +
    `${drift.length} date-drift, ${undated.length} undated`);
  console.log(`  ${path.relative(ROOT, out)}`);
})();
