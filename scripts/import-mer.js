// One-off importer: pull the full MER (Medical Education Resources) catalogue
// from mer.org and emit conferences.js entries. Month pages are server-rendered,
// so plain fetch works — no browser needed.
const fs = require("fs");

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/124.0 Safari/537.36";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// mer.org drops connections under concurrency, so retry with a widening backoff.
async function get(u, tries = 5) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(u, { headers: { "User-Agent": UA }, redirect: "follow" });
      if (!r.ok) throw new Error(`http ${r.status}`);
      return await r.text();
    } catch (e) {
      if (i === tries - 1) throw e;
      await sleep(500 * (i + 1));
    }
  }
}
const b64 = (s) => Buffer.from(s).toString("base64");
const dec = (s) => String(s)
  .replace(/&amp;/g, "&").replace(/&#x27;|&#039;|&apos;/g, "'").replace(/&quot;/g, '"')
  .replace(/&nbsp;/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
  .replace(/\s+/g, " ").trim();

const MONTHS = [];
for (const [m, y] of [["08","2026"],["09","2026"],["10","2026"],["11","2026"],["12","2026"],
  ["01","2027"],["02","2027"],["03","2027"],["04","2027"],["05","2027"],["06","2027"],
  ["07","2027"],["08","2027"],["09","2027"],["10","2027"]]) MONTHS.push(`${m}-${y}`);

// city, country, lat, lng — keyed by MER's own "State, City" label. Where MER labels a
// venue by resort/park brand rather than a place, the real municipality from the venue's
// postal address is used instead (Walt Disney World -> Lake Buena Vista, Yellowstone ->
// Big Sky, Zion -> Springdale, and so on).
const LOC = {
  "Hawaii, Maui, Ka'anapali": ["Lahaina", "USA", 20.9250, -156.6950],
  "California, San Diego": ["Coronado", "USA", 32.6803, -117.1783],
  "Bahamas, Nassau": ["Nassau", "Bahamas", 25.0839, -77.3200],
  "Montana, Yellowstone": ["Big Sky", "USA", 45.2841, -111.4014],
  "United Kingdom, London": ["London", "United Kingdom", 51.5074, -0.1278],
  "South Carolina, Hilton Head Island": ["Hilton Head Island", "USA", 32.1896, -80.7521],
  "Nevada, Las Vegas": ["Las Vegas", "USA", 36.1147, -115.1728],
  "Virginia, Charlottesville": ["Charlottesville", "USA", 38.0293, -78.4767],
  "Alberta, Banff": ["Banff", "Canada", 51.1784, -115.5708],
  "California, Disneyland® Resort": ["Anaheim", "USA", 33.8085, -117.9190],
  "Maine, Bar Harbor": ["Bar Harbor", "USA", 44.3876, -68.2039],
  "New Mexico, Santa Fe": ["Santa Fe", "USA", 35.6870, -105.9378],
  "Florida, Walt Disney World® Resort": ["Lake Buena Vista", "USA", 28.3852, -81.5639],
  "Montana, Glacier National Park": ["Whitefish", "USA", 48.4111, -114.3376],
  "California, Yosemite": ["Fish Camp", "USA", 37.4869, -119.6340],
  "South Carolina, Charleston": ["Charleston", "USA", 32.7833, -79.9333],
  "Hawaii, Maui, Wailea": ["Wailea", "USA", 20.6900, -156.4420],
  "California, Laguna Beach": ["Dana Point", "USA", 33.4936, -117.7089],
  "Vermont, Manchester": ["Manchester", "USA", 43.1637, -73.0723],
  "Greece, Crete": ["Agios Nikolaos", "Greece", 35.1911, 25.7160],
  "Colorado, Rocky Mountain National Park": ["Estes Park", "USA", 40.3772, -105.5217],
  "Georgia, Savannah": ["Savannah", "USA", 32.0809, -81.0912],
  "California, Santa Barbara": ["Santa Barbara", "USA", 34.4208, -119.6982],
  "Hawaii, Kauai, Poipu": ["Poipu", "USA", 21.8747, -159.4540],
  "Cayman Islands, Grand Cayman": ["George Town", "Cayman Islands", 19.3220, -81.3810],
  "France, Paris": ["Paris", "France", 48.8566, 2.3522],
  "New York, New York": ["New York", "USA", 40.7580, -73.9855],
  "Texas, San Antonio": ["San Antonio", "USA", 29.4241, -98.4936],
  "Louisiana, New Orleans": ["New Orleans", "USA", 29.9511, -90.0715],
  "Aruba, Palm Beach": ["Palm Beach", "Aruba", 12.5735, -70.0430],
  "Arizona, Phoenix": ["Phoenix", "USA", 33.4484, -112.0740],
  "Florida, Universal Studios": ["Orlando", "USA", 28.4740, -81.4680],
  "Rhode Island, Newport": ["Newport", "USA", 41.4901, -71.3128],
  "Japan, Kyoto": ["Kyoto", "Japan", 35.0116, 135.7681],
  "Florida, Key West": ["Key West", "USA", 24.5551, -81.8000],
  "Hawaii, Oahu, Ko Olina": ["Ko Olina", "USA", 21.3369, -158.1230],
  "Switzerland , Basel": ["Basel", "Switzerland", 47.5596, 7.5886],
  "Arizona, Scottsdale": ["Scottsdale", "USA", 33.4942, -111.9261],
  "West Virginia , White Sulphur Springs": ["White Sulphur Springs", "USA", 37.7857, -80.3045],
  "Costa Rica, Peninsula Papagayo": ["Papagayo", "Costa Rica", 10.6400, -85.6600],
  "California, Palm Springs": ["Indian Wells", "USA", 33.7167, -116.3410],
  "Florida, Key Largo": ["Key Largo", "USA", 25.0865, -80.4473],
  "Utah, Park City": ["Park City", "USA", 40.6461, -111.4980],
  "Florida, Fort Lauderdale": ["Fort Lauderdale", "USA", 26.1224, -80.1373],
  "Spain, Sevilla": ["Seville", "Spain", 37.3826, -5.9963],
  "Puerto Rico, San Juan": ["San Juan", "Puerto Rico", 18.4430, -66.0170],
  "Florida, Clearwater": ["Clearwater Beach", "USA", 27.9775, -82.8270],
  "South Carolina, Isle of Palms": ["Isle of Palms", "USA", 32.7866, -79.7770],
  "Colorado, Breckenridge": ["Breckenridge", "USA", 39.4817, -106.0384],
  "District of Columbia, Washington D.C.": ["Washington", "USA", 38.8977, -77.0290],
  "Netherlands, Amsterdam": ["Amsterdam", "Netherlands", 52.3702, 4.8952],
  "Hawaii, Hawaii, Waimea": ["Waimea", "USA", 19.9330, -155.8630],
  "Utah, Zion": ["Springdale", "USA", 37.1889, -112.9983],
  "North Carolina, Asheville": ["Asheville", "USA", 35.5951, -82.5515],
  "Massachusetts, Cape Cod": ["Harwich", "USA", 41.7100, -69.9800],
  "Utah, Moab": ["Moab", "USA", 38.5733, -109.5498],
  "Italy, Sicily": ["Siracusa", "Italy", 37.0755, 15.2866],
  "Arizona, Sedona": ["Sedona", "USA", 34.8697, -111.7610],
  "Poland, Krakow": ["Krakow", "Poland", 50.0647, 19.9450],
  "Colorado, Colorado Springs": ["Colorado Springs", "USA", 38.8339, -104.8214],
  "Wyoming, Jackson Hole": ["Teton Village", "USA", 43.5875, -110.8270],
  "Tennessee, Nashville": ["Nashville", "USA", 36.1627, -86.7816],
  "Alaska, Anchorage": ["Girdwood", "USA", 60.9542, -149.1630],
  "Michigan, Mackinac Island": ["Mackinac Island", "USA", 45.8492, -84.6189],
  "St. Kitts, Banana Bay": ["Banana Bay", "Saint Kitts and Nevis", 17.2213, -62.6338],
};

const SPECIALTY = [
  [/^Internal Medicine for Primary Care/, "Internal Medicine"],
  [/^Rheumatology/, "Rheumatology"],
  [/^Neurology & Psychiatry/, "Neurology"],
  [/^Neurology for Primary Care/, "Neurology"],
  [/^Infectious Diseases/, "Infectious Disease"],
  [/^Cardiology & Pulmonology/, "Cardiology"],
  [/^Men's & Women's Health/, "Internal Medicine"],
  [/^Women's Health/, "Obstetrics & Gynecology"],
  [/^Pediatric & Adolescent/, "Pediatrics"],
  [/^Endocrinology/, "Endocrinology"],
  [/^Dermatology/, "Dermatology"],
  [/^Office Orthopedics/, "Sports Medicine"],
  [/^Orthopedic Medicine/, "Sports Medicine"],
  [/^Geriatric Medicine/, "Geriatrics"],
];

const MO = { Jan:"01",Feb:"02",Mar:"03",Apr:"04",May:"05",Jun:"06",Jul:"07",Aug:"08",Sep:"09",Oct:"10",Nov:"11",Dec:"12" };
function parseDates(d) {
  let m = d.match(/^(\w{3})\s+(\d{2})-(\d{2}),\s*(\d{4})$/);
  if (m) return [`${m[4]}-${MO[m[1]]}-${m[2]}`, `${m[4]}-${MO[m[1]]}-${m[3]}`];
  m = d.match(/^(\w{3})\s+(\d{2})\s*-\s*(\w{3})\s+(\d{2}),\s*(\d{4})$/);
  if (m) {
    const y = +m[5];
    const endY = MO[m[3]] < MO[m[1]] ? y + 1 : y;   // Dec -> Jan rollover
    return [`${y}-${MO[m[1]]}-${m[2]}`, `${endY}-${MO[m[3]]}-${m[4]}`];
  }
  return null;
}

(async () => {
  // 1. Every conference card across the published months.
  const rows = new Map();
  for (const mo of MONTHS) {
    const html = await get(`https://www.mer.org/conference-schedule//${b64(mo)}`);
    const re = /class="header" href="([^"]+)">([^<]*)<\/a><div class="ui label date_label">\s*<i class="calendar icon"><\/i>([^<]*)<\/div><div class="description">([^<]*)<\/div>/g;
    let m;
    while ((m = re.exec(html))) {
      const url = m[1];
      const cid = (url.match(/conference\/\/([^/]+)/) || [])[1];
      if (!cid || rows.has(url)) continue;
      rows.set(url, { url, name: dec(m[2]), dates: dec(m[3]), loc: dec(m[4]) });
    }
  }
  console.log(`cards found: ${rows.size}`);

  // 2. Venue + designated credit hours from each conference page.
  const all = [...rows.values()];
  for (let i = 0; i < all.length; i += 4) {
    process.stdout.write(`\rdetails ${Math.min(i + 4, all.length)}/${all.length}`);
    await sleep(150);
    await Promise.all(all.slice(i, i + 4).map(async (r) => {
      const h = await get(r.url);
      const v = h.match(/Venue Information<\/h4><div class="ui divider"><\/div><h4>([^<]*)<\/h4>/);
      r.venue = v ? dec(v[1]) : "";
      const c = h.match(/<span class="ui header fourteen wide column">[^<]*?-\s*([\d.]+)\s*Credit Hours/);
      r.credits = c ? c[1] : "";
    }));
  }

  // 3. Map onto the conferences.js schema.
  const problems = [], out = [];
  for (const r of all) {
    const loc = r.loc === "California, Napa/Sonoma"
      ? (/Sonoma/i.test(r.venue) ? ["Sonoma", "USA", 38.3122, -122.4830] : ["Napa", "USA", 38.2975, -122.2869])
      : LOC[r.loc];
    const dd = parseDates(r.dates);
    const sp = (SPECIALTY.find((x) => x[0].test(r.name)) || [])[1];
    if (!loc) { problems.push(`no location mapping: ${r.loc}`); continue; }
    if (!dd) { problems.push(`unparsed dates: ${r.dates}`); continue; }
    if (!sp) { problems.push(`no specialty mapping: ${r.name}`); continue; }
    if (!r.venue) { problems.push(`no venue: ${r.name}`); continue; }
    if (!r.credits) { problems.push(`no credit hours: ${r.name}`); continue; }
    const year = +dd[0].slice(0, 4);
    out.push({
      name: `${r.name} — ${loc[0]} ${year}`,
      specialty: sp, year, startDate: dd[0], endDate: dd[1],
      city: loc[0], country: loc[1], lat: loc[2], lng: loc[3],
      url: r.url, organizer: "Medical Education Resources (MER)",
      description: `Destination primary care CME at ${r.venue}, offering ${r.credits} AMA PRA Category 1 Credits.`,
    });
  }

  const F = ["name","specialty","year","startDate","endDate","city","country","lat","lng","url","organizer","description"];
  const js = out.map((e) => "  {\n" + F.map((k) => {
    const v = e[k];
    return `    ${k}: ` + (typeof v === "number" ? (k === "year" ? v : v.toFixed(4)) : JSON.stringify(v));
  }).join(",\n") + "\n  },").join("\n");

  fs.writeFileSync(__dirname + "/mer-entries.js", js + "\n");
  fs.writeFileSync(__dirname + "/mer-raw.json", JSON.stringify(all, null, 1));
  console.log(`entries written: ${out.length}`);
  if (problems.length) console.log("PROBLEMS:\n" + problems.join("\n"));
})();
