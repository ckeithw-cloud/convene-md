#!/usr/bin/env node
// Data integrity checks for conferences.js. Exits non-zero on any error.
// Run after every data change: node scripts/validate.js

const fs = require("fs");
const path = require("path");

const FILE = path.join(__dirname, "..", "conferences.js");
const src = fs.readFileSync(FILE, "utf8");
const CONFERENCES = eval("(function(){" + src + "\nreturn CONFERENCES;})()");

// Keep in sync with SPECIALTY_GROUPS in script.js
const VALID_SPECIALTIES = new Set([
  "General Surgery", "Cardiothoracic Surgery", "Neurosurgery", "Orthopedic Surgery",
  "Plastic Surgery", "Bariatric Surgery", "Vascular Surgery", "Urology",
  "Colorectal Surgery", "Trauma Surgery", "Surgical Oncology", "Pediatric Surgery",
  "HPB / Transplant Surgery", "Endocrine / ENT Surgery",
  "Internal Medicine", "Cardiology", "Gastroenterology", "Pulmonology", "Nephrology",
  "Endocrinology", "Rheumatology", "Infectious Disease", "Hematology", "Allergy & Immunology",
  "Medical Oncology", "Radiation Oncology", "Palliative & Supportive Care",
  "Neurology", "Psychiatry", "Physical Medicine & Rehabilitation", "Pain Medicine",
  "Emergency Medicine", "Anesthesiology", "Critical Care", "Hospital Medicine", "Radiology",
  "Family Medicine", "Pediatrics", "Obstetrics & Gynecology", "Geriatrics",
  "Sports & Wilderness Medicine", "Sports Medicine", "Lifestyle & Preventive Medicine",
  "Pathology", "Dermatology", "Ophthalmology"
]);

// Aggregators that fabricate or misreport listings — never acceptable as a source URL.
const BANNED_HOSTS = /magnusgroup|conferenceseries|conferenceindex|allconferencealert|internationalconferencealert|conferencealerts?\.com|10times|emedevents|clocate|showsbee|pr-medicalevents|vendelux|aconf\.org/i;

const REQUIRED = ["name", "specialty", "year", "startDate", "endDate", "city",
                  "country", "lat", "lng", "url", "organizer", "description"];
const ISO = /^\d{4}-\d{2}-\d{2}$/;

const errors = [];
const warnings = [];
const err = (m) => errors.push(m);

CONFERENCES.forEach((c, i) => {
  if (!c || typeof c !== "object") { err(`index ${i}: array hole or non-object`); return; }
  const id = c.name || `index ${i}`;

  for (const k of REQUIRED) {
    if (c[k] === undefined || c[k] === null || c[k] === "") err(`${id}: missing "${k}"`);
  }
  if (!VALID_SPECIALTIES.has(c.specialty)) err(`${id}: unknown specialty "${c.specialty}"`);
  if (!ISO.test(c.startDate || "")) err(`${id}: startDate not YYYY-MM-DD`);
  if (!ISO.test(c.endDate || "")) err(`${id}: endDate not YYYY-MM-DD`);
  if (ISO.test(c.startDate || "") && ISO.test(c.endDate || "") && c.endDate < c.startDate) {
    err(`${id}: endDate before startDate`);
  }
  if (ISO.test(c.startDate || "") && String(c.year) !== c.startDate.slice(0, 4)) {
    err(`${id}: year ${c.year} does not match startDate ${c.startDate}`);
  }
  if (typeof c.lat !== "number" || typeof c.lng !== "number") {
    err(`${id}: lat/lng must be numbers`);
  } else {
    if (Math.abs(c.lat) > 90 || Math.abs(c.lng) > 180) err(`${id}: lat/lng out of range`);
    if (c.lat === 0 && c.lng === 0) err(`${id}: null-island coordinates (0,0)`);
  }
  if (typeof c.url === "string") {
    if (!/^https?:\/\//.test(c.url)) err(`${id}: url must start with http(s)://`);
    if (BANNED_HOSTS.test(c.url)) err(`${id}: url points at a banned aggregator — ${c.url}`);
  }
  if (c._id !== undefined) err(`${id}: _id must not be hand-set (assigned at runtime)`);
});

// Helpers shared by the duplicate checks below. Two records are "the same event"
// if they point at the same URL, or their distinctive title words mostly match.
const norm = (u) => String(u || "").replace(/\/$/, "").toLowerCase();
const titleWords = (n) => new Set(
  String(n).toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/)
    .filter((w) => w.length > 3 && !/^(the|and|with|for|annual|conference|congress|meeting|update|course|symposium|20\d\d)$/.test(w))
);
function sameEventish(a, b) {
  if (norm(a.url) === norm(b.url)) return true;
  const wa = titleWords(a.name), wb = titleWords(b.name);
  if (!wa.size || !wb.size) return false;
  let shared = 0;
  for (const w of wa) if (wb.has(w)) shared++;
  // Two records that link to DIFFERENT pages on the organiser's own site are usually
  // two different courses, not one course entered twice — a real double-entry almost
  // always shares the URL (that is the WCN case this check was written for). Series
  // providers make this bite: every MER course is titled "Internal Medicine for
  // Primary Care: <topics>", so the shared boilerplate alone clears 0.6 and back-to-back
  // courses at one resort got flagged as duplicates. Demand a near-identical title
  // before overriding the evidence of two distinct URLs.
  const distinctUrls = a.url && b.url && norm(a.url) !== norm(b.url);
  return shared / Math.min(wa.size, wb.size) >= (distinctUrls ? 0.85 : 0.6);
}

