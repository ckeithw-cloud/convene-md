#!/usr/bin/env node
// Append verified conferences to conferences.js from a TSV, with the dedup screen that
// repeated hand-adding has taught us. Usage:
//
//   node scripts/add-conferences.js <file.tsv> [--coords coords.json] [--dry-run]
//
// TSV columns, tab-separated, no header:
//   specialty <TAB> name <TAB> startDate <TAB> endDate <TAB> city <TAB> country
//             <TAB> organizer <TAB> url <TAB> description
//
// lat/lng are reused from any existing entry in the same city; a city the dataset has
// never seen must be supplied in --coords as {"City": [lat, lng]}, and the run refuses
// rather than guessing a location.
//
// Why this exists as a script rather than a one-off: the dedup rules below were each
// learned by getting them wrong, and a throwaway in a scratchpad loses them every time.
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const FILE = path.join(ROOT, "conferences.js");
const args = process.argv.slice(2);
const tsv = args.find((a) => !a.startsWith("--"));
const dry = args.includes("--dry-run");
// Rules 2 and 3 are heuristics over titles; they cannot tell "the same course re-added under
// a new name" from "a second course the same institute runs in the same year". When a row has
// been checked against the source by hand, --force skips them. Rule 1 (same deep link) is the
// only unambiguous duplicate test and is never skipped.
const force = args.includes("--force");
const coordsArg = (() => {
  const i = args.indexOf("--coords");
  return i > -1 ? JSON.parse(fs.readFileSync(args[i + 1], "utf8")) : {};
})();
if (!tsv) { console.error("usage: add-conferences.js <file.tsv> [--coords coords.json] [--dry-run]"); process.exit(1); }

const src = fs.readFileSync(FILE, "utf8");
const EXISTING = eval("(function(){" + src + "\nreturn CONFERENCES;})()").filter(Boolean);

// Coordinates are keyed by city AND country. Keying on the city alone silently plotted
// 11 British conferences in New England: the dataset holds both a US and a UK "Manchester",
// "Newport" and "Cambridge", and the first occurrence in file order won, so every later UK
// row inherited Vermont's or Rhode Island's coordinates. The map showed Manchester Central
// in Vermont and ICC Wales in Rhode Island until 2026-11-09. A city name is not a location.
// --coords accepts either "City|Country" (preferred) or bare "City" (applies to any country).
const ckey = (city, country) => `${city}|${country}`;
const cityCoords = {};
for (const c of EXISTING) {
  const k = ckey(c.city, c.country);
  if (c.city && !(k in cityCoords)) cityCoords[k] = [c.lat, c.lng];
}
const looseCoords = {};
for (const [k, v] of Object.entries(coordsArg)) {
  if (k.includes("|")) cityCoords[k] = v; else looseCoords[k] = v;
}
const coordsFor = (city, country) =>
  cityCoords[ckey(city, country)] || looseCoords[city] || null;

const host = (u) => { const m = /^https?:\/\/([^/]+)/.exec(u || ""); return m ? m[1].toLowerCase().replace(/^www\./, "") : ""; };
const byHost = new Map();
for (const c of EXISTING) {
  const h = host(c.url);
  if (!byHost.has(h)) byHost.set(h, []);
  byHost.get(h).push(c);
}
// Shared words that carry no identifying information. "Annual Meeting of the Japanese
// Society of ..." matched two unrelated societies on a shared congress host once.
const BOILER = new Set(["annual","meeting","congress","conference","society","association",
  "international","national","european","american","japanese","world","symposium","scientific",
  "update","updates","course","jahrestagung","congresso","congreso","clinical","medical",
  "medicine","surgery","surgical"]);
const words = (s) => new Set((s.toLowerCase().match(/[a-z]{5,}/g) || []).filter((w) => !BOILER.has(w)));
const overlap = (a, b) => { const B = words(b); let n = 0; for (const w of words(a)) if (B.has(w)) n++; return n; };
// A CloudCME tenant puts its own name in most of its course titles, so the institution's
// words are boilerplate *for that host*: "Cedars-Sinai Southern California ECMO Simulation
// Conference" and "2027 Cedars-Sinai International Endoscopy Symposium" share {cedars,
// sinai} and nothing else, which cleared the 2-word bar and silently dropped a good entry.
// Subtract the organiser's own words before judging whether two titles are the same event.
const overlapOutside = (a, b, ...orgs) => {
  const skip = new Set(); orgs.forEach((o) => words(o || "").forEach((w) => skip.add(w)));
  const B = words(b); let n = 0;
  for (const w of words(a)) if (B.has(w) && !skip.has(w)) n++;
  return n;
};

