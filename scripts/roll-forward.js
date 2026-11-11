#!/usr/bin/env node
// Roll an EXPIRED conference record forward to its next edition, in place. Usage:
//
//   node scripts/roll-forward.js <file.tsv> [--coords coords.json] [--dry-run]
//
// TSV columns, tab-separated, no header:
//   url <TAB> name <TAB> startDate <TAB> endDate <TAB> city <TAB> country <TAB> description
//
// WHY THIS EXISTS
// recheck-expired.js turned up a kind of update add-conferences.js structurally cannot make.
// Most societies publish their congress at ONE evergreen address -- aphrs.org, dubaiderma.com,
// esmrmb.org -- and that page simply starts describing next year's meeting when this year's
// ends. The row we hold still says 2026 while the link it points at says 2027, so the entry is
// quietly wrong rather than merely old. Adding a second row is not the fix: rule 1 in
// add-conferences.js refuses a duplicate url, and rightly, because diff-sources.js keys every
// source by url and two rows sharing one key collide in its maps.
//
// So the record is rolled forward: same url, same identity, new edition. The trade is explicit
// -- the previous edition's row is REPLACED, not kept, so the dataset stops being a history of
// that congress and keeps being a description of where that link now leads. For a society with
// a per-edition url (events.aats.org/am26) nothing here applies: that is an ordinary add.
//
// Guards, because this edits rows rather than appending them:
//   - the url must match exactly one existing record
//   - that record must already be expired (never silently overwrite a live entry)
//   - the new start date must be in the future, and endDate >= startDate
//   - city+country must already have coordinates, or be supplied in --coords
const fs = require("fs");
const path = require("path");
const { conferenceDay } = require("./day.js");

const ROOT = path.join(__dirname, "..");
const FILE = path.join(ROOT, "conferences.js");
const args = process.argv.slice(2);
const tsv = args.find((a) => !a.startsWith("--"));
const dry = args.includes("--dry-run");
const coordsArg = (() => {
  const i = args.indexOf("--coords");
  return i > -1 ? JSON.parse(fs.readFileSync(args[i + 1], "utf8")) : {};
})();
if (!tsv) { console.error("usage: roll-forward.js <file.tsv> [--coords coords.json] [--dry-run]"); process.exit(1); }

const TODAY = conferenceDay();  // event cutoff -- see scripts/day.js
let src = fs.readFileSync(FILE, "utf8");
const EXISTING = eval("(function(){" + src + "\nreturn CONFERENCES;})()").filter(Boolean);

// Coordinates keyed by city AND country -- see the same note in add-conferences.js. A bare
// "City" key in --coords applies to any country.
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
const coordsFor = (city, country) => cityCoords[ckey(city, country)] || looseCoords[city] || null;

const rows = fs.readFileSync(tsv, "utf8").split("\n").filter((l) => l.trim()).map((l) => l.split("\t"));
const malformed = rows.filter((r) => r.length !== 7);
if (malformed.length) {
  console.error(`malformed row(s): ${malformed.length}, first has ${malformed[0].length} cols: ${malformed[0][0]}`);
  process.exit(1);
}

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const done = [], skipped = [];

for (const [url, name, startDate, endDate, city, country, description] of rows.map((r) => r.map((x) => x.trim()))) {
  const hits = EXISTING.filter((c) => c.url === url);
  if (hits.length !== 1) { skipped.push([name, hits.length ? `${hits.length} records share that url` : "url not in dataset"]); continue; }
  const cur = hits[0];
  if (cur.endDate >= TODAY) { skipped.push([name, `target row is still live (ends ${cur.endDate}) — refusing to overwrite`]); continue; }
  if (!ISO.test(startDate) || !ISO.test(endDate)) { skipped.push([name, "dates must be YYYY-MM-DD"]); continue; }
  if (startDate <= TODAY) { skipped.push([name, `new start ${startDate} is not in the future`]); continue; }
  if (endDate < startDate) { skipped.push([name, "endDate before startDate"]); continue; }
  const co = coordsFor(city, country);
  if (!co) { skipped.push([name, `no coordinates for ${city}, ${country} — pass --coords {"${city}|${country}": [lat, lng]}`]); continue; }

  // Rewrite the one object literal that carries this url. Matching on the url line keeps the
  // edit anchored to the right record even as the file grows. Every string goes through
  // JSON.stringify: a blanket quote replace broke apostrophes in this file once already.
  const f = (v) => JSON.stringify(v);
  // Locate the record by splitting the file on object-literal boundaries and finding the one
  // block whose url line matches exactly. More than one match means the url is ambiguous and
  // the row is skipped rather than guessed at.
  const parts = src.split(/\n  \},\n/);
  let idx = -1;
  for (let i = 0; i < parts.length; i++) if (parts[i].includes(`url: ${f(url)}`)) { if (idx > -1) { idx = -2; break; } idx = i; }
  if (idx < 0) { skipped.push([name, idx === -2 ? "url text appears in more than one block" : "could not locate the record's text"]); continue; }

  let blk = parts[idx];
  const before = { name: cur.name, dates: `${cur.startDate}→${cur.endDate}`, where: `${cur.city}, ${cur.country}` };
  const sub = (field, value) => {
    const r = new RegExp(`(\\n    ${field}: )[^\\n]*?(,?)(?=\\n)`);
    if (!r.test(blk)) throw new Error(`field ${field} not found in record for ${name}`);
    blk = blk.replace(r, `$1${value},`);
  };
  sub("name", f(name));
  sub("year", String(+startDate.slice(0, 4)));
  sub("startDate", f(startDate));
  sub("endDate", f(endDate));
  sub("city", f(city));
  sub("country", f(country));
  sub("lat", String(co[0]));
  sub("lng", String(co[1]));
  // description is the last field in the literal and carries no trailing comma.
  blk = blk.replace(/(\n    description: )[^\n]*$/, `$1${f(description)}`);
  parts[idx] = blk;
  src = parts.join("\n  },\n");
  // Keep EXISTING in step so a second row cannot target the same record twice.
  cur.url = url + "\u0000rolled";
  done.push([name, before, `${startDate}→${endDate}`, `${city}, ${country}`]);
}

if (!dry && done.length) {
  const check = eval("(function(){" + src + "\nreturn CONFERENCES;})()");
  if (!Array.isArray(check) || check.length !== EXISTING.length) {
    console.error(`refusing to write: record count changed ${EXISTING.length} → ${check && check.length}`);
    process.exit(1);
  }
  fs.writeFileSync(FILE, src);
}

done.forEach(([name, before, dates, where]) => {
  console.log(`rolled  ${name}`);
  console.log(`          was  ${before.name}`);
  console.log(`               ${before.dates}  ${before.where}`);
  console.log(`          now  ${dates}  ${where}`);
});
skipped.forEach(([name, why]) => console.log(`skipped ${name} — ${why}`));
console.log(`\nroll-forward: ${done.length} rolled, ${skipped.length} skipped${dry ? " (dry run, nothing written)" : ""}`);
