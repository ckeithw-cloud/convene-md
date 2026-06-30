# convene.md

A scrollable world map of medical conferences — where the medical world meets.

Live at [convene.md](https://convene.md) (once deployed).

## What it is

An interactive Leaflet map with one pin per conference. Filter by specialty and year, hide past events, click a pin for dates, location, organizer, and a link to the official conference site.

Coverage is currently surgical conferences across 14 subspecialties (general, cardiothoracic, neuro, orthopedic, plastic, bariatric, ENT/endocrine, vascular, urology, colorectal, trauma, surgical oncology, pediatric, HPB/transplant), with more specialties planned.

## How it works

Fully static — no backend, no build step. Three real files do all the work:

| File | What it does |
|---|---|
| [`index.html`](index.html) | Page shell, loads Leaflet, header controls |
| [`conferences.js`](conferences.js) | All conference data as a JS array. **This is the file you edit to add or update conferences.** |
| [`script.js`](script.js) | Map setup, pin rendering, filtering, popups, color/legend logic |
| [`styles.css`](styles.css) | Styling |
| [`server.js`](server.js) | Tiny Node static server for local dev (`node server.js` → http://localhost:5173) |

## Adding a conference

Open [`conferences.js`](conferences.js) and append an object to the array. All fields are required:

```js
{
  name: "...",
  specialty: "General Surgery",   // must be one of the 14 valid values
  year: 2027,
  startDate: "2027-04-15",
  endDate: "2027-04-18",
  city: "...",
  country: "...",
  lat: 0.0,
  lng: 0.0,
  url: "https://...",
  organizer: "...",
  description: "One sentence."
}
```

To add a **new specialty**, three edits:
1. Add the label to `SPECIALTY_CLASS` and `SPECIALTY_COLOR` in [`script.js`](script.js)
2. Add a `.conf-pin.<class>` rule in [`styles.css`](styles.css)
3. Add the corresponding entry/entries to [`conferences.js`](conferences.js)

The filter dropdown and legend populate automatically from the data.

## Auto-update routine

A weekly launchd job runs [`scripts/update-conferences.sh`](scripts/update-conferences.sh) every Monday at 14:07 local time. It invokes Claude Code headlessly with [`scripts/update-prompt.md`](scripts/update-prompt.md), which scans the web for newly announced surgical conferences, dedupes against the existing list, and appends new entries to `conferences.js`.

Logs land in `logs/update.log` (gitignored).

The launchd plist lives at `~/Library/LaunchAgents/com.medconf.update.plist` on the maintainer's Mac (not in this repo, since it has absolute user paths).

## Deployment

Hosted on Cloudflare Pages, connected to this repo. Every push to `main` auto-deploys.

## Running locally

```bash
node server.js
# open http://localhost:5173
```

That's it — no install, no build.
