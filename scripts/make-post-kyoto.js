// Generates the Kyoto autumn post card (captions.md #10) as SVG on stdout.
//   node scripts/make-post-kyoto.js > marketing/posts/2026-11-kyoto.svg
//   rsvg-convert -w 1080 -h 1080 marketing/posts/2026-11-kyoto.svg -o marketing/posts/2026-11-kyoto.png
//
// Follows the house layout set by 2026-07-snowmass.svg: 1080x1080, illustrated scene in the
// top two thirds, navy detail block across the bottom third, logo top-left, two-line
// headline in navy then teal. Scene elements behind the headline stay pale on purpose —
// the headline is navy text sitting directly on the sky, so saturated colour is kept to
// the right side and below the text baseline.

const W = 1080, H = 1080;
const NAVY = "#0f2942", TEAL = "#36b3a8";
const FONT = "Helvetica Neue, Helvetica, Arial, sans-serif";
const SCENE_BOTTOM = 680, BAND_BOTTOM = 780;

const out = [];
const p = (s) => out.push(s);

p(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`);
p(`  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#FDF4E6"/>
      <stop offset="0.55" stop-color="#FBE6CB"/>
      <stop offset="1" stop-color="#F6D4AE"/>
    </linearGradient>
    <linearGradient id="ground" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#F7EBDA"/>
      <stop offset="1" stop-color="#EFDFC8"/>
    </linearGradient>
  </defs>`);

// --- sky and a low autumn sun
p(`  <rect width="${W}" height="${SCENE_BOTTOM}" fill="url(#sky)"/>`);
p(`  <circle cx="250" cy="200" r="132" fill="#FFF0D0" opacity="0.55"/>`);
p(`  <circle cx="250" cy="200" r="78" fill="#FFE7B4" opacity="0.9"/>`);

// --- Higashiyama hills, kept pale so the headline stays legible over them
const hill = (pts, fill, op = 1) =>
  p(`  <polygon points="${pts}" fill="${fill}" opacity="${op}"/>`);
hill("0,470 210,352 430,470 430,680 0,680", "#CBD9E4", 0.75);
hill("280,512 570,398 900,512 900,680 280,680", "#BCCEDD", 0.7);
hill("620,470 880,344 1080,470 1080,680 620,680", "#AFC4D6", 0.75);

// --- five-storey pagoda, drawn as stacked roofs with upturned eaves.
// Computed rather than hand-placed so the taper stays even.
function pagoda(cx, baseY, tiers = 5) {
  const g = [];
  const tierH = 58, widest = 208;
  for (let i = 0; i < tiers; i++) {
    const w = widest - i * 24;
    const y = baseY - i * tierH;
    const bodyW = w * 0.52, bodyH = tierH - 24;
    // body
    g.push(`<rect x="${(cx - bodyW / 2).toFixed(1)}" y="${(y - bodyH).toFixed(1)}" width="${bodyW.toFixed(1)}" height="${bodyH.toFixed(1)}" fill="#2C3E52"/>`);
    // roof: flat top, eaves flicking up at each end
    const ry = y - bodyH;
    g.push(`<path d="M ${(cx - w / 2).toFixed(1)} ${ry.toFixed(1)}
      Q ${(cx - w / 2 + 14).toFixed(1)} ${(ry - 6).toFixed(1)} ${(cx - w / 2 + 30).toFixed(1)} ${(ry - 10).toFixed(1)}
      L ${(cx - w * 0.16).toFixed(1)} ${(ry - 26).toFixed(1)}
      L ${(cx + w * 0.16).toFixed(1)} ${(ry - 26).toFixed(1)}
      L ${(cx + w / 2 - 30).toFixed(1)} ${(ry - 10).toFixed(1)}
      Q ${(cx + w / 2 - 14).toFixed(1)} ${(ry - 6).toFixed(1)} ${(cx + w / 2).toFixed(1)} ${ry.toFixed(1)} Z"
      fill="#1F3346"/>`);
  }
  // finial
  const topY = baseY - (tiers - 1) * tierH - (tierH - 24) - 26;
  g.push(`<rect x="${cx - 3}" y="${(topY - 54).toFixed(1)}" width="6" height="54" fill="#1F3346"/>`);
  for (let r = 0; r < 3; r++) {
    g.push(`<circle cx="${cx}" cy="${(topY - 20 - r * 12).toFixed(1)}" r="${7 - r}" fill="#1F3346"/>`);
  }
  return g.join("\n    ");
}
p(`  <g opacity="0.92">
    ${pagoda(892, SCENE_BOTTOM)}
  </g>`);

// --- Japanese maples. Canopies are overlapping blobs rather than one shape so the
// silhouette reads as foliage at thumbnail size.
function maple(cx, baseY, scale, palette) {
  const g = [];
  const th = 92 * scale;
  g.push(`<rect x="${(cx - 7 * scale).toFixed(1)}" y="${(baseY - th).toFixed(1)}" width="${(14 * scale).toFixed(1)}" height="${th.toFixed(1)}" fill="#6B4A34"/>`);
  g.push(`<path d="M ${cx} ${(baseY - th * 0.55).toFixed(1)} l ${(-30 * scale).toFixed(1)} ${(-34 * scale).toFixed(1)}" stroke="#6B4A34" stroke-width="${(9 * scale).toFixed(1)}" fill="none" stroke-linecap="round"/>`);
  g.push(`<path d="M ${cx} ${(baseY - th * 0.68).toFixed(1)} l ${(32 * scale).toFixed(1)} ${(-30 * scale).toFixed(1)}" stroke="#6B4A34" stroke-width="${(9 * scale).toFixed(1)}" fill="none" stroke-linecap="round"/>`);
  const blobs = [
    [0, -1.42, 0.72], [-0.62, -1.16, 0.58], [0.64, -1.20, 0.60],
    [-0.30, -1.72, 0.50], [0.34, -1.74, 0.48], [0, -1.02, 0.52],
    [-0.90, -1.44, 0.36], [0.92, -1.48, 0.38],
  ];
  blobs.forEach(([dx, dy, r], i) => {
    g.push(`<circle cx="${(cx + dx * 92 * scale).toFixed(1)}" cy="${(baseY + dy * 92 * scale).toFixed(1)}" r="${(r * 92 * scale).toFixed(1)}" fill="${palette[i % palette.length]}"/>`);
  });
  return g.join("\n    ");
}
const HOT = ["#C63B24", "#E0592C", "#D8452A", "#EE7B3C", "#C0392B", "#E86A31", "#D64A28", "#F0954A"];
const WARM = ["#E0592C", "#EE9B48", "#D8452A", "#F0A85A", "#E86A31", "#DE7A35", "#C63B24", "#F2B266"];

// Ground band goes down BEFORE the trees so they stand on it. Drawn after, it clipped the
// trunks and the canopies read as floating shrubs.
p(`  <rect y="${SCENE_BOTTOM}" width="${W}" height="${BAND_BOTTOM - SCENE_BOTTOM}" fill="url(#ground)"/>`);

// Trees are rooted in the band and sized so no canopy reaches the headline baseline
// (~y 555). The right-hand pair carries the saturated colour and frames the pagoda.
const TREE_BASE = 752;
p(`  <g>\n    ${maple(118, TREE_BASE, 0.66, WARM)}\n  </g>`);
p(`  <g opacity="0.95">\n    ${maple(688, TREE_BASE, 0.62, WARM)}\n  </g>`);
p(`  <g>\n    ${maple(1002, TREE_BASE, 0.92, HOT)}\n  </g>`);

// --- drifting leaves. Fixed positions so the card renders identically every time.
// Kept sparse, small and high: at thumbnail size a spiky silhouette reads as a sparkle,
// so these sit in open sky where the five-lobed shape is legible.
const leaves = [
  [372, 268, 15, -22, 0.5], [452, 196, 11, 16, 0.4], [548, 246, 12, -8, 0.44],
  [636, 182, 10, 28, 0.36], [196, 306, 12, 10, 0.4], [292, 214, 9, -16, 0.33],
];
for (const [x, y, s, rot, op] of leaves) {
  p(`  <g transform="translate(${x},${y}) rotate(${rot}) scale(${(s / 14).toFixed(2)})" opacity="${op}">
    <path d="M 0 13 L -1.5 4 L -9 8 L -6 1 L -13 -3 L -6.5 -4 L -9.5 -11 L -3 -8 L 0 -14
             L 3 -8 L 9.5 -11 L 6.5 -4 L 13 -3 L 6 1 L 9 8 L 1.5 4 Z" fill="#D8452A"/>
  </g>`);
}

// --- navy detail block
p(`  <rect y="${BAND_BOTTOM}" width="${W}" height="${H - BAND_BOTTOM}" fill="${NAVY}"/>`);

// --- logo mark + wordmark (same geometry as the other cards)
p(`  <g transform="translate(64,56) scale(0.85)">
    <path d="M 64 6 C 38 6, 18 24, 18 50 C 18 92, 64 124, 64 124 C 64 124, 110 92, 110 50 C 110 24, 90 6, 64 6 Z" fill="${TEAL}"/>
    <line x1="26" y1="50" x2="102" y2="50" stroke="white" stroke-width="1.6" opacity="0.55"/>
    <path d="M 64 10 Q 34 50 64 90" fill="none" stroke="white" stroke-width="1.6" opacity="0.55"/>
    <rect x="57" y="24" width="14" height="42" fill="white" rx="2"/>
    <rect x="43" y="38" width="42" height="14" fill="white" rx="2"/>
  </g>`);
const t = (x, y, s, size, weight, fill, extra = "") =>
  p(`  <text x="${x}" y="${y}" font-family="${FONT}" font-size="${size}" font-weight="${weight}" fill="${fill}"${extra}>${s}</text>`);

t(180, 130, "convene.md", 46, 700, NAVY);

// --- headline
t(70, 445, "Morning sessions.", 72, 800, NAVY);
t(70, 532, "Afternoon maples.", 72, 800, "#C63B24");

// --- detail block copy
t(70, 882, "INTERNAL MEDICINE FOR PRIMARY CARE · 16 CREDITS", 28, 600, TEAL, ` letter-spacing="2"`);
t(70, 952, "Kyoto, Japan", 56, 700, "#FFFFFF");
t(70, 1016, "Nov 10–13, 2026", 40, 500, "#FFFFFF", ` opacity="0.85"`);
t(1010, 1016, "convene.md", 40, 700, TEAL, ` text-anchor="end"`);

p(`</svg>`);
process.stdout.write(out.join("\n") + "\n");