// Same event listed twice. City + start date + specialty catches most of it — but a
// large CME office can legitimately run two different courses in one specialty, in
// one city, on the same day. So a key collision is only an ERROR when the records
// also look like the same event; otherwise it is a warning to eyeball.
const byKey = new Map();
for (const c of CONFERENCES) {
  if (!c) continue;
  const key = `${c.city}|${c.startDate}|${c.specialty}`.toLowerCase();
  const prev = byKey.get(key);
  if (prev) {
    const msg = `same city+date+specialty: "${c.name}" and "${prev.name}"`;
    if (sameEventish(c, prev)) err(msg + " — looks like the SAME event twice");
    else warnings.push(msg + " — two different courses? verify both are real");
  } else byKey.set(key, c);
}

// Same URL under different names is usually fine (society landing pages are reused
// across years), so this is advisory only — but a shared URL plus a shared year
// is a strong hint the same event got entered twice under two names.
const byUrlYear = new Map();
for (const c of CONFERENCES) {
  if (!c || !c.url) continue;
  const key = `${c.url.replace(/\/$/, "").toLowerCase()}|${c.year}`;
  if (byUrlYear.has(key) && byUrlYear.get(key) !== c.name) {
    warnings.push(`same url + year: "${c.name}" and "${byUrlYear.get(key)}"`);
  } else byUrlYear.set(key, c.name);
}

// The exact city+startDate+specialty key misses the case that actually bit us:
// two researchers reporting the SAME congress with dates a day or two apart
// (e.g. WCN 2027 as Oct 23-25 vs Oct 24-27). But it also produces false alarms:
// a big CME office can genuinely run two different courses in the same specialty,
// in the same city, on the same days (Harvard ran Boston Sports Cardiology and the
// Rhodes Course concurrently). So overlap alone is a WARNING; it is only an ERROR
// when the two records also look like the same event (see sameEventish above).
for (let i = 0; i < CONFERENCES.length; i++) {
  const a = CONFERENCES[i];
  if (!a) continue;
  for (let j = i + 1; j < CONFERENCES.length; j++) {
    const b = CONFERENCES[j];
    if (!b) continue;
    if (a.specialty !== b.specialty) continue;
    if (String(a.city).toLowerCase() !== String(b.city).toLowerCase()) continue;
    if (!(a.startDate <= b.endDate && b.startDate <= a.endDate)) continue;
    const msg = `overlapping dates, same city+specialty: "${a.name}" (${a.startDate}→${a.endDate}) ` +
                `and "${b.name}" (${b.startDate}→${b.endDate})`;
    if (sameEventish(a, b)) err(msg + " — looks like the SAME event twice; verify official dates");
    else warnings.push(msg + " — two different courses? verify both are real");
  }
}

const specialties = new Set(CONFERENCES.filter(Boolean).map((c) => c.specialty));
const missing = [...VALID_SPECIALTIES].filter((s) => !specialties.has(s));
if (missing.length) warnings.push(`specialties with no conferences: ${missing.join(", ")}`);

for (const w of warnings) console.warn(`warn: ${w}`);
if (errors.length) {
  for (const e of errors) console.error(`ERROR: ${e}`);
  console.error(`\nvalidate: FAILED — ${errors.length} error(s), ${warnings.length} warning(s).`);
  process.exit(1);
}
console.log(`validate: OK — ${CONFERENCES.length} conferences, ` +
            `${specialties.size}/${VALID_SPECIALTIES.size} specialties, ` +
            `${new Set(CONFERENCES.map((c) => c.country)).size} countries, ` +
            `${warnings.length} warning(s).`);
