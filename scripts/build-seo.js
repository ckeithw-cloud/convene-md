// Regenerates SEO artifacts from conferences.js:
//   - JSON-LD (schema.org Event graph) injected into index.html  → Google event rich results / carousel
//   - a crawlable text list injected into index.html
//   - sitemap.xml and robots.txt
// Run after any change to conferences.js:  node scripts/build-seo.js
// (The weekly auto-updater calls this automatically.)

const fs = require("fs");
const path = require("path");

const { signupBlock } = require("./signup-block");

const ROOT = path.resolve(__dirname, "..");
const SITE = "https://convene.md";
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function loadConferences() {
  const src = fs.readFileSync(path.join(ROOT, "conferences.js"), "utf8");
  return eval("(function(){" + src + "\nreturn CONFERENCES;})()");
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
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

function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function buildJsonLd(upcoming) {
  const events = upcoming.map(c => ({
    "@type": "Event",
    name: c.name,
    startDate: c.startDate,
    endDate: c.endDate,
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    eventStatus: "https://schema.org/EventScheduled",
    location: {
      "@type": "Place",
      name: `${c.city}, ${c.country}`,
      address: {
        "@type": "PostalAddress",
        addressLocality: c.city,
        addressCountry: c.country
      }
    },
    description: c.description,
    url: c.url,
    organizer: { "@type": "Organization", name: c.organizer, url: c.url },
    image: `${SITE}/logo-social.png`
  }));

  const graph = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        name: "convene.md",
        url: SITE + "/",
        description: "Interactive world map of medical and surgical conferences."
      },
      ...events
    ]
  };
  return `<script type="application/ld+json">\n${JSON.stringify(graph, null, 2)}\n</script>`;
}

function buildList(upcoming) {
  const items = upcoming.map(c =>
    `<li><a href="${esc(c.url)}">${esc(c.name)}</a> — ${esc(c.city)}, ${esc(c.country)} — ${esc(fmtRange(c.startDate, c.endDate))} — ${esc(c.specialty)}</li>`
  ).join("\n");
  return `<ul>\n${items}\n</ul>`;
}

// Gives crawlers a path from the homepage to every hub page. Rendered inside the
// visually-hidden .seo-index block; the same destinations are reachable by users
// through the "Browse" link in the List view.
function buildHubLinks(hubUrls) {
  if (!hubUrls.length) return "";
  const label = (u) => {
    const parts = u.split("/").filter(Boolean);        // ["specialty","cardiology"]
    const kind = parts[0];
    const name = (parts[1] || "").replace(/-/g, " ").replace(/\band\b/g, "&");
    const title = name.replace(/\b\w/g, m => m.toUpperCase());
    if (kind === "specialty") return `${title} conferences`;
    if (kind === "country")   return `Medical conferences in ${title}`;
    if (kind === "city")      return `Medical conferences in ${title}`;
    if (kind === "year")      return `Medical conferences ${parts[1]}`;
    return "Browse all conferences";
  };
  const items = hubUrls
    .map(u => `<li><a href="${u}">${esc(label(u))}</a></li>`)
    .join("\n");
  return `<nav aria-label="Browse conference categories">\n<ul>\n${items}\n</ul>\n</nav>`;
}

function injectBetween(html, startMarker, endMarker, payload) {
  const start = html.indexOf(startMarker);
  const end = html.indexOf(endMarker);
  if (start === -1 || end === -1) throw new Error(`markers not found: ${startMarker}`);
  return html.slice(0, start + startMarker.length) + "\n" + payload + "\n  " + html.slice(end);
}

function main() {
  const all = loadConferences();
  const today = todayIso();
  const upcoming = all
    .filter(c => c.endDate >= today)
    .sort((a, b) => a.startDate.localeCompare(b.startDate));

  // Read hub URLs first: they feed both the crawlable link block and the sitemap.
  let hubUrls = [];
  const hubUrlsFile = path.join(ROOT, "scripts", "hub-urls.json");
  if (fs.existsSync(hubUrlsFile)) {
    hubUrls = JSON.parse(fs.readFileSync(hubUrlsFile, "utf8"));
  } else {
    console.warn("build-seo: scripts/hub-urls.json not found — run scripts/build-hubs.js first; sitemap will list the homepage only.");
  }

  let html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
  html = injectBetween(html, "<!-- SEO:JSONLD:START -->", "<!-- SEO:JSONLD:END -->", buildJsonLd(upcoming));
  html = injectBetween(html, "<!-- SEO:HUBS:START -->", "<!-- SEO:HUBS:END -->", buildHubLinks(hubUrls));
  html = injectBetween(html, "<!-- SEO:LIST:START -->", "<!-- SEO:LIST:END -->", buildList(upcoming));
  html = injectBetween(html, "<!-- SEO:SIGNUP:START -->", "<!-- SEO:SIGNUP:END -->",
    signupBlock({ source: "/" }));
  fs.writeFileSync(path.join(ROOT, "index.html"), html);

  // Hand-written article pages carry the same marker pair, so the capture block stays
  // identical everywhere rather than being copied and left to drift.
  for (const rel of ["how-to/deduct-cme-travel/index.html"]) {
    const file = path.join(ROOT, rel);
    if (!fs.existsSync(file)) continue;
    let doc = fs.readFileSync(file, "utf8");
    doc = injectBetween(doc, "<!-- SEO:SIGNUP:START -->", "<!-- SEO:SIGNUP:END -->",
      signupBlock({ source: "/" + path.dirname(rel) + "/" }));
    fs.writeFileSync(file, doc);
  }

  // Hub pages go in the sitemap too — they are the pages that can actually rank
  // for "<specialty> conferences" and "medical conferences in <place>" queries.
  const entry = (loc, priority) => `  <url>
    <loc>${SITE}${loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${priority}</priority>
  </url>`;

  // Hand-written editorial pages. Unlike hubs these are not generated, so they have to be
  // listed explicitly or they never reach the sitemap. They target informational queries
  // ("can I deduct a medical conference") that the conference hubs cannot rank for, so they
  // carry a high priority despite being few. The existsSync filter means an entry listed
  // here before its page exists is simply skipped rather than emitting a dead sitemap URL.
  const staticPages = ["/how-to/deduct-cme-travel/"].filter((p) =>
    fs.existsSync(path.join(ROOT, p, "index.html"))
  );

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entry("/", "1.0")}
${staticPages.map(u => entry(u, "0.9")).join("\n")}
${hubUrls.map(u => entry(u, u === "/browse/" ? "0.9" : "0.8")).join("\n")}
</urlset>
`;
  fs.writeFileSync(path.join(ROOT, "sitemap.xml"), sitemap);

  const robots = `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`;
  fs.writeFileSync(path.join(ROOT, "robots.txt"), robots);

  console.log(`build-seo: ${upcoming.length} upcoming events → JSON-LD + list injected, ` +
              `sitemap.xml (${1 + hubUrls.length} urls) + robots.txt written.`);
}

main();
