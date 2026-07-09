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
  "HPB / Transplant Surgery": "hpb",
  "Sports & Wilderness Medicine": "spw"
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
  "HPB / Transplant Surgery": "#558b2f",
  "Sports & Wilderness Medicine": "#00bcd4"
};

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const MONTHS_FULL = ["January","February","March","April","May","June","July","August","September","October","November","December"];

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

function slugify(c) {
  const base = c.name.includes(String(c.year)) ? c.name : c.name + "-" + c.year;
  return base
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function icsEscape(s) {
  return String(s).replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

function icsDate(iso) {
  return iso.replace(/-/g, "");
}

function icsDateExclusiveEnd(iso) {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10).replace(/-/g, "");
}

function icsFold(line) {
  if (line.length <= 74) return line;
  const parts = [];
  let s = line;
  while (s.length > 74) {
    parts.push(s.slice(0, 74));
    s = " " + s.slice(74);
  }
  parts.push(s);
  return parts.join("\r\n");
}

function buildIcs(c) {
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const desc = `${c.organizer}. ${c.description} ${c.url}`;
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//convene.md//Conferences//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    "UID:" + slugify(c) + "@convene.md",
    "DTSTAMP:" + stamp,
    "DTSTART;VALUE=DATE:" + icsDate(c.startDate),
    "DTEND;VALUE=DATE:" + icsDateExclusiveEnd(c.endDate),
    "SUMMARY:" + icsEscape(c.name),
    "LOCATION:" + icsEscape(c.city + ", " + c.country),
    "DESCRIPTION:" + icsEscape(desc),
    "URL:" + icsEscape(c.url),
    "END:VEVENT",
    "END:VCALENDAR"
  ];
  return lines.map(icsFold).join("\r\n") + "\r\n";
}

