You are running a weekly auto-update for the convene.md website at `/Users/ckeithw/Documents/Claude projects/medconf/`.

**Goal:** Find newly announced medical conferences (ALL specialties, not just surgery) and append them to `conferences.js`. Do not modify existing entries.

**File schema** — `conferences.js` exports `const CONFERENCES = [ ... ]`. Each entry has these fields (all required):

```js
{
  name: "...",
  specialty: "<one of the 46 values below>",
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

**Valid `specialty` values** (46, grouped — the group determines pin color, defined in `script.js` as `SPECIALTY_GROUPS`):

- **Surgical:** General Surgery, Cardiothoracic Surgery, Neurosurgery, Orthopedic Surgery, Plastic Surgery, Bariatric Surgery, Vascular Surgery, Urology, Colorectal Surgery, Trauma Surgery, Surgical Oncology, Pediatric Surgery, HPB / Transplant Surgery, Endocrine / ENT Surgery
- **Medicine & subspecialties:** Internal Medicine, Cardiology, Gastroenterology, Pulmonology, Nephrology, Endocrinology, Rheumatology, Infectious Disease, Hematology, Allergy & Immunology
- **Oncology:** Medical Oncology, Radiation Oncology, Palliative & Supportive Care
- **Neuro & psych:** Neurology, Psychiatry, Physical Medicine & Rehabilitation, Pain Medicine
- **Acute & hospital-based:** Emergency Medicine, Anesthesiology, Critical Care, Hospital Medicine, Radiology
- **Primary care & family:** Family Medicine, Pediatrics, Obstetrics & Gynecology, Geriatrics
- **Lifestyle & sports:** Sports & Wilderness Medicine, Sports Medicine, Lifestyle & Preventive Medicine
- **Diagnostic & other:** Pathology, Dermatology, Ophthalmology

If a candidate doesn't fit any of the 46 specialty values above, skip it — don't invent a new specialty. (Adding a genuinely new specialty requires also editing `SPECIALTY_GROUPS` in `script.js`, which is a human decision.)

**Steps:**

1. Read `/Users/ckeithw/Documents/Claude projects/medconf/conferences.js` to load existing entries.
2. Use WebSearch to look for newly announced medical conferences in 2026, 2027, and 2028 across the 46 specialties. Rotate focus each week so coverage stays even — don't only search surgery. Useful query patterns:
   - `"{specialty} congress 2027 location dates"` for each specialty
   - `"{society acronym} annual meeting 2027"` — e.g.
     - Surgical: ACS, AATS, EACTS, AAOS, CNS, AANS, IFSO, EAES, SICOT, AUA, EAU, ASCRS, ESCP, AAST, SSO, APSA, IHPBA, JSS, ASI, RACS, WACS, COSECSA
     - Medicine: ACC, AHA, ESC, ACP, DDW, ACG, UEG, CHEST, ATS, ERS, ASN, ERA, ENDO, ADA, EASD, ACR, EULAR, IDWeek, ESCMID, ASH, EHA, AAAAI, EAACI
     - Oncology: ASCO, ESMO, ASTRO, ESTRO, AACR, SITC, AAHPM, EAPC
     - Neuro/psych: AAN, EAN, WCN, APA, EPA, WPA, AAPM&R, IASP
     - Acute/hospital: ACEP, EUSEM, ICEM, ASA, ESAIC, WFSA, SCCM, ESICM, SHM, RSNA, ECR, ISR
     - Primary care: AAFP, WONCA, AAP, IPA, ESPGHAN, ACOG, FIGO, ESHRE, AGS
     - Diagnostic/other: USCAP, CAP, ECP, AAD, EADV, AAO, ESCRS, ICO
   - Regional sweeps: `"{specialty} conference 2027 Asia"` / `"... Africa"` / `"... Latin America"` / `"... Middle East"` to catch coverage gaps
3. For each candidate, **dedupe**:
   - Skip if existing list already has an entry with the same `name` (case-insensitive) AND same `year`.
   - Skip if same `city` + `startDate` + `specialty` combo already exists. This is the key
     `scripts/validate.js` enforces — a collision there fails the build, so check it yourself first.
   - **Joint congresses count as ONE entry.** Societies frequently co-host (e.g. APSC 2027 was held
     jointly with JCS 2027 at the same venue on the same days). Two pins on one venue is a bug —
     add a single entry naming both societies in `organizer`.

3a. **Beware acronym collisions between unrelated societies.** Two different societies often share
   an acronym, and getting this wrong silently mislabels the specialty. Confirm which society owns
   the URL before trusting a search result. Known traps:
   - **ASCRS** = American Society of *Cataract and Refractive Surgery* (`annualmeeting.ascrs.org`,
     Ophthalmology) **and** American Society of *Colon and Rectal Surgeons* (`fascrs.org`,
     Colorectal Surgery). These are different meetings in different cities.
   - **ACR** = American College of Radiology **and** American College of Rheumatology.
   - **AAP** = American Academy of Pediatrics **and** American Academy of Pain Medicine.
   - **ASA** = American Society of Anesthesiologists **and** American Stroke Association.
   - **APSICON** = Association of Plastic Surgeons of India **and** Indian Association of Pediatric Surgeons.
   - **ISG** resolves to the Indian Society of *Geomatics*, not Gastroenterology — `isgindia.org` is the wrong body.
   When in doubt, open the URL and read whose branding is on it.

3b. **Some "official" calendars are themselves unreliable — always confirm on the event's own site.**
   The Chinese Medical Association publishes an annual conference plan PDF at `cma.org.cn`. It is a good
   *discovery* tool but its data goes stale: it listed the 23rd Neurosurgery Congress in Shenyang when the
   congress site says Dalian, and several dates in it had already been revised. Use such plans only to find
   candidates, then verify each on its own congress site (for China, the `*.sciconf.cn` and `medmeeting.org`
   microsites are the CMA's official congress-hosting platforms and count as primary).
4. For new entries, supply `lat`/`lng` from your knowledge for the city. Confirm dates and URL from the official society site where possible.
5. Append ONLY new entries to the array in `conferences.js`. **Do not reformat or modify existing entries.** Insert before the closing `];`.
6. Run `node scripts/validate.js`. It must exit 0. If it reports errors, fix your own additions
   until it passes — do not delete pre-existing entries to make it pass.
7. After saving, print a short summary: count of new entries added and their names. If zero, say so.

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

**Audience rule — physician CME only:**

The site is aimed at physicians. Add an activity only if it offers **AMA PRA Category 1 Credit™**
(or the national equivalent for non-US conferences — e.g. EACCME credits in Europe, RACGP/ACRRM
in Australia, national college accreditation elsewhere).

- **Skip** activities accredited only for nurses, pharmacists or other non-physician professions
  (ACPE, ANCC/state nursing contact hours, CPEU) with no physician credit.
- **Skip** meetings explicitly aimed at nurses or advanced practice providers — e.g. anything titled
  "… for Nurses", "Nursing Congress", "Advanced Practice Provider Symposium".
- **Keep** physician conferences that merely welcome allied professionals as well, and keep physician
  conferences that happen to be *held at* a school of nursing or run alongside a separate nursing
  congress — the venue or a co-located event is not the audience.
- If the credit type is not stated anywhere on the official site, skip it.

**Quality rules:**

- Be conservative — only add conferences you're confident about (clear date, clear location, real organizing society with an official site).
- Skip vague "global conference on surgery"/"international conference on X" listings from predatory
  conference mills (magnusgroup, conferenceseries, allconferencealert, conferenceindex, etc.) — no
  exceptions, even if they list a venue and dates. Tell-tale sign: several differently-named events
  in different cities all pointing at one generic URL. `scripts/validate.js` hard-fails on these hosts.
- Skip past conferences (those whose `endDate` is before today). The site filters them out anyway, but they bloat the dataset.
- If a search summary mentions specific dates but you can't find a primary source confirming them, treat it as a hallucination and skip. Better to miss an event than to add a wrong one.

**Do NOT:**

- Touch any file outside `conferences.js`.
- Start the dev server.
- Commit anything to git.
- Modify or remove existing entries.
- Invent a new specialty value not in the schema.

When done, exit. Output a brief summary only.
