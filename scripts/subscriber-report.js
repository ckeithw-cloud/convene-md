#!/usr/bin/env node
// Monthly subscriber report for convene.md's Buttondown list.
//
//   node scripts/subscriber-report.js          # write the report
//   node scripts/subscriber-report.js --raw    # dump one subscriber object, for debugging
//
// Why this exists separately from traffic-report.js: the list is the asset. Affiliate income
// caps out around a couple of thousand a month at any traffic level this site can reach,
// whereas a segmented list of verified physicians is worth several times that — but only if
// it can be described precisely. "1,400 dermatologists" is a rate card; "some subscribers"
// is not. So this reports the segments, not just the total.
//
// The API key is never stored in the repo: $BUTTONDOWN_API_KEY, or
// ~/.config/convene/buttondown-token. See marketing/subscribers/README.md.

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const OUT_DIR = path.join(ROOT, "marketing", "subscribers");
const HISTORY = path.join(OUT_DIR, "history.csv");
const API = "https://api.buttondown.com/v1/subscribers";

function tokenOrDie() {
  if (process.env.BUTTONDOWN_API_KEY) return process.env.BUTTONDOWN_API_KEY.trim();
  const f = path.join(process.env.HOME, ".config", "convene", "buttondown-token");
  if (fs.existsSync(f)) return fs.readFileSync(f, "utf8").trim();
  console.error(
    "No Buttondown API key found.\n" +
    "Set $BUTTONDOWN_API_KEY, or save the key to ~/.config/convene/buttondown-token\n" +
    "(chmod 600). See marketing/subscribers/README.md."
  );
  process.exit(1);
}

const day = (d) => d.toISOString().slice(0, 10);
const monthOf = (iso) => String(iso || "").slice(0, 7);

