You are running a weekly auto-update for the convene.md website at `/Users/ckeithw/Documents/Claude projects/medconf/`.

**Goal:** Find newly announced surgical conferences and append them to `conferences.js`. Do not modify existing entries.

**File schema** — `conferences.js` exports `const CONFERENCES = [ ... ]`. Each entry has these fields (all required):

```js
{
  name: "...",
  specialty: "General Surgery" | "Cardiothoracic Surgery" | "Neurosurgery" | "Orthopedic Surgery" | "Plastic Surgery" | "Bariatric Surgery" | "Endocrine / ENT Surgery" | "Vascular Surgery" | "Urology" | "Colorectal Surgery" | "Trauma Surgery" | "Surgical Oncology" | "Pediatric Surgery" | "HPB / Transplant Surgery",
  year: 2026 | 2027 | 2028,
  startDate: "YYYY-MM-DD",
  endDate: "YYYY-MM-DD",
  city: "...",
  country: "...",
  lat: 0.0,
  lng: 0.0,
  url: "https://...",
  organizer: "...",
  description: "One sentence."
}
```

If a candidate doesn't fit any of the 14 specialty values above, skip it — don't invent a new specialty.

**Steps:**

1. Read `/Users/ckeithw/Documents/Claude projects/medconf/conferences.js` to load existing entries.
2. Use WebSearch to look for newly announced surgical conferences in 2026, 2027, and 2028 across the 14 specialties. Useful query patterns:
   - `"{specialty} congress 2027 location dates"` for each specialty
   - `"{society acronym} annual meeting 2027"` — e.g. ACS, AATS, EACTS, AAOS, CNS, AANS, IFSO, EAES, SICOT, AUA, EAU, ASCRS, ESCP, AAST, SSO, APSA, IHPBA, JSS, ASI, RACS, WACS, COSECSA
   - Regional sweeps: `"surgical conference 2027 Asia"` / `"... Africa"` / `"... Latin America"` to catch coverage gaps
3. For each candidate, **dedupe**:
   - Skip if existing list already has an entry with the same `name` (case-insensitive) AND same `year`.
   - Skip if same `city` + `startDate` + `specialty` combo already exists.
4. For new entries, supply `lat`/`lng` from your knowledge for the city. Confirm dates and URL from the official society site where possible.
5. Append ONLY new entries to the array in `conferences.js`. **Do not reformat or modify existing entries.** Insert before the closing `];`.
6. After saving, print a short summary: count of new entries added and their names. If zero, say so.

**Aggregator workaround — IMPORTANT:**

Many parent-organization "meetings" pages (e.g. ACS chapter meetings, FELAC, IFSO regional lists) are aggregators that load their event listings via JavaScript (Trumba SPUDs, Cvent embeds, custom widgets) or are gated behind a member login. WebFetch and curl will both return an empty shell with no event data.

**Detection signals** that you've hit one of these:
- Response is large (>30KB) but `grep -i "month name 202[6-9]"` finds nothing
- Page contains references to `trumba.com/scripts/spuds.js`, `cvent.com/embed`, or similar third-party calendar widgets
- Multiple "Sign in" / "Member login" / Okta redirect prompts
- The result you got back has no concrete dates, only menu/nav text

**Workaround when this happens:**
1. Don't waste more requests on the aggregator page.
2. Identify the **member/chapter/sub-organization sites** the aggregator is summarizing. For ACS chapters: state-level chapter sites like `nysurgeon.org`, `southtexasacs.org`, `floridafacs.org`, `moacs.org`, `meeting.mcacs.org`, `socalsurgeons.org`, `virginiaacs.org`, `scfacs.org`, `orchapteracs.wildapricot.org`. For other federations: regional chapter URLs in their public chapter directory.
3. WebFetch each chapter/sub-org site directly. These typically *do* publish meeting details publicly.
4. WebSearch `"<chapter name>" annual meeting 2027 dates location` as a fallback.

**Quality rules:**

- Be conservative — only add conferences you're confident about (clear date, clear location, real organizing society with an official site).
- Skip vague "global conference on surgery" listings from generic aggregator sites (allconferencealert, conferenceindex, magnusgroup, etc.) unless they have a confirmed venue, dates, and a known organizer.
- Skip past conferences (those whose `endDate` is before today). The site filters them out anyway, but they bloat the dataset.
- If a search summary mentions specific dates but you can't find a primary source confirming them, treat it as a hallucination and skip. Better to miss an event than to add a wrong one.

**Do NOT:**

- Touch any file outside `conferences.js`.
- Start the dev server.
- Commit anything to git.
- Modify or remove existing entries.
- Invent a new specialty value not in the schema.

When done, exit. Output a brief summary only.
