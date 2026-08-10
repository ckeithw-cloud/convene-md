// Generates static hub pages so Google has real pages to rank, instead of one
// homepage carrying every conference:
//
//   /specialty/<slug>/   one per specialty that has upcoming conferences
//   /country/<slug>/     one per country
//   /city/<slug>/        cities with at least MIN_CITY upcoming conferences
//   /year/<yyyy>/        one per year
//   /browse/             index of every hub, so crawlers have one entry point
//
// Each page is a self-contained document with its own <title>, meta description,
// canonical, an ItemList of Events in JSON-LD, and cross-links to sibling hubs.
// Pages with no upcoming conferences are skipped — a thin empty page is worse
// than no page at all.
//
// Run:  node scripts/build-hubs.js   (build-seo.js then picks the URLs up for the sitemap)

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const SITE = "https://convene.md";
// Two conferences is enough for a real page: each carries a verified date, venue
// and description, and "medical conferences in <city>" is a query nobody owns.
// Single-conference cities are left out — that page would just restate one row.
const MIN_CITY = 2;
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function loadConferences() {
  const src = fs.readFileSync(path.join(ROOT, "conferences.js"), "utf8");
  return eval("(function(){" + src + "\nreturn CONFERENCES;})()");
}

function slug(s) {
  return String(s)
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")   // strip accents: Córdoba -> cordoba
    .replace(/['’.]/g, "")                              // St. John's -> st johns
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function fmtRange(start, end) {
  const s = new Date(start + "T00:00:00");
  const e = new Date(end + "T00:00:00");
  const sameMonth = s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear();
  if (sameMonth) {
    return s.getDate() === e.getDate()
      ? `${MONTHS[s.getMonth()]} ${s.getDate()}, ${e.getFullYear()}`
      : `${MONTHS[s.getMonth()]} ${s.getDate()}–${e.getDate()}, ${e.getFullYear()}`;
  }
  return `${MONTHS[s.getMonth()]} ${s.getDate()} – ${MONTHS[e.getMonth()]} ${e.getDate()}, ${e.getFullYear()}`;
}

function todayIso() { return new Date().toISOString().slice(0, 10); }

function yearSpan(list) {
  const ys = [...new Set(list.map(c => c.year))].sort();
  return ys.length === 1 ? String(ys[0]) : `${ys[0]}–${ys[ys.length - 1]}`;
}

// ---------------------------------------------------------------- page shell

function page({ url, title, description, h1, crumbs, lede, list, related, extraBody, selfSpecialty }) {
  const jsonld = list && list.length ? {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: h1,
    numberOfItems: list.length,
    itemListElement: list.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "Event",
        name: c.name,
        startDate: c.startDate,
        endDate: c.endDate,
        eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
        eventStatus: "https://schema.org/EventScheduled",
        location: {
          "@type": "Place",
          name: `${c.city}, ${c.country}`,
          address: { "@type": "PostalAddress", addressLocality: c.city, addressCountry: c.country }
        },
        description: c.description,
        url: c.url,
        organizer: { "@type": "Organization", name: c.organizer, url: c.url }
      }
    }))
  } : null;

  const items = (list || []).map(c => {
    // On a specialty page every row would otherwise link back to the same page.
    const spec = c.specialty === selfSpecialty
      ? esc(c.specialty)
      : `<a href="/specialty/${slug(c.specialty)}/">${esc(c.specialty)}</a>`;
    return `      <li class="conf">
        <span class="when">${esc(fmtRange(c.startDate, c.endDate))}</span>
        <h3 class="title"><a href="${esc(c.url)}" rel="noopener">${esc(c.name)}</a></h3>
        <p class="meta">${esc(c.city)}, ${esc(c.country)} · ${spec} · ${esc(c.organizer)}</p>
        <p class="desc">${esc(c.description)}</p>
      </li>`;
  }).join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}" />
  <link rel="canonical" href="${SITE}${url}" />
  <meta name="robots" content="index, follow" />
  <meta property="og:title" content="${esc(title)}" />
  <meta property="og:description" content="${esc(description)}" />
  <meta property="og:url" content="${SITE}${url}" />
  <meta property="og:image" content="${SITE}/logo-social.png" />
  <meta property="og:type" content="website" />
  <meta name="twitter:card" content="summary_large_image" />
  <link rel="icon" href="/logo.svg" type="image/svg+xml" />
  <link rel="stylesheet" href="/hub.css" />
  <!-- No analytics beacon here on purpose: convene.md is a proxied Cloudflare zone with
       Web Analytics RUM set to automatic, so the edge injects the snippet into every HTML
       response, hub pages included. Adding it by hand would double-count. -->
