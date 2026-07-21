// Generates Reel A ("POV: your hospital gives you a CME budget") as SVG frames.
// 1080x1920 @ 30fps, ~18.5s. Usage:
//   node scripts/make-reel-a.js /path/to/frames-dir
// Then convert frames to PNG (rsvg-convert) and assemble with ffmpeg.

const fs = require("fs");
const path = require("path");

const OUT = process.argv[2];
if (!OUT) { console.error("usage: node make-reel-a.js <frames-dir>"); process.exit(1); }
fs.mkdirSync(OUT, { recursive: true });

const FPS = 30;
const DUR = 18.5;
const W = 1080, H = 1920;
const TEAL = "#36b3a8", NAVY = "#0f2942", LIGHT = "#a8c0d8";
const FONT = "Helvetica Neue, Helvetica, Arial, sans-serif";

const clamp01 = v => Math.max(0, Math.min(1, v));
const lerp = (a, b, t) => a + (b - a) * t;
const easeOutCubic = t => 1 - Math.pow(1 - t, 3);
const easeOutBack = t => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
const fadeIn = (t, t0, d) => clamp01((t - t0) / d);
const fadeOut = (t, t0, d) => 1 - clamp01((t - t0) / d);

const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");

function text(x, y, str, size, fill, weight = 400, anchor = "middle", ls = 0, opacity = 1) {
  if (opacity <= 0.001) return "";
  return `<text x="${x}" y="${y}" font-family="${FONT}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}" letter-spacing="${ls}" opacity="${opacity.toFixed(3)}">${esc(str)}</text>`;
}

function logoPin(cx, topY, scale, pop = 1) {
  if (pop <= 0.001) return "";
  const s = scale * pop;
  const tx = cx - 64 * s, ty = topY + (1 - pop) * 40;
  return `<g transform="translate(${tx} ${ty}) scale(${s})" opacity="${clamp01(pop * 1.4).toFixed(3)}">
    <path d="M 64 6 C 38 6, 18 24, 18 50 C 18 92, 64 124, 64 124 C 64 124, 110 92, 110 50 C 110 24, 90 6, 64 6 Z" fill="${TEAL}"/>
    <line x1="26" y1="50" x2="102" y2="50" stroke="white" stroke-width="1.6" opacity="0.55"/>
    <path d="M 64 10 Q 34 50 64 90" fill="none" stroke="white" stroke-width="1.6" opacity="0.55"/>
    <rect x="57" y="24" width="14" height="42" fill="white" rx="2"/>
    <rect x="43" y="38" width="42" height="14" fill="white" rx="2"/>
  </g>`;
}

// ---------- Scene 1: hook (0 – 3.0s) ----------
function scene1(t) {
  const a = fadeIn(t, 0, 0.3) * fadeOut(t, 2.6, 0.4);
  if (a <= 0.001) return "";
  const pop = easeOutBack(clamp01(t / 0.45));
  let g = logoPin(540, 330, 2.6, pop);
  const lines = [
    { y: 920, str: "POV:", size: 54, fill: LIGHT, w: 600, d: 0.5 },
    { y: 1015, str: "your hospital gives you", size: 76, fill: "#FFFFFF", w: 800, d: 0.85 },
    { y: 1130, str: "a CME budget", size: 100, fill: TEAL, w: 800, d: 1.2 }
  ];
  for (const L of lines) {
    const e = easeOutCubic(fadeIn(t, L.d, 0.45));
    g += text(540, L.y + (1 - e) * 46, L.str, L.size, L.fill, L.w, "middle", 0, e);
  }
  return `<g opacity="${a.toFixed(3)}">${g}</g>`;
}

