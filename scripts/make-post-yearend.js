// Generates the year-end CME-deadline Instagram carousel (captions.md #13) as numbered SVGs.
//   node scripts/make-post-yearend.js marketing/posts/2026-10-yearend
//   for f in marketing/posts/2026-10-yearend/*.svg; do rsvg-convert -w 1080 -h 1080 "$f" -o "${f%.svg}.png"; done
//
// Seasonal: post in October, reusable every autumn. The counts are read live from
// conferences.js via scripts/year-end.js, the same source the site callout and
// /how-to/use-cme-funds-before-year-end/ use, so the three can never disagree.
//
// Six slides: hook, the one question that decides everything, the two branches
// (attend this year / prepay next year), the deadline nobody mentions, CTA.
// Typographic house style — no photos, nothing to license.

const fs = require("fs"), path = require("path");
const { yearEndCounts } = require("./year-end");

const ROOT = path.resolve(__dirname, "..");
const outDir = process.argv[2] || "marketing/posts/yearend";
fs.mkdirSync(outDir, { recursive: true });

const src = fs.readFileSync(path.join(ROOT, "conferences.js"), "utf8");
const CONFERENCES = eval("(function(){" + src + "\nreturn CONFERENCES;})()");
const today = new Date().toISOString().slice(0, 10);
const upcoming = CONFERENCES.filter((c) => c.endDate >= today);
const N = yearEndCounts(upcoming);
const NEXT = upcoming.filter((c) => c.year >= Number(N.year) + 1).length;

const W = 1080, H = 1080;
const NAVY = "#0f2942", TEAL = "#36b3a8", SAND = "#F6F1E7", INK = "#1d2b3a", AMBER = "#E0A33E";
const FONT = "Helvetica Neue, Helvetica, Arial, sans-serif";
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
const svg = (b) => `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">\n${b}\n</svg>\n`;
const t = (x, y, s, size, weight, fill, extra = "") =>
  `  <text x="${x}" y="${y}" font-family="${FONT}" font-size="${size}" font-weight="${weight}" fill="${fill}"${extra}>${esc(s)}</text>`;
const logo = (fill) => `  <g transform="translate(64,56) scale(0.85)">
    <path d="M 64 6 C 38 6, 18 24, 18 50 C 18 92, 64 124, 64 124 C 64 124, 110 92, 110 50 C 110 24, 90 6, 64 6 Z" fill="${TEAL}"/>
    <line x1="26" y1="50" x2="102" y2="50" stroke="white" stroke-width="1.6" opacity="0.55"/>
    <path d="M 64 10 Q 34 50 64 90" fill="none" stroke="white" stroke-width="1.6" opacity="0.55"/>
    <rect x="57" y="24" width="14" height="42" fill="white" rx="2"/>
    <rect x="43" y="38" width="42" height="14" fill="white" rx="2"/>
  </g>
${t(180, 130, "convene.md", 46, 700, fill)}`;
const page = (i, n) => t(1010, 1016, `${i} / ${n}`, 30, 500, TEAL, ` text-anchor="end"`);
const write = (i, body) => fs.writeFileSync(path.join(outDir, `slide-0${i}.svg`), svg(body.join("\n")));

// 1 — hook
{
  const b = [`  <rect width="${W}" height="${H}" fill="${NAVY}"/>`, logo("#FFFFFF")];
  b.push(t(70, 310, `YOUR CME ALLOWANCE · ${N.year}`, 30, 600, TEAL, ` letter-spacing="4"`));
  b.push(t(70, 440, "Use it", 130, 800, "#FFFFFF"));
  b.push(t(70, 575, "or lose it.", 130, 800, AMBER));
  b.push(t(70, 690, "Most hospital CME funds expire 31 December", 38, 500, "#FFFFFF", ` opacity="0.9"`));
  b.push(t(70, 742, "and do not roll over.", 38, 500, "#FFFFFF", ` opacity="0.9"`));
  b.push(`  <rect x="70" y="820" width="4" height="118" fill="${TEAL}"/>`);
  b.push(t(104, 872, "There is more left on the calendar", 36, 500, "#FFFFFF"));
  b.push(t(104, 920, "than you think. →", 36, 700, TEAL));
  b.push(t(1010, 1016, "swipe", 30, 500, "#FFFFFF", ` text-anchor="end" opacity="0.6"`));
  write(1, b);
}

// 2 — the one question
{
  const b = [`  <rect width="${W}" height="${H}" fill="${SAND}"/>`, logo(NAVY)];
  b.push(t(70, 268, "FIRST, ASK YOUR ADMINISTRATOR", 26, 600, TEAL, ` letter-spacing="3"`));
  b.push(t(70, 400, "Does my allowance", 76, 800, NAVY));
  b.push(t(70, 486, "pay out on the date", 76, 800, NAVY));
  b.push(t(70, 572, "I register and pay,", 76, 800, NAVY));
  b.push(t(70, 672, "or the date the", 76, 800, "#9C6A14"));
  b.push(t(70, 758, "conference happens?", 76, 800, "#9C6A14"));
  b.push(`  <rect y="840" width="${W}" height="${H - 840}" fill="${NAVY}"/>`);
  b.push(t(70, 912, "That single answer decides everything", 38, 500, "#FFFFFF"));
  b.push(t(70, 964, "below. Ask it in writing.", 38, 500, "#FFFFFF"));
  b.push(page(2, 6));
  write(2, b);
}

