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

// Same event listed twice. City + start date + specialty is the practical key:
// two genuinely different meetings essentially never share all three.
const byKey = new Map();
for (const c of CONFERENCES) {
  if (!c) continue;
  const key = `${c.city}|${c.startDate}|${c.specialty}`.toLowerCase();
  if (byKey.has(key)) err(`duplicate: "${c.name}" collides with "${byKey.get(key)}" (${key})`);
  else byKey.set(key, c.name);
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
