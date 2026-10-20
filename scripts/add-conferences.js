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
const coordsArg = (() => {
  const i = args.indexOf("--coords");
  return i > -1 ? JSON.parse(fs.readFileSync(args[i + 1], "utf8")) : {};
})();
if (!tsv) { console.error("usage: add-conferences.js <file.tsv> [--coords coords.json] [--dry-run]"); process.exit(1); }

const src = fs.readFileSync(FILE, "utf8");
const EXISTING = eval("(function(){" + src + "\nreturn CONFERENCES;})()").filter(Boolean);

const cityCoords = {};
for (const c of EXISTING) if (c.city && !(c.city in cityCoords)) cityCoords[c.city] = [c.lat, c.lng];
Object.assign(cityCoords, coordsArg);

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

const rows = fs.readFileSync(tsv, "utf8").split("\n").filter((l) => l.trim()).map((l) => l.split("\t"));
const bad = rows.filter((r) => r.length !== 9);
if (bad.length) { console.error(`malformed row(s): ${bad.length}, first: ${bad[0].slice(0,2).join(" | ")}`); process.exit(1); }

const missing = [...new Set(rows.map((r) => r[4]).filter((c) => !(c in cityCoords)))];
if (missing.length) { console.error("no coordinates for: " + missing.join(", ")); process.exit(1); }

const added = [], dropped = [];
const blocks = [];
for (const [specialty, name, startDate, endDate, city, country, organizer, url, description] of rows) {
  // 1. Same deep link already held — the only unambiguous duplicate.
  if (EXISTING.some((c) => c.url === url)) { dropped.push([name, "same url"]); continue; }
  // 2. A city+date clash is NOT a duplicate on its own: unrelated societies meet in one
  //    city on one day constantly. Require the organiser or a distinctive title match too.
  const clash = EXISTING.filter((c) => c.city === city && c.startDate === startDate);
  // A shared organiser is a weak signal, not proof: a large CME office runs several
  // unrelated courses in its own city on one day (UCSF ran Pediatric Sports Medicine and
  // a Diabetes Update on the same March morning). Demand title evidence either way.
  const same = clash.find((c) =>
    overlap(name, c.name) >= 2 || (c.organizer === organizer && overlap(name, c.name) >= 1));
  if (same) { dropped.push([name, `dup of "${same.name.slice(0, 44)}"`]); continue; }
  // 3. Same host, same year, distinctive title overlap — catches a re-add under a new name.
  const hostHit = (byHost.get(host(url)) || []).find((c) => c.year === +startDate.slice(0, 4) && overlap(name, c.name) >= 2);
  if (hostHit) { dropped.push([name, `dup@host "${hostHit.name.slice(0, 40)}"`]); continue; }

  const [lat, lng] = cityCoords[city];
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
