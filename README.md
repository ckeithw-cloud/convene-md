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

## Weekly routine — run on request, not on a timer

**The weekly launchd jobs are disabled as of 20 Oct 2026.** `com.medconf.traffic`
(Mondays 08:20) and `com.medconf.update` (Mondays 14:07) were booted out and their
plists parked in `~/Library/LaunchAgents/disabled/`. Re-enable with
`launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/<label>.plist` after moving
the plist back.

They were unreliable in exactly the way an unattended job on a laptop is: three runs in
four weeks died to `getaddrinfo ENOTFOUND` because the Mac was asleep or off-network at
the scheduled minute, and a failure looked identical to a quiet week. The scan's
discovery half had also been failing for weeks on `Not logged in` from the headless
Claude CLI. Running on request fixes both at once — the machine is demonstrably awake,
and the session doing the work is already authenticated, so no separate CLI login is
needed.

It also restores the approval gate: `traffic-report.sh` and `subscriber-report.sh` both
end in `git push`, which published whatever happened to be on `main` without anyone
reading it first. Nothing pushes unprompted now.

Ask for "the weekly report and scan". That means:

```
node scripts/traffic-report.js     # traffic + dataset movement + deploy state
node scripts/diff-sources.js       # CloudCME + mer.org diff -> marketing/source-diff/<date>.md
```

then triage the diff's candidates by hand (see `scripts/update-prompt.md` for the rules,
`scripts/add-conferences.js` to append, and `marketing/source-diff-ignore.json` to record
declines so they stop resurfacing), and finally `git push` once the result has been read.

`com.medconf.subscribers` (monthly, 1st at 08:40) is still loaded.

Logs land in `logs/` (gitignored).

## Deployment

Hosted on Cloudflare Pages, connected to this repo. Every push to `main` auto-deploys.

## Running locally

```bash
node server.js
# open http://localhost:5173
```

That's it — no install, no build.
