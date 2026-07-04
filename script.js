const SPECIALTY_CLASS = {
  "General Surgery": "gen",
  "Cardiothoracic Surgery": "crd",
  "Neurosurgery": "neu",
  "Orthopedic Surgery": "ort",
  "Plastic Surgery": "pls",
  "Bariatric Surgery": "bar",
  "Endocrine / ENT Surgery": "ent",
  "Vascular Surgery": "vas",
  "Urology": "uro",
  "Colorectal Surgery": "col",
  "Trauma Surgery": "tra",
  "Surgical Oncology": "onc",
  "Pediatric Surgery": "ped",
  "HPB / Transplant Surgery": "hpb"
};

const SPECIALTY_COLOR = {
  "General Surgery": "#e74c3c",
  "Cardiothoracic Surgery": "#9b59b6",
  "Neurosurgery": "#3498db",
  "Orthopedic Surgery": "#f39c12",
  "Plastic Surgery": "#1abc9c",
  "Bariatric Surgery": "#e67e22",
  "Endocrine / ENT Surgery": "#2ecc71",
  "Vascular Surgery": "#d81b60",
  "Urology": "#fbc02d",
  "Colorectal Surgery": "#5d4037",
  "Trauma Surgery": "#37474f",
  "Surgical Oncology": "#283593",
  "Pediatric Surgery": "#00838f",
  "HPB / Transplant Surgery": "#558b2f"
};

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function formatDateRange(start, end) {
  const s = new Date(start + "T00:00:00");
  const e = new Date(end + "T00:00:00");
  const sameMonth = s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear();
  if (sameMonth) {
    return `${MONTHS[s.getMonth()]} ${s.getDate()}–${e.getDate()}, ${e.getFullYear()}`;
  }
  return `${MONTHS[s.getMonth()]} ${s.getDate()} – ${MONTHS[e.getMonth()]} ${e.getDate()}, ${e.getFullYear()}`;
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

function buildPopupHtml(c) {
  return `
    <div class="popup">
      <span class="badge" style="background:${SPECIALTY_COLOR[c.specialty]}22;color:${SPECIALTY_COLOR[c.specialty]}">${escapeHtml(c.specialty)}</span>
      <h3>${escapeHtml(c.name)}</h3>
      <div class="meta"><span class="icon">📅</span><span>${formatDateRange(c.startDate, c.endDate)}</span></div>
      <div class="meta"><span class="icon">📍</span><span>${escapeHtml(c.city)}, ${escapeHtml(c.country)}</span></div>
      <div class="meta"><span class="icon">🏛️</span><span>${escapeHtml(c.organizer)}</span></div>
      <p class="desc">${escapeHtml(c.description)}</p>
      <a class="website" href="${escapeHtml(c.url)}" target="_blank" rel="noopener noreferrer">Visit conference site →</a>
    </div>
  `;
}

function makeMarker(c) {
  const cls = SPECIALTY_CLASS[c.specialty] || "gen";
  const icon = L.divIcon({
    className: "",
    html: `<div class="conf-pin ${cls}"></div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 26],
    popupAnchor: [0, -24]
  });
  return L.marker([c.lat, c.lng], { icon }).bindPopup(buildPopupHtml(c), { maxWidth: 320 });
}

const map = L.map("map", {
  worldCopyJump: true,
  minZoom: 2,
  maxZoom: 10,
  zoomControl: true,
  fadeAnimation: false
}).setView([25, 10], 2);
window.map = map;

L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
  attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · © <a href="https://carto.com/attributions">CARTO</a>',
  subdomains: "abcd",
  maxZoom: 19
}).addTo(map);

const markerLayer = L.layerGroup().addTo(map);

function offsetForOverlap(lat, lng, idx, total) {
  if (total <= 1) return [lat, lng];
  const radius = 0.6;
  const angle = (idx / total) * Math.PI * 2;
  return [lat + Math.cos(angle) * radius, lng + Math.sin(angle) * radius];
}

function render(filtered) {
  markerLayer.clearLayers();
  const groups = new Map();
  filtered.forEach(c => {
    const key = `${c.lat.toFixed(2)},${c.lng.toFixed(2)}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(c);
  });
  groups.forEach(list => {
    list.forEach((c, i) => {
      const [lat, lng] = offsetForOverlap(c.lat, c.lng, i, list.length);
      const m = L.marker([lat, lng], makeMarker({ ...c, lat, lng }).options).bindPopup(buildPopupHtml(c), { maxWidth: 320 });
      m.addTo(markerLayer);
    });
  });
  document.getElementById("count").innerHTML = `Showing <strong>${filtered.length}</strong> of ${CONFERENCES.length}`;
}

function populateFilters() {
  const specialtySel = document.getElementById("specialty");
  const yearSel = document.getElementById("year");
  const specialties = Array.from(new Set(CONFERENCES.map(c => c.specialty))).sort();
  const years = Array.from(new Set(CONFERENCES.map(c => c.year))).sort();
  specialtySel.innerHTML = `<option value="all">All specialties</option>` + specialties.map(s => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join("");
  yearSel.innerHTML = `<option value="all">All years</option>` + years.map(y => `<option value="${y}">${y}</option>`).join("");
}

function applyFilters() {
  const sp = document.getElementById("specialty").value;
  const yr = document.getElementById("year").value;
  const hidePast = document.getElementById("hidePast").checked;
  const todayIso = new Date().toISOString().slice(0, 10);
  const filtered = CONFERENCES.filter(c =>
    (sp === "all" || c.specialty === sp) &&
    (yr === "all" || String(c.year) === yr) &&
    (!hidePast || c.endDate >= todayIso)
  );
  render(filtered);
}

const legend = L.control({ position: "bottomright" });
legend.onAdd = function() {
  const div = L.DomUtil.create("div", "legend");
  const specialties = Array.from(new Set(CONFERENCES.map(c => c.specialty))).sort();
  div.innerHTML = specialties.map(s => `<div class="row"><span class="dot" style="background:${SPECIALTY_COLOR[s] || "#888"}"></span>${escapeHtml(s)}</div>`).join("");
  return div;
};
legend.addTo(map);

populateFilters();
document.getElementById("specialty").addEventListener("change", applyFilters);
document.getElementById("year").addEventListener("change", applyFilters);
document.getElementById("hidePast").addEventListener("change", applyFilters);
applyFilters();
