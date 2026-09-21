// Generates the monthly "New on the map" Instagram CAROUSEL as numbered SVGs (captions.md #12).
//   node scripts/make-post-update.js marketing/posts/2026-09-update
//   for f in marketing/posts/2026-09-update/*.svg; do rsvg-convert -w 1080 -h 1080 "$f" -o "${f%.svg}.png"; done
//
// Format #2 from marketing/instagram.md ("this month" carousel), and the Instagram twin of
// newsletter issue 1: same six destinations, same order, same one-line hooks, so the two
// channels tell one story. House palette from the destination cards (navy / teal / sand),
// but typographic rather than illustrated — eight illustrated scenes is a week of work and
// the roundup's subject is the list, not any one place.
//
// Slide 1 cover · slides 2–7 one destination each · slide 8 the numbers + CTA.
// Edit SLIDES below when reusing for October; everything else is layout.

const fs = require("fs"), path = require("path");
const outDir = process.argv[2] || "marketing/posts/update";
fs.mkdirSync(outDir, { recursive: true });

const W = 1080, H = 1080;
const NAVY = "#0f2942", TEAL = "#36b3a8", SAND = "#F6F1E7", INK = "#1d2b3a";
const FONT = "Helvetica Neue, Helvetica, Arial, sans-serif";
const MONTH = "SEPTEMBER 2026";