// ---------- Scene 2: globe + counter (3.0 – 8.0s) ----------
const PIN_COLORS = ["#e74c3c","#1abc9c","#3498db","#9b59b6","#f39c12","#00bcd4","#2ecc71","#d81b60","#fbc02d","#283593","#558b2f","#00838f"];
const PIN_POS = [
  [-2.6,0.72],[-2.0,0.55],[-1.35,0.75],[-0.7,0.6],[-0.15,0.78],
  [0.45,0.62],[1.05,0.74],[1.7,0.58],[2.3,0.76],[2.9,0.6],[-3.05,0.45],[0.8,0.42]
];
function scene2(t) {
  const tl = t - 3.0;
  if (tl < 0 || tl > 5.0) return "";
  const a = fadeIn(tl, 0, 0.4) * fadeOut(tl, 4.6, 0.4);
  if (a <= 0.001) return "";
  const cx = 540, cy = 1075, R = 370;
  let g = "";
  g += text(540, 345, "spend it anywhere", 66, "#FFFFFF", 800, "middle", 0, easeOutCubic(fadeIn(tl, 0.1, 0.4)));
  g += text(540, 440, "there's a conference", 66, TEAL, 800, "middle", 0, easeOutCubic(fadeIn(tl, 0.3, 0.4)));
  // globe frame
  g += `<circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="#FFFFFF" stroke-width="3" opacity="0.28"/>`;
  g += `<ellipse cx="${cx}" cy="${cy}" rx="${R}" ry="${R * 0.34}" fill="none" stroke="#FFFFFF" stroke-width="2" opacity="0.14"/>`;
  g += `<ellipse cx="${cx}" cy="${cy}" rx="${R}" ry="${R * 0.7}" fill="none" stroke="#FFFFFF" stroke-width="2" opacity="0.14"/>`;
  g += `<line x1="${cx - R}" y1="${cy}" x2="${cx + R}" y2="${cy}" stroke="#FFFFFF" stroke-width="2" opacity="0.14"/>`;
  // spinning meridians
  for (let k = 0; k < 6; k++) {
    const phase = (tl * 0.42 + k / 6) % 1;
    const sc = Math.cos(2 * Math.PI * phase);
    const rx = Math.abs(sc) * R;
    if (rx < 5) continue;
    g += `<ellipse cx="${cx}" cy="${cy}" rx="${rx.toFixed(1)}" ry="${R}" fill="none" stroke="#FFFFFF" stroke-width="2" opacity="${(0.07 + 0.15 * Math.abs(sc)).toFixed(3)}"/>`;
  }
  // pins
  PIN_POS.forEach((p, i) => {
    const t0 = 0.55 + i * 0.2;
    const s = easeOutBack(clamp01((tl - t0) / 0.35));
    if (s <= 0.001) return;
    const x = cx + Math.cos(p[0]) * R * p[1];
    const y = cy + Math.sin(p[0]) * R * p[1] * 0.9;
    g += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(17 * s).toFixed(1)}" fill="${PIN_COLORS[i]}" stroke="#FFFFFF" stroke-width="3"/>`;
  });
  // counter
  const prog = clamp01((tl - 0.4) / 1.8);
  const n = Math.floor(easeOutCubic(prog) * 160);
  const label = prog >= 1 ? "160+" : String(n);
  g += text(cx, cy + 80, label, 225, TEAL, 800, "middle");
  g += text(540, 1610, "surgical conferences · every continent", 42, LIGHT, 500, "middle", 1, fadeIn(tl, 1.4, 0.5));
  return `<g opacity="${a.toFixed(3)}">${g}</g>`;
}