// Providers that run one course title in many cities. Their names carry no identifying
// information, so only the URL can tell two editions apart.
const SERIES_HOSTS = new Set(["mer.org"]);

const rows = fs.readFileSync(tsv, "utf8").split("\n").filter((l) => l.trim()).map((l) => l.split("\t"));
const bad = rows.filter((r) => r.length !== 9);
if (bad.length) { console.error(`malformed row(s): ${bad.length}, first: ${bad[0].slice(0,2).join(" | ")}`); process.exit(1); }

const missing = [...new Set(rows.filter((r) => !coordsFor(r[4], r[5])).map((r) => `${r[4]}, ${r[5]}`))];
if (missing.length) {
  console.error("no coordinates for: " + missing.join("; "));
  console.error('supply them with --coords {"City|Country": [lat, lng]}');
  process.exit(1);
}

const added = [], dropped = [];
const blocks = [];
for (const [specialty, name, startDate, endDate, city, country, organizer, url, description] of rows) {
  // 1. Same deep link already held — the only unambiguous duplicate.
  if (EXISTING.some((c) => c.url === url)) { dropped.push([name, "same url"]); continue; }
  // 2. A city+date clash is NOT a duplicate on its own: unrelated societies meet in one
  //    city on one day constantly. Require the organiser or a distinctive title match too.
  const clash = force ? [] : EXISTING.filter((c) => c.city === city && c.startDate === startDate);
  // A shared organiser is a weak signal, not proof: a large CME office runs several
  // unrelated courses in its own city on one day (UCSF ran Pediatric Sports Medicine and
  // a Diabetes Update on the same March morning). Demand title evidence either way.
  const same = clash.find((c) =>
    overlap(name, c.name) >= 2 || (c.organizer === organizer && overlap(name, c.name) >= 1));
  if (same) { dropped.push([name, `dup of "${same.name.slice(0, 44)}"`]); continue; }
  // 3. Same host, same year, distinctive title overlap — catches a re-add under a new name.
  //    Skipped for series providers: every MER course is titled "Internal Medicine for
  //    Primary Care: <topics>", so "internal" and "primary" alone clear the bar and two
  //    genuinely new Bar Harbor dates were rejected as duplicates of a Cardiology edition.
  //    update-prompt.md is explicit that MER dedupes on the URL, which rule 1 already does.
  if (!force && !SERIES_HOSTS.has(host(url))) {
    const hostHit = (byHost.get(host(url)) || []).find((c) =>
      c.year === +startDate.slice(0, 4) && overlapOutside(name, c.name, organizer, c.organizer, host(url)) >= 2);
    if (hostHit) { dropped.push([name, `dup@host "${hostHit.name.slice(0, 40)}"`]); continue; }
  }

  const [lat, lng] = coordsFor(city, country);
  const f = (v) => JSON.stringify(v);
  blocks.push("  {\n" + [
    `    name: ${f(name)}`, `    specialty: ${f(specialty)}`, `    year: ${+startDate.slice(0, 4)}`,
    `    startDate: ${f(startDate)}`, `    endDate: ${f(endDate)}`, `    city: ${f(city)}`,
    `    country: ${f(country)}`, `    lat: ${lat}`, `    lng: ${lng}`, `    url: ${f(url)}`,
    `    organizer: ${f(organizer)}`, `    description: ${f(description)}`,
  ].join(",\n") + "\n  }");
  added.push(specialty);
}

if (!dry && blocks.length) {
  const i = src.replace(/\s+$/, "").lastIndexOf("\n];");
  if (i < 0) { console.error("could not find the array terminator in conferences.js"); process.exit(1); }
  let head = src.replace(/\s+$/, "").slice(0, i).replace(/\s+$/, "");
  // conferences.js ends with a trailing comma. Adding another makes `},,` — an array hole
  // that reads as a normal-length array and slips past every field check. Cost us a day once.
  if (head.endsWith(",")) head = head.slice(0, -1);
  fs.writeFileSync(FILE, head + ",\n" + blocks.join(",\n") + "\n];\n");
}

const counts = added.reduce((m, s) => (m[s] = (m[s] || 0) + 1, m), {});
console.log(`${dry ? "WOULD ADD" : "ADDED"} ${blocks.length}`);
for (const s of Object.keys(counts).sort()) console.log(`  ${s.padEnd(34)} ${counts[s]}`);
console.log(`DROPPED ${dropped.length}`);
for (const [n, why] of dropped) console.log(`  ${n.slice(0, 48).padEnd(48)} ${why}`);