async function fetchAll(token) {
  const out = [];
  let page = 1;
  for (;;) {
    const res = await fetch(`${API}?page=${page}`, {
      headers: { Authorization: `Token ${token}` },
    });
    if (res.status === 401 || res.status === 403) {
      console.error(`Buttondown rejected the key (HTTP ${res.status}). Check the token and its permissions.`);
      process.exit(1);
    }
    if (!res.ok) {
      console.error(`Buttondown returned HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
      process.exit(1);
    }
    const body = await res.json();
    const rows = body.results || [];
    out.push(...rows);
    if (!body.next || rows.length === 0) return { rows: out, reported: body.count };
    page++;
    if (page > 200) return { rows: out, reported: body.count };   // runaway guard
  }
}

// Buttondown has renamed these fields across API versions, so read defensively rather
// than silently reporting zeros if a key moves.
const statusOf = (s) => s.subscriber_type || s.type || s.status || "unknown";
const createdOf = (s) => s.creation_date || s.created || s.utc_created || "";
const metaOf = (s) => s.metadata || {};

function tally(rows, pick) {
  const m = new Map();
  for (const r of rows) {
    const k = (pick(r) || "").trim() || "(not given)";
    m.set(k, (m.get(k) || 0) + 1);
  }
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}

function table(rows, label, total) {
  if (!rows.length) return "_none_\n";
  const w = Math.max(label.length, ...rows.map((r) => String(r[0]).length));
  let s = `| ${label.padEnd(w)} | Count | Share |\n| ${"-".repeat(w)} | ----: | ----: |\n`;
  for (const [k, n] of rows) {
    s += `| ${String(k).padEnd(w)} | ${n} | ${total ? Math.round((n / total) * 100) : 0}% |\n`;
  }
  return s;
}

function previousSnapshot() {
  if (!fs.existsSync(HISTORY)) return null;
  const lines = fs.readFileSync(HISTORY, "utf8").trim().split("\n").slice(1).filter(Boolean);
  if (!lines.length) return null;
  const [generated, total, active] = lines[lines.length - 1].split(",");
  return { generated, total: +total, active: +active };
}

(async () => {
  const token = tokenOrDie();
  const { rows, reported } = await fetchAll(token);

  if (process.argv.includes("--raw")) {
    console.log(rows.length ? JSON.stringify(rows[0], null, 2) : "no subscribers yet");
    return;
  }

  const today = new Date();
  const thisMonth = monthOf(day(today));

  const byStatus = tally(rows, statusOf);
  const active = rows.filter((r) => /regular|active/i.test(statusOf(r)));
  const unactivated = rows.filter((r) => /unactivated|unconfirmed|pending/i.test(statusOf(r)));
  const joinedThisMonth = rows.filter((r) => monthOf(createdOf(r)) === thisMonth);

  const prev = previousSnapshot();
  const delta = prev ? rows.length - prev.total : null;

  let md = `# convene.md subscribers — ${day(today)}\n\n`;

  if (rows.length === 0) {
    md += `**No subscribers yet.**\n\n`;
    md += `Capture is live on 279 pages plus the map popup. At current traffic a realistic rate `;
    md += `is 3–5 signups a month, so an empty list is expected until SEO brings volume — `;
    md += `see marketing/traffic/ for whether that has started.\n`;
  } else {
    md += `## Headline\n\n| Metric | Now | Previous report | Change |\n| --- | ---: | ---: | ---: |\n`;
    md += `| **Total subscribers** | **${rows.length}** | ${prev ? prev.total : "—"} | ${
      delta === null ? "first report" : (delta >= 0 ? "+" : "") + delta} |\n`;
    md += `| Confirmed / active | ${active.length} | ${prev ? prev.active : "—"} | ${
      prev ? (active.length - prev.active >= 0 ? "+" : "") + (active.length - prev.active) : "—"} |\n`;
    md += `| Joined this month | ${joinedThisMonth.length} | | |\n\n`;

    if (unactivated.length) {
      md += `> **${unactivated.length} subscriber(s) never confirmed.** They will not receive anything. `;
      md += `If this is a large share, double opt-in may be quietly eating the list — check the `;
      md += `confirmation email is landing, or consider turning it off.\n\n`;
    }

    md += `## Status\n\n` + table(byStatus, "Status", rows.length);

    md += `\n## Who they are\n\nThis is the part that has commercial value — a sponsor buys a described audience, not a number.\n\n`;
    md += table(tally(rows, (r) => metaOf(r).role), "Role", rows.length);
    md += `\n` + table(tally(rows, (r) => metaOf(r).specialty), "Specialty", rows.length);

    md += `\n## Where they signed up\n\n`;
    md += table(tally(rows, (r) => metaOf(r).source), "Page", rows.length);
    md += `\nUse this to decide where to put effort: a page that converts is worth more links than one that merely gets traffic.\n`;

    const noMeta = rows.filter((r) => !metaOf(r).role && !metaOf(r).specialty).length;
    if (noMeta) {
      md += `\n_${noMeta} subscriber(s) have no role or specialty — they signed up before those `;
      md += `fields existed (10 Aug 2026). Exclude them when quoting segment counts._\n`;
    }
  }

  if (reported != null && reported !== rows.length) {
    md += `\n_Note: the API reported a count of ${reported} but ${rows.length} records were fetched. `;
    md += `Pagination may have changed — worth a look._\n`;
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const outFile = path.join(OUT_DIR, `${day(today)}.md`);
  fs.writeFileSync(outFile, md);

  if (!fs.existsSync(HISTORY)) {
    fs.writeFileSync(HISTORY, "generated,total,active,unactivated,joined_this_month\n");
  }
  fs.appendFileSync(HISTORY,
    [day(today), rows.length, active.length, unactivated.length, joinedThisMonth.length].join(",") + "\n");

  console.log(`subscriber-report: ${outFile}`);
  console.log(`  ${rows.length} total / ${active.length} active` +
    (delta === null ? " (first report)" : ` (${delta >= 0 ? "+" : ""}${delta} since last report)`));
})();
