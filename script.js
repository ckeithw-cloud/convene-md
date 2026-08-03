// Specialty groups — pin color is assigned by GROUP so the legend stays readable
// while the filter stays granular. Adding a specialty = add it to the right group.
const SPECIALTY_GROUPS = [
  {
    name: "Surgical",
    color: "#e74c3c",
    cls: "g-surg",
    specialties: [
      "General Surgery", "Cardiothoracic Surgery", "Neurosurgery", "Orthopedic Surgery",
      "Plastic Surgery", "Bariatric Surgery", "Vascular Surgery", "Urology",
      "Colorectal Surgery", "Trauma Surgery", "Surgical Oncology", "Pediatric Surgery",
      "HPB / Transplant Surgery", "Endocrine / ENT Surgery"
    ]
  },
  {
    name: "Medicine & subspecialties",
    color: "#3498db",
    cls: "g-med",
    specialties: [
      "Internal Medicine", "Cardiology", "Gastroenterology", "Pulmonology", "Nephrology",
      "Endocrinology", "Rheumatology", "Infectious Disease", "Hematology", "Allergy & Immunology"
    ]
  },
  {
    name: "Oncology",
    color: "#9b59b6",
    cls: "g-onc",
    specialties: ["Medical Oncology", "Radiation Oncology", "Palliative & Supportive Care"]
  },
  {
    name: "Neuro & psych",
    color: "#16a085",
    cls: "g-neuro",
    specialties: ["Neurology", "Psychiatry", "Physical Medicine & Rehabilitation", "Pain Medicine"]
  },
  {
    name: "Acute & hospital-based",
    color: "#e67e22",
    cls: "g-acute",
    specialties: [
      "Emergency Medicine", "Anesthesiology", "Critical Care", "Hospital Medicine", "Radiology"
    ]
  },
  {
    name: "Primary care & family",
    color: "#f39c12",
    cls: "g-prim",
    specialties: ["Family Medicine", "Pediatrics", "Obstetrics & Gynecology", "Geriatrics"]
  },
  {
    name: "Lifestyle & sports",
    color: "#00bcd4",
    cls: "g-life",
    specialties: ["Sports & Wilderness Medicine", "Sports Medicine", "Lifestyle & Preventive Medicine"]
  },
  {
    name: "Diagnostic & other",
    color: "#7f8c8d",
    cls: "g-diag",
    specialties: ["Pathology", "Dermatology", "Ophthalmology"]
  }
];

const SPECIALTY_GROUP = {};   // specialty -> group object
const SPECIALTY_COLOR = {};   // specialty -> group color
const SPECIALTY_CLASS = {};   // specialty -> group css class
SPECIALTY_GROUPS.forEach(g => {
  g.specialties.forEach(s => {
    SPECIALTY_GROUP[s] = g;
    SPECIALTY_COLOR[s] = g.color;
    SPECIALTY_CLASS[s] = g.cls;
  });
});
const ALL_SPECIALTIES = SPECIALTY_GROUPS.flatMap(g => g.specialties);

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

const markerLayer = L.markerClusterGroup({
  maxClusterRadius: 34,
  showCoverageOnHover: false,
  spiderfyOnMaxZoom: true,
  spiderfyDistanceMultiplier: 1.4,
  iconCreateFunction: (cluster) => L.divIcon({
    className: "",
    html: `<div class="cluster">${cluster.getChildCount()}</div>`,
    iconSize: [42, 42],
    iconAnchor: [21, 21]
  })
}).addTo(map);

function render(filtered) {
  markerLayer.clearLayers();
  filtered.forEach(c => {
    markerLayer.addLayer(makeMarker(c));
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

// ---- specialty selection (persisted to localStorage) ----
const STORE_KEY = "convene.selectedSpecialties";
let selected = new Set();

function specialtiesInData() {
  return new Set(CONFERENCES.map(c => c.specialty));
}

function loadSelection() {
  const present = specialtiesInData();
  try {
    const saved = JSON.parse(localStorage.getItem(STORE_KEY) || "null");
    if (Array.isArray(saved) && saved.length) {
      const valid = saved.filter(s => present.has(s));
      if (valid.length) { selected = new Set(valid); return; }
    }
  } catch (_) { /* ignore malformed storage */ }
  selected = new Set(present); // first visit: everything on
}

function saveSelection() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify([...selected])); } catch (_) {}
}