// 3 — branch A: must happen this year
{
  const b = [`  <rect width="${W}" height="${H}" fill="${SAND}"/>`, logo(NAVY)];
  b.push(t(1016, 250, "A", 200, 800, TEAL, ` text-anchor="end" opacity="0.16"`));
  b.push(t(70, 268, "IF IT MUST HAPPEN THIS YEAR", 26, 600, TEAL, ` letter-spacing="3"`));
  b.push(t(70, 400, String(N.rest), 150, 800, NAVY));
  b.push(t(70, 462, `conferences still start before 31 December`, 36, 500, INK, ` opacity="0.75"`));
  b.push(t(70, 556, String(N.dec), 110, 800, NAVY));
  b.push(t(70, 610, "of them in December itself", 36, 500, INK, ` opacity="0.75"`));
  b.push(t(70, 700, "Including Kauai, Maui, Ko Olina,", 34, 500, INK));
  b.push(t(70, 744, "Basel, Milan, Singapore and Palm Beach.", 34, 500, INK));
  b.push(`  <rect y="800" width="${W}" height="${H - 800}" fill="${NAVY}"/>`);
  b.push(t(70, 870, "WATCH THE ROOM BLOCK", 24, 600, TEAL, ` letter-spacing="2"`));
  b.push(t(70, 930, "Conference hotel rates usually close", 36, 500, "#FFFFFF"));
  b.push(t(70, 978, "weeks before registration does.", 36, 500, "#FFFFFF"));
  b.push(page(3, 6));
  write(3, b);
}

// 4 — branch B: prepay
{
  const b = [`  <rect width="${W}" height="${H}" fill="${SAND}"/>`, logo(NAVY)];
  b.push(t(1016, 250, "B", 200, 800, TEAL, ` text-anchor="end" opacity="0.16"`));
  b.push(t(70, 268, "IF IT PAYS ON THE DATE YOU REGISTER", 26, 600, TEAL, ` letter-spacing="3"`));
  b.push(t(70, 400, "Book next year's", 76, 800, NAVY));
  b.push(t(70, 486, "meeting now.", 76, 800, NAVY));
  b.push(t(70, 640, String(NEXT), 130, 800, NAVY));
  b.push(t(70, 712, `conferences already listed for ${Number(N.year) + 1} and beyond`, 34, 500, INK, ` opacity="0.75"`));
  b.push(t(70, 778, "Early-bird registration is usually the", 34, 500, INK));
  b.push(t(70, 822, "lowest price a meeting will ever be —", 34, 500, INK));
  b.push(`  <rect y="862" width="${W}" height="${H - 862}" fill="${NAVY}"/>`);
  b.push(t(70, 932, "so the deadline that feels like a", 38, 500, "#FFFFFF"));
  b.push(t(70, 980, "constraint is often the best moment to book.", 38, 500, TEAL));
  b.push(page(4, 6));
  write(4, b);
}

// 5 — the deadline nobody mentions
{
  const b = [`  <rect width="${W}" height="${H}" fill="${NAVY}"/>`, logo("#FFFFFF")];
  b.push(t(70, 300, "THE ONE THAT CATCHES PEOPLE OUT", 28, 600, AMBER, ` letter-spacing="3"`));
  b.push(t(70, 430, "It is not 31", 100, 800, "#FFFFFF"));
  b.push(t(70, 540, "December.", 100, 800, "#FFFFFF"));
  b.push(t(70, 650, "Your reimbursement submission deadline", 38, 500, "#FFFFFF", ` opacity="0.9"`));
  b.push(t(70, 702, "is often weeks earlier than the expiry.", 38, 500, "#FFFFFF", ` opacity="0.9"`));
  b.push(`  <rect x="70" y="780" width="4" height="170" fill="${AMBER}"/>`);
  b.push(t(104, 832, "Also worth confirming:", 34, 500, "#FFFFFF", ` opacity="0.75"`));
  b.push(t(104, 884, "• whether travel and lodging are covered", 34, 500, "#FFFFFF"));
  b.push(t(104, 932, "• whether pre-approval is required first", 34, 500, "#FFFFFF"));
  b.push(page(5, 6));
  write(5, b);
}

// 6 — CTA
{
  const b = [`  <rect width="${W}" height="${H}" fill="${NAVY}"/>`, logo("#FFFFFF")];
  b.push(t(70, 320, "EVERY DATE CHECKED ON THE", 30, 600, TEAL, ` letter-spacing="4"`));
  b.push(t(70, 366, "ORGANISING SOCIETY'S OWN SITE", 30, 600, TEAL, ` letter-spacing="4"`));
  const stat = (y, big, small) => { b.push(t(70, y, big, 92, 800, "#FFFFFF")); b.push(t(70, y + 48, small, 32, 500, "#FFFFFF", ` opacity="0.75"`)); };
  stat(520, String(N.rest), `left before 31 December`);
  stat(700, String(NEXT), `listed for ${Number(N.year) + 1} and beyond`);
  b.push(t(600, 520, "Filter by your", 38, 500, "#FFFFFF"));
  b.push(t(600, 568, "specialty.", 38, 500, "#FFFFFF"));
  b.push(t(600, 668, "Free. No login.", 32, 500, "#FFFFFF", ` opacity="0.75"`));
  b.push(t(600, 714, "Never an aggregator.", 32, 500, TEAL));
  b.push(`  <rect x="70" y="880" width="940" height="110" rx="16" fill="${TEAL}"/>`);
  b.push(t(540, 950, "convene.md/year/" + N.year + "  →  link in bio", 42, 700, NAVY, ` text-anchor="middle"`));
  write(6, b);
}
console.log(`make-post-yearend: 6 slides → ${outDir}/slide-0[1-6].svg  (rest=${N.rest}, dec=${N.dec}, next=${NEXT})`);