// ---------- Scene 3: destination cards (8.0 – 15.8s) ----------
function skiScene() {
  return `
  <rect width="880" height="560" fill="#DCEAF5"/>
  <circle cx="740" cy="110" r="70" fill="#FFF1C4" opacity="0.9"/>
  <polygon points="40,560 390,120 740,560" fill="#E9F1F8"/>
  <polygon points="390,120 740,560 390,560" fill="#CCDDEE"/>
  <polygon points="322,205 390,120 458,205 425,205 390,168 355,205" fill="#FFFFFF"/>
  <polygon points="470,560 730,280 880,560" fill="#E9F1F8"/>
  <polygon points="730,280 880,560 730,560" fill="#CCDDEE"/>
  <polygon points="672,345 730,280 788,345 758,345 730,318 702,345" fill="#FFFFFF"/>
  <rect y="470" width="880" height="90" fill="#F4F8FB"/>
  <polygon points="120,500 165,395 210,500" fill="#1D5B4F"/>
  <polygon points="130,455 165,370 200,455" fill="#247061"/>
  <rect x="158" y="500" width="14" height="24" fill="#5D4037"/>
  <polygon points="250,512 285,432 320,512" fill="#1D5B4F"/>
  <rect x="279" y="512" width="12" height="18" fill="#5D4037"/>`;
}
function surfScene() {
  return `
  <rect width="880" height="560" fill="url(#sunset)"/>
  <circle cx="640" cy="400" r="150" fill="#FFC077" opacity="0.4"/>
  <circle cx="640" cy="400" r="95" fill="#FFDF9E"/>
  <rect y="400" width="880" height="160" fill="#2E7D95"/>
  <path d="M 0 420 Q 110 385 220 420 T 440 420 T 660 420 T 880 420 L 880 440 Q 770 470 660 440 T 440 440 T 220 440 T 0 440 Z" fill="#FFFFFF" opacity="0.5"/>
  <path d="M 745 120 C 735 220, 733 320, 740 560" stroke="${NAVY}" stroke-width="22" fill="none" stroke-linecap="round"/>
  <path d="M 745 128 C 700 95, 650 92, 610 112 C 660 120, 710 128, 745 136 Z" fill="${NAVY}"/>
  <path d="M 745 128 C 790 92, 842 90, 878 108 C 830 119, 782 128, 745 136 Z" fill="${NAVY}"/>
  <path d="M 743 126 C 715 80, 703 48, 707 16 C 731 56, 740 92, 746 124 Z" fill="${NAVY}"/>
  <path d="M 747 126 C 777 84, 813 60, 848 56 C 808 88, 772 112, 749 130 Z" fill="${NAVY}"/>`;
}
function islandScene() {
  return `
  <rect width="880" height="560" fill="url(#sky2)"/>
  <circle cx="190" cy="130" r="115" fill="#FFF3C9" opacity="0.5"/>
  <circle cx="190" cy="130" r="72" fill="#FFE9A8"/>
  <rect y="380" width="880" height="110" fill="#3E8CA8"/>
  <rect x="90" y="405" width="130" height="9" rx="4.5" fill="#6FB0C6" opacity="0.6"/>
  <rect x="600" y="430" width="110" height="9" rx="4.5" fill="#6FB0C6" opacity="0.5"/>
  <rect y="490" width="880" height="70" fill="#F2E2C4"/>
  <path d="M 520 512 A 88 88 0 0 1 696 512 Z" fill="#E76F51"/>
  <path d="M 549 449 A 88 88 0 0 1 604 435 L 604 512 L 549 512 Z" fill="#F4EFE6" opacity="0.85"/>
  <rect x="604" y="512" width="8" height="30" fill="${NAVY}"/>
  <rect x="440" y="506" width="58" height="9" rx="4.5" fill="${NAVY}"/>
  <rect x="446" y="515" width="8" height="26" fill="${NAVY}"/>
  <rect x="484" y="515" width="8" height="26" fill="${NAVY}"/>`;
}

const CARDS = [
  { scene: skiScene,    kicker: "SKI-WEEK CME",   title: "Snowmass, Colorado",       sub1: "Cranial & Spinal Surgery Winter Clinics", sub2: "Feb 28 – Mar 4, 2027" },
  { scene: surfScene,   kicker: "SURF-CAMP CME",  title: "Pacific Coast, Nicaragua", sub1: "Surfers Medical Association",             sub2: "Sep 3 – 10, 2026" },
  { scene: islandScene, kicker: "ISLAND CME",     title: "Waikoloa, Hawaiʻi",   sub1: "Mayo Clinic Interactive Surgery Symposium", sub2: "Jan 31 – Feb 5, 2027" }
];

