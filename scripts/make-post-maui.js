// Generates the Maui "stacked conferences" post card (captions.md #11) as SVG on stdout.
//   node scripts/make-post-maui.js > marketing/posts/2027-01-maui-stack.svg
//   rsvg-convert -w 1080 -h 1080 marketing/posts/2027-01-maui-stack.svg -o marketing/posts/2027-01-maui-stack.png
//
// House layout from 2026-07-snowmass.svg: 1080x1080, pale illustrated scene up top, navy
// detail block across the bottom third, logo top-left, two-line headline.
//
// This card differs from the destination cards in that the IDEA is the subject, not the
// place — so the middle carries a timeline showing two meetings with the free weekend
// highlighted between them. The weekend chip is the whole point and gets the accent colour.

const W = 1080, H = 1080;
const NAVY = "#0f2942", TEAL = "#36b3a8", SAND = "#F3D9A4";
const FONT = "Helvetica Neue, Helvetica, Arial, sans-serif";
const SCENE_BOTTOM = 640, BAND_BOTTOM = 760;
const out = [];
const p = (s) => out.push(s);

p(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`);
p(`  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#FDF1E0"/>
      <stop offset="0.5" stop-color="#FBD9B4"/>
      <stop offset="1" stop-color="#F7B98C"/>
    </linearGradient>
    <linearGradient id="sea" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#5FA8B8"/>
      <stop offset="1" stop-color="#3E8598"/>
    </linearGradient>
  </defs>`);

// sky, low sun, sea, sand
p(`  <rect width="${W}" height="${SCENE_BOTTOM}" fill="url(#sky)"/>`);
p(`  <circle cx="812" cy="300" r="150" fill="#FFE9C2" opacity="0.55"/>`);
p(`  <circle cx="812" cy="300" r="86" fill="#FFD79B"/>`);
p(`  <rect y="470" width="${W}" height="${SCENE_BOTTOM - 470}" fill="url(#sea)"/>`);
// (No sun glitter: the timeline cards cover that stretch of water, and only stray
// fragments survived beside the right-hand card.)
p(`  <rect y="${SCENE_BOTTOM}" width="${W}" height="${BAND_BOTTOM - SCENE_BOTTOM}" fill="${SAND}"/>`);

// palms, rooted in the sand band
function palm(cx, baseY, s, flip) {
  const g = [];
  const h = 150 * s;
  g.push(`<path d="M ${cx} ${baseY} Q ${cx + (flip ? 14 : -14) * s} ${baseY - h * 0.55} ${cx + (flip ? 26 : -26) * s} ${baseY - h}" stroke="#6B4A34" stroke-width="${(11 * s).toFixed(1)}" fill="none" stroke-linecap="round"/>`);
  const tx = cx + (flip ? 26 : -26) * s, ty = baseY - h;
  const fronds = [[-96, -34], [-70, -74], [0, -88], [70, -74], [96, -34], [-46, 6], [46, 6]];
  fronds.forEach(([dx, dy]) => {
    g.push(`<path d="M ${tx} ${ty} Q ${tx + dx * s * 0.55} ${ty + dy * s * 1.05} ${tx + dx * s} ${ty + dy * s * 0.32}" stroke="#1F6B4F" stroke-width="${(13 * s).toFixed(1)}" fill="none" stroke-linecap="round" opacity="0.95"/>`);
  });
  return g.join("\n    ");
}
p(`  <g>\n    ${palm(96, 754, 0.82, false)}\n  </g>`);
p(`  <g opacity="0.92">\n    ${palm(1000, 756, 0.72, true)}\n  </g>`);

// navy block
p(`  <rect y="${BAND_BOTTOM}" width="${W}" height="${H - BAND_BOTTOM}" fill="${NAVY}"/>`);

// logo + wordmark
p(`  <g transform="translate(64,52) scale(0.8)">
    <path d="M 64 6 C 38 6, 18 24, 18 50 C 18 92, 64 124, 64 124 C 64 124, 110 92, 110 50 C 110 24, 90 6, 64 6 Z" fill="${TEAL}"/>
    <line x1="26" y1="50" x2="102" y2="50" stroke="white" stroke-width="1.6" opacity="0.55"/>
    <path d="M 64 10 Q 34 50 64 90" fill="none" stroke="white" stroke-width="1.6" opacity="0.55"/>
    <rect x="57" y="24" width="14" height="42" fill="white" rx="2"/>
    <rect x="43" y="38" width="42" height="14" fill="white" rx="2"/>
  </g>`);
const t = (x, y, s, size, weight, fill, extra = "") =>
  p(`  <text x="${x}" y="${y}" font-family="${FONT}" font-size="${size}" font-weight="${weight}" fill="${fill}"${extra}>${s}</text>`);
t(170, 122, "convene.md", 44, 700, NAVY);

// headline
t(70, 246, "Two conferences.", 74, 800, NAVY);
t(70, 330, "One airfare.", 74, 800, "#C2571F");

// --- timeline: meeting / free weekend / meeting
const cardY = 386, cardH = 172;
const box = (x, w, fill, stroke) =>
  `<rect x="${x}" y="${cardY}" width="${w}" height="${cardH}" rx="14" fill="${fill}" stroke="${stroke}" stroke-width="2"/>`;
p(`  ${box(70, 340, "rgba(255,255,255,0.94)", "#E2CBA8")}`);
p(`  ${box(444, 192, TEAL, TEAL)}`);
p(`  ${box(670, 340, "rgba(255,255,255,0.94)", "#E2CBA8")}`);

const cap = (x, y, s, size, weight, fill, anchor = "middle", ls = 0) =>
  p(`  <text x="${x}" y="${y}" font-family="${FONT}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}" letter-spacing="${ls}">${s}</text>`);

cap(240, cardY + 40, "JAN 16–22", 22, 700, "#8A6A3A", "middle", 1.5);
cap(240, cardY + 84, "Hawaiian Eye", 30, 700, NAVY);
cap(240, cardY + 118, "&amp; Retina", 30, 700, NAVY);
cap(240, cardY + 150, "Ophthalmology", 19, 500, "#6C7A8A");

cap(540, cardY + 46, "SAT + SUN", 21, 700, "#EAFBF8", "middle", 1.5);
cap(540, cardY + 92, "FREE", 40, 800, "#FFFFFF");
cap(540, cardY + 136, "in Wailea", 22, 600, "#DFF6F2");

cap(840, cardY + 40, "JAN 25–29", 22, 700, "#8A6A3A", "middle", 1.5);
cap(840, cardY + 84, "Maui Derm", 30, 700, NAVY);
cap(840, cardY + 118, "Hawaii", 30, 700, NAVY);
cap(840, cardY + 150, "Dermatology", 19, 500, "#6C7A8A");

// connectors
p(`  <rect x="410" y="${cardY + cardH / 2 - 3}" width="34" height="6" fill="#C99A5B" opacity="0.75"/>`);
p(`  <rect x="636" y="${cardY + cardH / 2 - 3}" width="34" height="6" fill="#C99A5B" opacity="0.75"/>`);

// detail block copy
t(70, 848, "THE WEEKEND BETWEEN TWO MEETINGS IS A BUSINESS DAY", 25, 600, TEAL, ` letter-spacing="1.6"`);
t(70, 920, "Wailea, Maui", 54, 700, "#FFFFFF");
t(70, 984, "January 2027", 38, 500, "#FFFFFF", ` opacity="0.85"`);
t(1010, 984, "convene.md", 38, 700, TEAL, ` text-anchor="end"`);

p(`</svg>`);
process.stdout.write(out.join("\n") + "\n");