${jsonld ? `  <script type="application/ld+json">\n${JSON.stringify(jsonld, null, 2)}\n  </script>` : ""}
</head>
<body>
  <header class="hub-header">
    <div class="inner">
      <a class="hub-brand" href="/">
        <img src="/logo.svg" alt="" width="38" height="38" />
        <span><span class="name">convene.md</span><span class="tag">Where the medical world meets</span></span>
      </a>
      <nav>
        <a href="/">Map</a>
        <a href="/browse/">Browse</a>
        <a href="/how-to/deduct-cme-travel/">How To</a>
      </nav>
    </div>
  </header>
  <main>
    <p class="crumbs">${crumbs}</p>
    <h1>${esc(h1)}</h1>
    ${lede ? `<p class="lede">${lede}</p>` : ""}
${extraBody || ""}
${list ? `    <ul class="conf-list">\n${items}\n    </ul>` : ""}
${related || ""}
  </main>
  <footer class="hub-footer">
    <p><a href="/">Explore all conferences on the map</a> · <a href="/browse/">Browse by specialty, country or city</a></p>
    <p>convene.md — conference dates verified against organising societies' own sites.</p>
  </footer>
</body>
</html>
`;
}

function chips(items) {
  return `<div class="chips">${items.map(i => `<a class="chip" href="${i.href}">${esc(i.label)}</a>`).join("")}</div>`;
}

function relatedBlock(title, items) {
  if (!items.length) return "";
  return `    <section class="related">\n      <h2>${esc(title)}</h2>\n      ${chips(items)}\n    </section>`;
}

function write(urlPath, html) {
  const dir = path.join(ROOT, urlPath);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "index.html"), html);
}

// ---------------------------------------------------------------------- main

function main() {
  const today = todayIso();
  const upcoming = loadConferences()
    .filter(c => c.endDate >= today)
    .sort((a, b) => a.startDate.localeCompare(b.startDate));

  const by = (keyFn) => {
    const m = new Map();
    for (const c of upcoming) {
      const k = keyFn(c);
      if (!m.has(k)) m.set(k, []);
      m.get(k).push(c);
    }
    return m;
  };

  const bySpecialty = by(c => c.specialty);
  const byCountry   = by(c => c.country);
  const byCity      = by(c => `${c.city}|${c.country}`);
  const byYear      = by(c => String(c.year));

  const urls = [];
  const warn = [];

  // guard against two different names collapsing to the same slug
  const seenSlugs = new Map();
  const claim = (kind, key, s) => {
    const id = `${kind}/${s}`;
    if (seenSlugs.has(id) && seenSlugs.get(id) !== key) {
      warn.push(`slug collision in ${kind}: "${key}" and "${seenSlugs.get(id)}" both -> ${s}`);
    }
    seenSlugs.set(id, key);
    return s;
  };

  // ---- specialty hubs
  const specialtyLinks = [...bySpecialty.keys()].sort()
    .map(s => ({ label: s, href: `/specialty/${slug(s)}/` }));

  for (const [spec, list] of bySpecialty) {
    const s = claim("specialty", spec, slug(spec));
    const span = yearSpan(list);
    const countries = [...new Set(list.map(c => c.country))];
    write(`specialty/${s}`, page({
      url: `/specialty/${s}/`,
      title: `${spec} Conferences ${span} — Dates, Locations & Venues | convene.md`,
      description: `Every upcoming ${spec.toLowerCase()} conference worldwide (${span}) — ${list.length} meetings across ${countries.length} countries, with verified dates, host cities and links to each organising society.`,
      h1: `${spec} Conferences ${span}`,
      crumbs: `<a href="/">Home</a> › <a href="/browse/">Browse</a> › ${esc(spec)}`,
      lede: `${list.length} upcoming ${esc(spec.toLowerCase())} conferences in ${countries.length} countries. Dates and host cities are verified against each organising society's own website. Use the <a href="/">interactive map</a> to see them by location.`,
      list,
      selfSpecialty: spec,
      related: relatedBlock("Browse other specialties",
        specialtyLinks.filter(l => l.label !== spec).slice(0, 45))
    }));
    urls.push(`/specialty/${s}/`);
  }

  // ---- country hubs
  const countryLinks = [...byCountry.keys()].sort()
    .map(c => ({ label: c, href: `/country/${slug(c)}/` }));

  for (const [country, list] of byCountry) {
    const s = claim("country", country, slug(country));
    const span = yearSpan(list);
    const cities = [...new Set(list.map(c => c.city))];
    const specs = [...new Set(list.map(c => c.specialty))];
    write(`country/${s}`, page({
      url: `/country/${s}/`,
      title: `Medical Conferences in ${country} ${span} — Full Calendar | convene.md`,
      description: `${list.length} upcoming medical conferences in ${country} (${span}) across ${specs.length} specialties and ${cities.length} cities, with verified dates and links to each organising society.`,
      h1: `Medical Conferences in ${country}`,
      crumbs: `<a href="/">Home</a> › <a href="/browse/">Browse</a> › ${esc(country)}`,
      lede: `${list.length} upcoming medical conferences in ${esc(country)}, spanning ${specs.length} specialties across ${cities.length} ${cities.length === 1 ? "city" : "cities"}. Planning CME travel? See them all on the <a href="/">map</a>.`,
      list,
      related: relatedBlock("Conferences in other countries",
        countryLinks.filter(l => l.label !== country))
    }));
    urls.push(`/country/${s}/`);
  }

  // ---- city hubs (only where there's enough to be a real page)
  const cityEntries = [...byCity.entries()].filter(([, l]) => l.length >= MIN_CITY);
  const cityLinks = cityEntries
    .map(([k, l]) => ({ label: k.split("|")[0], href: `/city/${slug(k.split("|")[0])}/`, n: l.length }))
    .sort((a, b) => b.n - a.n);

  for (const [key, list] of cityEntries) {
    const [city, country] = key.split("|");
    const s = claim("city", key, slug(city));
    const span = yearSpan(list);
    const specs = [...new Set(list.map(c => c.specialty))];
    write(`city/${s}`, page({
      url: `/city/${s}/`,
      title: `Medical Conferences in ${city}, ${country} ${span} | convene.md`,
      description: `${list.length} upcoming medical conferences in ${city}, ${country} (${span}) across ${specs.length} specialties — verified dates, venues and organising societies.`,
      h1: `Medical Conferences in ${city}`,
      crumbs: `<a href="/">Home</a> › <a href="/browse/">Browse</a> › <a href="/country/${slug(country)}/">${esc(country)}</a> › ${esc(city)}`,
      lede: `${list.length} upcoming conferences in ${esc(city)}, ${esc(country)} across ${specs.length} specialties. See more in <a href="/country/${slug(country)}/">${esc(country)}</a> or on the <a href="/">map</a>.`,
      list,
      related: relatedBlock("Other conference cities",
        cityLinks.filter(l => l.label !== city).slice(0, 60))
    }));
    urls.push(`/city/${s}/`);
  }

  // ---- year hubs
  const yearLinks = [...byYear.keys()].sort().map(y => ({ label: y, href: `/year/${y}/` }));

  for (const [year, list] of byYear) {
    const specs = [...new Set(list.map(c => c.specialty))];
    const countries = [...new Set(list.map(c => c.country))];
    write(`year/${year}`, page({
      url: `/year/${year}/`,
      title: `Medical Conferences ${year} — Worldwide Calendar | convene.md`,
      description: `Every medical conference scheduled for ${year}: ${list.length} meetings across ${specs.length} specialties and ${countries.length} countries, with verified dates and host cities.`,
      h1: `Medical Conferences ${year}`,
      crumbs: `<a href="/">Home</a> › <a href="/browse/">Browse</a> › ${year}`,
      lede: `${list.length} conferences scheduled for ${year} across ${specs.length} specialties and ${countries.length} countries.`,
      list,
      related: relatedBlock("Other years", yearLinks.filter(l => l.label !== year))
    }));
    urls.push(`/year/${year}/`);
  }

  // ---- browse index (single crawl entry point to every hub)
  const browseBody = [
    `    <section class="browse-group"><h2>By specialty</h2>${chips(specialtyLinks)}</section>`,
    `    <section class="browse-group"><h2>By country</h2>${chips(countryLinks)}</section>`,
    `    <section class="browse-group"><h2>By city</h2>${chips(cityLinks.map(l => ({ label: `${l.label} (${l.n})`, href: l.href })))}</section>`,
    `    <section class="browse-group"><h2>By year</h2>${chips(yearLinks)}</section>`
  ].join("\n");

  write("browse", page({
    url: "/browse/",
    title: "Browse Medical Conferences by Specialty, Country, City & Year | convene.md",
    description: `Browse ${upcoming.length} upcoming medical conferences worldwide by specialty, country, city or year — verified dates and links to every organising society.`,
    h1: "Browse medical conferences",
    crumbs: `<a href="/">Home</a> › Browse`,
    lede: `${upcoming.length} upcoming conferences across ${bySpecialty.size} specialties and ${byCountry.size} countries. Pick a specialty, country, city or year — or explore them all on the <a href="/">map</a>.`,
    list: null,
    extraBody: browseBody
  }));
  urls.push("/browse/");

  fs.writeFileSync(path.join(ROOT, "scripts", "hub-urls.json"), JSON.stringify(urls.sort(), null, 2));

  // Delete hub pages this run no longer generates. A hub disappears whenever its last
  // events go past, its city drops below MIN_CITY, or a country/city gets renamed in
  // conferences.js. Left behind, the old directory keeps being served but is absent from
  // the sitemap — stale duplicate content, the same problem `not_found_handling = "none"`
  // was set to avoid. Only ever touches generated hub roots, never hand-written files.
  const live = new Set(urls);
  let pruned = 0;
  for (const group of ["specialty", "country", "city", "year"]) {
    const dir = path.join(ROOT, group);
    if (!fs.existsSync(dir)) continue;
    for (const slug of fs.readdirSync(dir)) {
      const url = `/${group}/${slug}/`;
      if (live.has(url)) continue;
      const target = path.join(dir, slug);
      if (!fs.statSync(target).isDirectory()) continue;
      fs.rmSync(target, { recursive: true, force: true });
      warn.push(`pruned stale hub ${url}`);
      pruned++;
    }
  }

  for (const w of warn) console.warn("warn: " + w);
  if (pruned) console.log(`build-hubs: pruned ${pruned} stale hub page(s).`);
  console.log(`build-hubs: ${urls.length} pages — ${bySpecialty.size} specialty, ${byCountry.size} country, ` +
              `${cityEntries.length} city, ${byYear.size} year, 1 browse.`);
}

main();