function buildSpecialtyPanel() {
  const panel = document.getElementById("spec-panel");
  const present = specialtiesInData();
  const counts = {};
  CONFERENCES.forEach(c => { counts[c.specialty] = (counts[c.specialty] || 0) + 1; });

  panel.innerHTML = SPECIALTY_GROUPS.map(g => {
    const items = g.specialties.filter(s => present.has(s));
    if (!items.length) return "";
    return `<div class="spec-group" data-group="${escapeHtml(g.name)}">
      <label class="spec-grouphead">
        <input type="checkbox" class="grp-box" data-group="${escapeHtml(g.name)}" />
        <span class="grp-dot" style="background:${g.color}"></span>
        <span class="grp-name">${escapeHtml(g.name)}</span>
      </label>
      <div class="spec-items">
        ${items.map(s => `<label class="spec-item">
          <input type="checkbox" class="spec-box" value="${escapeHtml(s)}" />
          <span>${escapeHtml(s)}</span><span class="spec-count">${counts[s]}</span>
        </label>`).join("")}
      </div>
    </div>`;
  }).join("");

  panel.addEventListener("change", (e) => {
    const t = e.target;
    if (t.classList.contains("spec-box")) {
      if (t.checked) selected.add(t.value); else selected.delete(t.value);
    } else if (t.classList.contains("grp-box")) {
      const g = SPECIALTY_GROUPS.find(x => x.name === t.dataset.group);
      g.specialties.filter(s => present.has(s)).forEach(s => {
        if (t.checked) selected.add(s); else selected.delete(s);
      });
    } else return;
    saveSelection();
    syncPanelBoxes();
    applyFilters();
  });
}

function syncPanelBoxes() {
  const present = specialtiesInData();
  document.querySelectorAll(".spec-box").forEach(b => { b.checked = selected.has(b.value); });
  document.querySelectorAll(".grp-box").forEach(b => {
    const g = SPECIALTY_GROUPS.find(x => x.name === b.dataset.group);
    const items = g.specialties.filter(s => present.has(s));
    const on = items.filter(s => selected.has(s)).length;
    b.checked = on === items.length && items.length > 0;
    b.indeterminate = on > 0 && on < items.length;
  });
  const total = present.size;
  const label = document.getElementById("spec-summary");
  if (label) {
    label.textContent = selected.size === total
      ? "All specialties"
      : selected.size === 0 ? "None selected"
      : selected.size === 1 ? [...selected][0]
      : `${selected.size} specialties`;
  }
}

function populateFilters() {
  const yearSel = document.getElementById("year");
  const specialties = Array.from(specialtiesInData()).sort();
  const years = Array.from(new Set(CONFERENCES.map(c => c.year))).sort();
  yearSel.innerHTML = `<option value="all">All years</option>` + years.map(y => `<option value="${y}">${y}</option>`).join("");

  const submitSel = document.getElementById("submit-specialty");
  if (submitSel) {
    submitSel.innerHTML = `<option value="" disabled selected>Select…</option>` +
      specialties.map(s => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join("") +
      `<option value="Other / not sure">Other / not sure</option>`;
  }

  loadSelection();
  buildSpecialtyPanel();
  syncPanelBoxes();
}

function applyFilters() {
  const yr = document.getElementById("year").value;
  const hidePast = document.getElementById("hidePast").checked;
  const todayIso = new Date().toISOString().slice(0, 10);
  const filtered = CONFERENCES.filter(c =>
    selected.has(c.specialty) &&
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
  const present = new Set(CONFERENCES.map(c => c.specialty));
  const rows = SPECIALTY_GROUPS
    .filter(g => g.specialties.some(s => present.has(s)))
    .map(g => `<div class="row"><span class="dot" style="background:${g.color}"></span>${escapeHtml(g.name)}</div>`)
    .join("");
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

const specDrop = document.getElementById("spec-drop");
const specBtn = document.getElementById("spec-btn");
specBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  const open = specDrop.classList.toggle("open");
  specBtn.setAttribute("aria-expanded", String(open));
});
document.addEventListener("click", (e) => {
  if (!specDrop.contains(e.target)) {
    specDrop.classList.remove("open");
    specBtn.setAttribute("aria-expanded", "false");
  }
});
document.getElementById("spec-all").addEventListener("click", () => {
  selected = new Set(specialtiesInData());
  saveSelection(); syncPanelBoxes(); applyFilters();
});
document.getElementById("spec-none").addEventListener("click", () => {
  selected = new Set();
  saveSelection(); syncPanelBoxes(); applyFilters();
});

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