const SLIDES = [
  { n: "01", place: ["Vilamoura"], sub: "Algarve, Portugal",
    hook: ["March on the Algarve is mild and quiet."],
    eyebrow: "CARDIOLOGY · PORTUGUESE CARDIAC SOCIETY", title: ["Congresso Português de Cardiologia"], when: "18–21 Mar 2027" },
  { n: "02", place: ["Reykjavik"], sub: "Iceland — a new country on the map",
    hook: ["Six conferences. Late August is the window —", "after the crowds, before the dark."],
    eyebrow: "RHEUMATOLOGY · STROKE · ANESTHESIA · 2 CME CRUISES", title: ["Six meetings, Jul–Sep 2027"], when: "Harpa · Hilton · Iceland Parliament Hotel" },
  { n: "03", place: ["Athens"], sub: "Greece",
    hook: ["English-language programme at the Grand Hyatt.", "Close enough to plan now."],
    eyebrow: "CARDIOLOGY · HELLENIC SOCIETY OF CARDIOLOGY", title: ["International Cardiology Congress"], when: "13–15 Nov 2026" },
  { n: "04", place: ["The Nordic", "rotation"], sub: "Copenhagen · Turku · Tampere · Stockholm",
    hook: ["The Nordic federations rotate between countries", "and publish years ahead. Finland is new with four."],
    eyebrow: "UROLOGY · ENT · OB/GYN · NEPHROLOGY", title: ["Four federation congresses"], when: "May – Oct 2027" },
  { n: "05", place: ["Kahuku, Oahu"], sub: "Hawaii — the North Shore",
    hook: ["Cedars-Sinai's long-running symposium.", "One month out."],
    eyebrow: "CARDIOLOGY · CEDARS-SINAI", title: ["25th Hawaii Cardiovascular Symposium"], when: "21–24 Oct 2026" },
  { n: "06", place: ["Kyoto"], sub: "Japan",
    hook: ["Four Seasons Kyoto, in autumn-colour season."],
    eyebrow: "INTERNAL MEDICINE · MER · 16 CREDITS", title: ["Internal Medicine for Primary Care"], when: "10–13 Nov 2026" },
];

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
function svg(body) { return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">\n${body}\n</svg>\n`; }
const t = (x, y, s, size, weight, fill, extra = "") =>
  `  <text x="${x}" y="${y}" font-family="${FONT}" font-size="${size}" font-weight="${weight}" fill="${fill}"${extra}>${esc(s)}</text>`;
const logo = (fill, scale = 0.85, x = 64, y = 56) => `  <g transform="translate(${x},${y}) scale(${scale})">
    <path d="M 64 6 C 38 6, 18 24, 18 50 C 18 92, 64 124, 64 124 C 64 124, 110 92, 110 50 C 110 24, 90 6, 64 6 Z" fill="${TEAL}"/>
    <line x1="26" y1="50" x2="102" y2="50" stroke="white" stroke-width="1.6" opacity="0.55"/>
    <path d="M 64 10 Q 34 50 64 90" fill="none" stroke="white" stroke-width="1.6" opacity="0.55"/>
    <rect x="57" y="24" width="14" height="42" fill="white" rx="2"/>
    <rect x="43" y="38" width="42" height="14" fill="white" rx="2"/>
  </g>
${t(180, 130, "convene.md", 46, 700, fill)}`;

// ---- slide 1: cover
{
  const b = [];
  b.push(`  <rect width="${W}" height="${H}" fill="${NAVY}"/>`);
  b.push(logo("#FFFFFF"));
  b.push(t(70, 300, MONTH, 30, 600, TEAL, ` letter-spacing="4"`));
  b.push(t(70, 420, "New on", 118, 800, "#FFFFFF"));
  b.push(t(70, 545, "the map.", 118, 800, TEAL));
  b.push(t(70, 660, "174 conferences added since August —", 38, 500, "#FFFFFF", ` opacity="0.9"`));
  b.push(t(70, 712, "national societies, destination CME, two new countries.", 38, 500, "#FFFFFF", ` opacity="0.9"`));
  // six numbered dots: the carousel's own table of contents
  SLIDES.forEach((s, i) => {
    const cx = 100 + i * 96;
    b.push(`  <circle cx="${cx}" cy="850" r="34" fill="none" stroke="${TEAL}" stroke-width="3"/>`);
    b.push(t(cx, 862, String(i + 1), 34, 700, "#FFFFFF", ` text-anchor="middle"`));
  });
  b.push(t(70, 960, "Six worth a look →", 44, 700, TEAL));
  b.push(t(1010, 1016, "swipe", 30, 500, "#FFFFFF", ` text-anchor="end" opacity="0.6"`));
  fs.writeFileSync(path.join(outDir, "slide-01.svg"), svg(b.join("\n")));
}

// ---- slides 2–7: destinations
SLIDES.forEach((s, i) => {
  const b = [];
  const BAND = 760;
  b.push(`  <rect width="${W}" height="${BAND}" fill="${SAND}"/>`);
  b.push(logo(NAVY));
  // slide index, large and faint, top right
  b.push(t(1016, 250, s.n, 220, 800, TEAL, ` text-anchor="end" opacity="0.16"`));
  b.push(t(70, 268, `NEW ON THE MAP · ${MONTH}`, 26, 600, TEAL, ` letter-spacing="3"`));
  // place name, one or two lines
  const placeSize = s.place.some(l => l.length > 11) ? 100 : 112;
  let y = s.place.length === 2 ? 400 : 450;
  s.place.forEach((line, k) => { b.push(t(70, y + k * (placeSize + 6), line, placeSize, 800, NAVY)); });
  const afterPlace = y + (s.place.length - 1) * (placeSize + 6);
  b.push(t(70, afterPlace + 62, s.sub, 40, 500, INK, ` opacity="0.7"`));
  // hook, up to two lines, sits above the band
  const hookY = BAND - 40 - (s.hook.length - 1) * 46;
  s.hook.forEach((line, k) => { b.push(t(70, hookY + k * 46, line, 34, 500, INK)); });
  // navy band
  b.push(`  <rect y="${BAND}" width="${W}" height="${H - BAND}" fill="${NAVY}"/>`);
  b.push(t(70, 838, s.eyebrow, 24, 600, TEAL, ` letter-spacing="2"`));
  s.title.forEach((line, k) => { b.push(t(70, 908 + k * 52, line, 46, 700, "#FFFFFF")); });
  b.push(t(70, 990, s.when, 36, 500, "#FFFFFF", ` opacity="0.85"`));
  b.push(t(1010, 990, `${i + 1} / 6`, 30, 500, TEAL, ` text-anchor="end"`));
  fs.writeFileSync(path.join(outDir, `slide-0${i + 2}.svg`), svg(b.join("\n")));
});

// ---- slide 8: the numbers + CTA
{
  const b = [];
  b.push(`  <rect width="${W}" height="${H}" fill="${NAVY}"/>`);
  b.push(logo("#FFFFFF"));
  b.push(t(70, 300, "THE WHOLE MAP", 30, 600, TEAL, ` letter-spacing="4"`));
  const stat = (y, big, small) => { b.push(t(70, y, big, 96, 800, "#FFFFFF")); b.push(t(70, y + 50, small, 34, 500, "#FFFFFF", ` opacity="0.75"`)); };
  stat(420, "950+", "upcoming conferences");
  stat(590, "68", "countries");
  stat(760, "46", "specialties");
  const RX = 540;
  b.push(t(RX, 420, "Every date and venue", 36, 500, "#FFFFFF"));
  b.push(t(RX, 466, "checked on the organising", 36, 500, "#FFFFFF"));
  b.push(t(RX, 512, "society's own site.", 36, 500, "#FFFFFF"));
  b.push(t(RX, 600, "Verified, not aggregated.", 38, 700, TEAL));
  b.push(t(RX, 700, "Free. No login.", 32, 500, "#FFFFFF", ` opacity="0.75"`));
  b.push(t(RX, 744, "One email a month,", 32, 500, "#FFFFFF", ` opacity="0.75"`));
  b.push(t(RX, 788, "if you want it.", 32, 500, "#FFFFFF", ` opacity="0.75"`));
  b.push(`  <rect x="70" y="880" width="940" height="110" rx="16" fill="${TEAL}"/>`);
  b.push(t(540, 950, "convene.md/new  →  link in bio", 44, 700, NAVY, ` text-anchor="middle"`));
  fs.writeFileSync(path.join(outDir, "slide-08.svg"), svg(b.join("\n")));
}
console.log(`make-post-update: 8 slides → ${outDir}/slide-0[1-8].svg`);