function downloadIcs(c) {
  const blob = new Blob([buildIcs(c)], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = slugify(c) + ".ics";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
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
      <div class="popup-actions">
        <a class="website" href="${escapeHtml(c.url)}" target="_blank" rel="noopener noreferrer">Visit site →</a>
        <button type="button" class="cal-btn" data-ics="${c._id}">📅 Add to calendar</button>
      </div>
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

// Latitude/longitude band that contains the conferences — the map fits this
// on load so it fills the viewport width at any screen size (no side margins).
const INITIAL_BOUNDS = [[-48, -168], [64, 170]];

const map = L.map("map", {
  minZoom: 2,
  maxZoom: 10,
  zoomControl: true,
  fadeAnimation: false,
  zoomSnap: 0,
  maxBounds: [[-85, -180], [85, 180]],
  maxBoundsViscosity: 1.0
});
map.fitBounds(INITIAL_BOUNDS, { animate: false });
window.map = map;

let fitTimer;
window.addEventListener("resize", () => {
  clearTimeout(fitTimer);
  fitTimer = setTimeout(() => map.fitBounds(INITIAL_BOUNDS, { animate: false }), 200);
});

L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
  attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · © <a href="https://carto.com/attributions">CARTO</a>',
  subdomains: "abcd",
  maxZoom: 19,
  noWrap: true
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
}

function listDateChip(c) {
  const s = new Date(c.startDate + "T00:00:00");
  const e = new Date(c.endDate + "T00:00:00");
  let d;
  if (s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear()) {
    d = s.getDate() === e.getDate() ? `${s.getDate()}` : `${s.getDate()}–${e.getDate()}`;
  } else {
    d = `${s.getDate()} – ${MONTHS[e.getMonth()]} ${e.getDate()}`;
  }
  return { m: MONTHS[s.getMonth()], d };
}

function listRowHtml(c) {
  const color = SPECIALTY_COLOR[c.specialty] || "#888";
  const chip = listDateChip(c);
  return `<a class="list-row" href="${escapeHtml(c.url)}" target="_blank" rel="noopener noreferrer">
    <div class="list-date"><div class="m">${chip.m}</div><div class="d">${chip.d}</div></div>
    <div class="list-main">
      <div class="list-name">${escapeHtml(c.name)}</div>
      <div class="list-loc">${escapeHtml(c.city)}, ${escapeHtml(c.country)} · ${escapeHtml(c.organizer)}</div>
    </div>
    <span class="list-badge" style="background:${color}22;color:${color}">${escapeHtml(c.specialty)}</span>
    <span class="list-ics" data-ics="${c._id}" role="button" tabindex="0" aria-label="Add to calendar" title="Add to calendar">📅</span>
    <span class="list-link" aria-hidden="true">↗</span>
  </a>`;
}

function renderList(filtered) {
  const el = document.getElementById("list-body");
  if (!filtered.length) {
    el.innerHTML = `<div class="list-inner"><div class="list-empty">No conferences match these filters.</div></div>`;
    return;
  }
  const sorted = filtered.slice().sort((a, b) => a.startDate.localeCompare(b.startDate));
  let html = `<div class="list-inner">`;
  let currentKey = "";
  sorted.forEach(c => {
    const s = new Date(c.startDate + "T00:00:00");
    const key = `${s.getFullYear()}-${s.getMonth()}`;
    if (key !== currentKey) {
      currentKey = key;
      html += `<div class="month-head">${MONTHS_FULL[s.getMonth()]} ${s.getFullYear()}</div>`;
    }
    html += listRowHtml(c);
  });
  html += `</div>`;
  el.innerHTML = html;
}

let currentView = "map";

function setView(v) {
  currentView = v;
  const mapEl = document.getElementById("map");
  const listEl = document.getElementById("list");
  const mapBtn = document.getElementById("view-map");
  const listBtn = document.getElementById("view-list");
  const showMap = v === "map";
  mapEl.hidden = !showMap;
  listEl.hidden = showMap;
  mapBtn.classList.toggle("active", showMap);
  listBtn.classList.toggle("active", !showMap);
  mapBtn.setAttribute("aria-selected", String(showMap));
  listBtn.setAttribute("aria-selected", String(!showMap));
  if (showMap) map.invalidateSize();
}

function populateFilters() {
  const specialtySel = document.getElementById("specialty");
  const yearSel = document.getElementById("year");
  const specialties = Array.from(new Set(CONFERENCES.map(c => c.specialty))).sort();
  const years = Array.from(new Set(CONFERENCES.map(c => c.year))).sort();
  specialtySel.innerHTML = `<option value="all">All specialties</option>` + specialties.map(s => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join("");
  yearSel.innerHTML = `<option value="all">All years</option>` + years.map(y => `<option value="${y}">${y}</option>`).join("");

  const submitSel = document.getElementById("submit-specialty");
  if (submitSel) {
    submitSel.innerHTML = `<option value="" disabled selected>Select…</option>` +
      specialties.map(s => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join("") +
      `<option value="Other / not sure">Other / not sure</option>`;
  }
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
  renderList(filtered);
  document.getElementById("count").innerHTML = `Showing <strong>${filtered.length}</strong> of ${CONFERENCES.length}`;
}

const legend = L.control({ position: "bottomright" });
legend.onAdd = function() {
  const div = L.DomUtil.create("div", "legend");
  const specialties = Array.from(new Set(CONFERENCES.map(c => c.specialty))).sort();
  const rows = specialties.map(s => `<div class="row"><span class="dot" style="background:${SPECIALTY_COLOR[s] || "#888"}"></span>${escapeHtml(s)}</div>`).join("");
  div.innerHTML =
    `<button class="legend-toggle" type="button">Legend <span class="legend-chevron" aria-hidden="true">▾</span></button>` +
    `<div class="legend-body">${rows}</div>`;
  if (window.innerWidth <= 700) div.classList.add("collapsed");
  const toggle = div.querySelector(".legend-toggle");
  toggle.setAttribute("aria-expanded", String(!div.classList.contains("collapsed")));
  toggle.addEventListener("click", () => {
    const collapsed = div.classList.toggle("collapsed");
    toggle.setAttribute("aria-expanded", String(!collapsed));
  });
  L.DomEvent.disableClickPropagation(div);
  return div;
};
legend.addTo(map);

CONFERENCES.forEach((c, i) => { c._id = i; });

document.addEventListener("click", (e) => {
  const t = e.target.closest("[data-ics]");
  if (!t) return;
  e.preventDefault();
  e.stopPropagation();
  const c = CONFERENCES[parseInt(t.getAttribute("data-ics"), 10)];
  if (c) downloadIcs(c);
});

populateFilters();
document.getElementById("specialty").addEventListener("change", applyFilters);
document.getElementById("year").addEventListener("change", applyFilters);
document.getElementById("hidePast").addEventListener("change", applyFilters);
document.getElementById("view-map").addEventListener("click", () => setView("map"));
document.getElementById("view-list").addEventListener("click", () => setView("list"));

document.getElementById("list-signup-form").addEventListener("submit", () => {
  document.getElementById("list-signup-form").hidden = true;
  document.getElementById("list-signup-success").hidden = false;
});

const submitForm = document.getElementById("submit-form");
const submitToggle = document.getElementById("submit-toggle");
function expandSubmit(expand) {
  submitToggle.setAttribute("aria-expanded", String(expand));
  submitForm.hidden = !expand;
}
submitToggle.addEventListener("click", () => {
  expandSubmit(submitToggle.getAttribute("aria-expanded") !== "true");
});
document.getElementById("submit-open").addEventListener("click", () => {
  setView("list");
  expandSubmit(true);
  requestAnimationFrame(() => {
    document.getElementById("list-submit").scrollIntoView({ behavior: "smooth", block: "start" });
    const nameField = submitForm.querySelector('input[name="name"]');
    if (nameField) nameField.focus();
  });
});

submitForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.target;
  const errEl = document.getElementById("submit-error");
  errEl.hidden = true;
  try {
    const res = await fetch(form.action, {
      method: "POST",
      body: new FormData(form),
      headers: { Accept: "application/json" }
    });
    if (res.ok) {
      form.hidden = true;
      document.getElementById("submit-success").hidden = false;
    } else {
      errEl.hidden = false;
    }
  } catch (_) {
    errEl.hidden = false;
  }
});

applyFilters();
