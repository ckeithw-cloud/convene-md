// Regenerates SEO artifacts from conferences.js:
//   - JSON-LD (schema.org Event graph) injected into index.html  → Google event rich results / carousel
//   - a crawlable text list injected into index.html
//   - sitemap.xml and robots.txt
// Run after any change to conferences.js:  node scripts/build-seo.js
// (The weekly auto-updater calls this automatically.)

const fs = require("fs");
const path = require("path");

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

  let html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
  html = injectBetween(html, "<!-- SEO:JSONLD:START -->", "<!-- SEO:JSONLD:END -->", buildJsonLd(upcoming));
  html = injectBetween(html, "<!-- SEO:LIST:START -->", "<!-- SEO:LIST:END -->", buildList(upcoming));
  fs.writeFileSync(path.join(ROOT, "index.html"), html);

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${SITE}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>
`;
  fs.writeFileSync(path.join(ROOT, "sitemap.xml"), sitemap);

  const robots = `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`;
  fs.writeFileSync(path.join(ROOT, "robots.txt"), robots);

  console.log(`build-seo: ${upcoming.length} upcoming events → JSON-LD + list injected, sitemap.xml + robots.txt written.`);
}

main();