function scene3(t) {
  const tl = t - 8.0;
  if (tl < 0 || tl > 7.8) return "";
  let g = "";
  g += text(540, 300, "places your CME budget covers:", 54, "#FFFFFF", 800, "middle", 0, easeOutCubic(fadeIn(tl, 0, 0.4)) * fadeOut(tl, 7.4, 0.4));
  const per = 2.6;
  const idx = Math.min(2, Math.floor(tl / per));
  const ct = tl - idx * per;
  const card = CARDS[idx];
  const ain = easeOutCubic(fadeIn(ct, 0, 0.35));
  const aout = fadeOut(ct, per - 0.3, 0.3);
  const alpha = ain * aout;
  if (alpha > 0.001) {
    const dy = (1 - ain) * 70;
    g += `<g opacity="${alpha.toFixed(3)}" transform="translate(0 ${dy.toFixed(1)})">
      <rect x="100" y="360" width="880" height="1230" rx="30" fill="#13304d" stroke="#FFFFFF" stroke-opacity="0.1" stroke-width="2"/>
      <g clip-path="url(#band)"><g transform="translate(100 360)">${card.scene()}</g></g>
      ${text(150, 1030, card.kicker, 36, TEAL, 700, "start", 4)}
      ${text(150, 1108, card.title, 66, "#FFFFFF", 800, "start")}
      ${text(150, 1170, card.sub1, 38, LIGHT, 500, "start")}
      ${text(150, 1228, card.sub2, 38, LIGHT, 500, "start")}
      ${text(150, 1330, `${idx + 1} / 3`, 34, "#5a7898", 600, "start", 2)}
    </g>`;
  }
  return g;
}

// ---------- Scene 4: end card (15.8 – 18.5s) ----------
function scene4(t) {
  const tl = t - 15.8;
  if (tl < 0) return "";
  const a = fadeIn(tl, 0, 0.35);
  if (a <= 0.001) return "";
  const z = 1 + 0.035 * clamp01(tl / 2.7);
  const pop = easeOutBack(clamp01(tl / 0.5));
  let g = "";
  g += logoPin(540, 540, 2.9, pop);
  g += text(540, 1075, "convene.md", 118, TEAL, 800, "middle", 0, easeOutCubic(fadeIn(tl, 0.25, 0.4)));
  g += text(540, 1160, "160+ surgical meetings · one map", 47, "#FFFFFF", 500, "middle", 0, easeOutCubic(fadeIn(tl, 0.45, 0.4)));
  const pa = easeOutCubic(fadeIn(tl, 0.65, 0.4));
  if (pa > 0.001) {
    g += `<g opacity="${pa.toFixed(3)}">
      <rect x="390" y="1230" width="300" height="76" rx="38" fill="${TEAL}"/>
      ${text(540, 1280, "link in bio", 38, "#0f2942", 700, "middle")}
    </g>`;
  }
  return `<g transform="translate(540 960) scale(${z.toFixed(4)}) translate(-540 -960)" opacity="${a.toFixed(3)}">${g}</g>`;
}

// ---------- frame assembly ----------
function frameSvg(t) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<defs>
  <radialGradient id="glow" cx="50%" cy="38%" r="62%">
    <stop offset="0%" stop-color="#12406a"/><stop offset="100%" stop-color="#0f2942"/>
  </radialGradient>
  <linearGradient id="sunset" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#FFD9A8"/><stop offset="1" stop-color="#FF8E6B"/>
  </linearGradient>
  <linearGradient id="sky2" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#D8EEF7"/><stop offset="1" stop-color="#A9DAEE"/>
  </linearGradient>
  <clipPath id="band"><rect x="100" y="360" width="880" height="560" rx="30"/></clipPath>
</defs>
<rect width="${W}" height="${H}" fill="url(#glow)"/>
${scene1(t)}${scene2(t)}${scene3(t)}${scene4(t)}
</svg>`;
}

const total = Math.round(DUR * FPS);
for (let f = 0; f < total; f++) {
  const t = f / FPS;
  fs.writeFileSync(path.join(OUT, `frame${String(f).padStart(4, "0")}.svg`), frameSvg(t));
}
console.log(`wrote ${total} frames to ${OUT}`);
