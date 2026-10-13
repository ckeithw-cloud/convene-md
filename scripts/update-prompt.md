You are running a weekly auto-update for the convene.md website at `/Users/ckeithw/projects/convene-md/`.

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

1. Read `/Users/ckeithw/projects/convene-md/conferences.js` to load existing entries.
2. **FIRST read `marketing/coverage-plan.md` for the priority order (big conferences,
   then smaller societies, then paid destination courses), and the newest
   `marketing/source-diff/<date>.md` — it already lists new/changed/vanished courses
   for the machine-readable sources, so never hand-search CloudCME or mer.org.
   Then read `marketing/scan-log.md`,** then use WebSearch to look for newly announced
   medical conferences across the 46 specialties. That file is the rotation's memory:
   it records which specialties were swept when, and — importantly — which meetings came
   back "not yet announced" and must NOT be re-searched before their re-check date.
   Pick the specialties with the fewest 2027+ entries that have not been swept in ~6 weeks;
   don't only search surgery, and don't only search the thinnest, or the large specialties
   never get revisited. **Update `marketing/scan-log.md` at the end of every run.**
   Useful query patterns:
   - `"{specialty} congress 2027 location dates"` for each specialty
   - `"{society acronym} annual meeting 2027"`, and better still
     `"{society} future meetings"` — one fetch often yields three to six years.

   **This society list is the job's single biggest point of failure.** Discovery here is
   society-name-driven, so a body that is not named below is invisible no matter how often the
   specialty is re-swept. The October 2026 pass took the dataset from 1,286 to 1,886 entries
   almost entirely by naming societies this list had omitted — and the omissions were not
   obscure: AAO-HNSF, NASS, EAU, ESCRS, SIU, AABB, ASRM, APA, ACR, ARRS, SNMMI and CIRSE were
   all absent. **The volume sits in subspecialty societies and in repeating course programmes,
   not in national flagship congresses.** Whenever you meet a society that is not listed here,
   add it to this file as part of the run.

   **Flagship congresses** — one meeting a year each, cheap to check, low yield per fetch:
     - Surgical: ACS, AATS, STS, EACTS, ESTS, AAOS, CNS, AANS, IFSO, EAES, SICOT, EFORT, AUA,
       EAU, ASCRS, ESCP, ACPGBI, AAST, SSO, ESSO, APSA, BAPS, EUPSA, IHPBA, E-AHPBA, A-PHPBA,
       JSS, ASI, RACS, ASGBI, WACS, COSECSA, SVS, ESVS, SCTS, ASPS, ISAPS, EURAPS, BAPRAS
     - Medicine: ACC, AHA, ESC, ACP, SGIM, EFIM/ECIM, DDW, ACG, BSG, UEG, APASL, AASLD, EASL,
       CHEST, ATS, ERS, BTS, ASN, ERA, UK Kidney Week, SEN, SIN, SFNDT, DGfN, ENDO, AACE, ADA,
       EASD, Diabetes UK, ESE, ESPE, ACR(rheum), EULAR, BSR, APLAR, PANLAR, SER, SIR(rheum),
       DGRh, IDWeek, ESCMID, ICID, ASTMH, ISTM, EACS, BHIVA, BSAC, ASH, EHA, EBMT, AABB, ISBT,
       BSH, AAAAI, ACAAI, EAACI, WAO, ESID, BSACI, ASCIA, SEAIC
     - Oncology: ASCO, ESMO, ASTRO, ESTRO, CARO, DEGRO, AIRO, SFRO, JASTRO, AROI, ABS, AACR,
       SITC, IASLC/WCLC, SABCS, IGCA, AAHPM, EAPC, APM, MASCC, APHN
     - Neuro/psych: AAN, EAN, WCN, WFNS, EANS, SBNS, DGNC, JNS, AES, ILAE, MDS, AHS, IHS, AANEM,
       ECTRIMS/ACTRIMS, AAIC, AD/PD, ANA, CNS(child neuro), APA(psych), EPA, WPA, RCPsych,
       ACLP, AAGP, SOBP, SIRS, AAPM&R, AAP(physiatry), ISPRM, ASIA, IASP, ASRA, AAPM(pain),
       NANS, EFIC, ASIPP
     - Acute/hospital: ACEP, AAEM, SAEM, RCEM, EUSEM, ICEM, NAEMSP, ASA, IARS, ESAIC, WFSA,
       SCA, SOAP, ESRA, RCoA, DGAI, SCCM, ESICM, ICS(UK), ISCCM, DIVI, SRLF, ELSO/EuroELSO,
       SHM, RSNA, ECR, ARRS, ACR(radiology), SNMMI, CIRSE, ASNR, SAR, SBI, SSR, STR, SPR(rad)
     - Primary care: AAFP, RCGP, WONCA, AAP(peds), PAS, RCPCH, EAPS, IPA, ESPGHAN, ACOG, FIGO,
       RCOG, SMFM, ASRM, ESHRE, ISUOG, AUGS, IUGA, Menopause Society, AGS, BGS, ANZSGM, GSA
     - Diagnostic/other: USCAP, CAP, ASCP, AMP, ECP, IAP, ASDP, AAD, EADV, SID, ASLMS, ACMS,
       SPD, AAO, ESCRS, EURETINA, ASRS, AGS(glaucoma), AAPOS, ASOPRS, ICO, RCOphth
     - ENT/endocrine surgery: AAO-HNSF, AHNS, Triological, ENT UK, CEORL-HNS, CSOHNS, ARS,
       ANS(neurotology), AOS, AAOA, ATA(thyroid), AAES, IAES, ESES, BAETS
     - Lifestyle & sports: ACLM, ACPM, ASPC, ACOEM, OMA, NLA, AMSSM, ACSM, PRiSM, ECSS, FIMS,
       WMS, UHMS, DAN, AsMA, EUBS, SPUMS

   **Repeating course programmes — the highest-yield fetches in the whole job.** Each of these
   publishes a rolling calendar of individually dated, individually accredited courses, often
   in a dozen countries. One page can be worth twenty entries, and they are re-populated
   continuously, so re-check them every few runs rather than once a year:
     - **CIRSE ESIR courses** — `cirse.org/events/esir-courses/`. Yielded 18 entries across
       nine countries in one fetch. Note the URL slugs are unreliable: one February 2027 course
       still carried a `january-28-29-2027` slug, so trust the page body, not the slug.
     - **ESRA workshops and cadaver courses** — `esraeurope.org/meetings/?meeting_type=esra-events`
     - **ISUOG approved courses** — `isuog.org/events`. Individual host institutions worldwide;
       many are the only entry we will ever get for their country.
     - **UHMS live courses** — `courses-uhms.org/live-courses/`; **DAN** diving-medicine CME at
       `dan.org/event/...`; **Scott Haldane Foundation** at `scotthaldane.nl/en/courses/upcoming-courses.html`.
       These are dive-medicine courses at dive resorts — unusually good fits for this site.
     - **USCAP interactive-microscopy courses** — `uscap.org/uscap-meetings-list/`
     - **ENT UK calendar** — `entuk.org/events/calendar/date/<YEAR>?view=year` (the year view is
       the useful one; the default list shows only weeks ahead)
     - **ACPGBI events** — `acpgbi.org.uk/events/`; **BSG events** — `bsg.org.uk/events`;
       **BSAC events** — `bsac.org.uk/events`; **BSH** — `b-s-h.org.uk/education/conference-and-events/events`
     - **SER agenda** — `ser.es/profesionales/agenda/eventos-ser/` (note: SER's listings often
       print the day and month with no year — confirm the year before trusting a date)
     - **DIVI Akademie** and **DGE** German course lists — `divi.de`, `endokrinologie.net`
     - **APASL single-topic conferences** — `apasl.info` lists five or six a year across Asia
     - **RCP London / RCP Edinburgh / RCPSG** regional "Update in Medicine" days —
       `rcp.ac.uk/events-and-education/events/`, `rcpe.ac.uk/events`, `rcpsg.ac.uk/education`
     - **Pri-Med** regional conferences — `pri-med.com/cme-conferences/<region>`
     - **TAFP** and other AAFP state chapters — `tafp.org/cme`; **STFM** — `stfm.org/conferences/generalinformation/future-dates/`

   **Societies that publish unusually far ahead** (one fetch covers five or more years, so these
   are efficient but need re-checking only rarely): AABB, SBI, ARRS, AUGS, ASES, OTA, CSRS, PES,
   AAP(peds), PAS, ACOEM/AOHC, AANEM, American Headache Society (Scottsdale symposium is booked
   through 2030), SOBP, ACLP, AAGP, ASRS, ASOPRS, DGPRAEC, CARO, SGO, ASBrS, IARS, SPUMS, SAR.

   - Prefer a society's **"future meetings"** page over its current-year page — one fetch
     often yields three years at once.
   - If a society publishes dates but no host city, check its **exhibitor / general-information
     micro-site** for that year; venues are frequently named there first (this is how
     ASTRO 2027's Chicago venue was found after the main page omitted it).
   - Regional sweeps: `"{specialty} conference 2027 Asia"` / `"... Africa"` / `"... Latin America"` / `"... Middle East"` to catch coverage gaps
3. For each candidate, **dedupe**:
   - Skip if existing list already has an entry with the same `name` (case-insensitive) AND same `year`.
   - A `city` + `startDate` match is **a prompt to look, not grounds to skip.** Unrelated
     societies meet in one city on one day routinely — a 2026 pass wrongly rejected seven good
     entries this way, including SGO's annual meeting in Phoenix because an MER primary-care
     course started there the same day. Treat it as a duplicate only when the **organiser also
     matches**, or the titles share distinctive words (ignore boilerplate: "annual", "meeting",
     "congress", "society", "international", "national", and nationality adjectives — those
     matched JATS against JAAM, two unrelated Japanese societies sharing a congress host).
     Require the same **year** too, or you will reject the 2028 edition of a meeting you hold
     for 2027.
   - `scripts/validate.js` only *errors* on a same-city-and-dates clash when the two records
     also look like one event (shared URL, or near-identical titles); otherwise it warns and the
     build still passes. So a warning is yours to adjudicate, not something to silence by
     deleting an entry.
   - **Two real sibling meetings sharing one announcement page will trip that error**, because a
     shared URL is the strongest same-event signal there is. If the page presents them as one
     joint meeting, enter **one** row spanning both and name each programme in the description
     (this is how ASNR/ASHNR 2027 is stored). If they are genuinely separate meetings, find a
     deep link for each; if you cannot, add the stronger one and log the other for follow-up.
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
   - **AAPM** = American Association of *Physicists* in Medicine (`aapm.org`), one character off
     **AAPM&R**, the American Academy of *Physical Medicine and Rehabilitation* (`aapmr.org`).
     Searching for the physiatrists returns the physicists' meeting first.
   - **ASRA** runs *two* separate annual meetings — a spring regional-anesthesia one and an
     autumn pain-medicine one. They are different events; do not merge or substitute them.
   - **AAP** has a *third* claimant: the Association of Academic Physiatrists (`physiatry.org`),
     whose "Physiatry '27" annual meeting is PM&R, alongside Pediatrics and Pain Medicine.
   - **ASCP** = American Society for Clinical *Pathology* (`ascp.org`) **and** American Society
     of Clinical *Psychopharmacology* (`ascpp.org`).
   - **SPR** = Society for Pediatric *Radiology* (`spr.org`) **and** Society for Pediatric
     *Research* (part of PAS). **SIU** = Société Internationale d'Urologie **and** Società
     Italiana di Urologia. **ESA** = Endocrine Society of Australia **and** the former European
     Society of Anaesthesiology (now ESAIC). **AGS** = American Geriatrics Society **and**
     American Glaucoma Society.
   - **Domains that resolve to an entirely unrelated organisation.** Each of these cost a wasted
     fetch or a near-miss; do not trust them:
     - `jcr.or.jp` is the Japanese College of **Radiology**, not the Japan College of Rheumatology.
     - `sbn.org.br` is the Sociedade Brasileira de **Nefrologia**, not neurosurgery.
     - `jsso.or.jp` serves a Japanese **inheritance-support** body, not the Japanese Society of
       Surgical Oncology.
     - `attd.org` is **African Table Tennis in Diaspora**. The diabetes-technology conference
       lives at `attd.kenes.com`, `attd2027.kenes.com` and `attdasia.kenes.com`.
     - `igs.ie` is the Irish **Georgian** Society (architectural heritage), not gerontology.
     - `cscs.ca` is a **motorsport** series, not the Canadian Society of Cardiac Surgeons.
     - `isgindia.org` is the Indian Society of **Geomatics**, not Gastroenterology.
     - `aapm.org` is the American Association of **Physicists** in Medicine, one character from
       `aapmr.org` (physiatrists).
   - **Lapsed or hijacked society domains — do not follow the redirect.** `sccs-sa.org` (Saudi
     Critical Care Society) now 301s to a **gambling** domain; `bsrm.org.uk` (British Society of
     Rehabilitation Medicine) redirects to an unrelated commercial site; `iagg.info` and
     `alatro.org` now serve commercial content or SEO spam; `pacificassociationofpediatricsurgeons.org`
     and `ossanz.com.au` are parked domain-for-sale pages. `marketing/scan-log.md` holds the full
     list of dead domains and of hosts that return 403/5xx to the fetcher but render in a browser —
     **read it before spending fetches on a society whose site failed on a previous run.**
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

3c. **Series providers publish dozens of near-identical courses — check before re-adding.**
   Commercial destination-CME companies run the same course title in many cities. The whole
   published catalogue of these is already in `conferences.js`; only add an edition that is
   genuinely absent, and always deep-link the individual course page, never a category page.
   - **Medical Education Resources (MER)** — `mer.org`, 170 conferences already loaded through
     Oct 2027. Month pages are server-rendered at
     `https://www.mer.org/conference-schedule/<base64 of MM-YYYY>/` (follow the redirect) and
     each course lives at `https://www.mer.org/conference//<base64 of its numeric id>`, so the
     catalogue can be re-scraped without a browser. Titles repeat heavily ("Internal Medicine
     for Primary Care: <topics>"), so dedupe on the URL, not the name.
   Name new editions `"<official course title> — <City> <Year>"`, matching the existing rows.

3d. **Academic CME providers — CloudCME is scrapeable; here is how.**
   About a dozen major academic centres run their catalogue on CloudCME. The listing is
   **server-rendered and curl-able**, but only at the right URL:

   - Use `https://<inst>.cloud-cme.com/course/listing?p=1000`. **The `?p=1000` is required** —
     it selects the Live Courses listing. Plain `/course/listing` renders an empty shell, and
     `/public/calendar` is a JS-only shell for every instance. That single wrong URL is why an
     earlier pass wrongly concluded these providers were unscrapeable.
   - Each row is `<div id='<EID>' class='12u activityListContainer'>` containing
     `span.activTitle`, `span.activTimeDate` (date then venue, separated by `<br/>`),
     `<em>Specialties</em> - ...` and `<strong>Credits:</strong> ... <em>AMA PRA Category 1 Credits</em> (N hours)`.
   - Pagination is 10/page via an ASP.NET postback: POST the same URL with the page's
     `__VIEWSTATE` / `__VIEWSTATEGENERATOR` / `__EVENTVALIDATION` plus
     `__EVENTTARGET=ResultsPageClick` and `__EVENTARGUMENT=ResultPage<N>`.
     Do **not** use the `#ddlResultsPerPage` "50 per page" control — it posts `ApplyFilters`
     and bounces to a login/create-account form.
   - Deep-link each course as `https://<inst>.cloud-cme.com/default.aspx?P=0&EID=<id>`
     (Johns Hopkins uses `/course/courseoverview?P=0&EID=<id>`).
   - Live hosts confirmed: `mssm`, `ucla`, `upenn`, `hopkinscme`, `washu`, `vumc`, `umich`,
     `stanford`, `ucsf`, `northwestern`, `cedars`.

   **Two traps in this data:**
   - The `LIVE` format tag is on online courses too. Filter on the **venue** instead — skip
     rows whose venue is `Online` / `Virtual` / `Internet Live Conference` / empty.
   - **Johns Hopkins omits the Credits block from the listing entirely.** There, `cat1` absent
     means "not stated on the listing", not "no Category 1" — fetch the course page and look
     for `designates this live activity for a maximum of N AMA PRA Category 1 Credits`.

   **Most of a CloudCME catalogue is not conference material.** Expect faculty-development
   workshops, remedial/behavioural programmes, degree and certificate courses, simulation
   sessions and grand rounds. Skip anything matching this shape — e.g. UCSF's `T4UCSF:` teaching
   series and Family Medicine Faculty Development Fellowship, Vanderbilt's "Program for
   Distressed Physician Behaviors", Stanford's MS and Improvement Science certificate courses.
   A useful floor: skip activities offering **fewer than 4 Category 1 credits** (that removes
   evening dinner meetings), and skip anything you cannot confidently map to one of the 46
   specialties — the listings often leave the description blank, and a guessed specialty
   silently breaks the filter and pin colour.

   **Other platforms seen at providers that are NOT on CloudCME:**
   - **Emory** — CME Tracker (`cmetracker.net/EMORY/Publisher?page=pubOpen#/featured`,
     JS-rendered; the `#course` "Live Activities" route is the useful one). Swept Aug 2026:
     its public catalogue is a repeating ECT mini-fellowship plus half-day local symposia —
     no destination conferences, and credit *types* are left blank on the listing.
   - **Baylor College of Medicine** — EthosCE (`cpd.education.bcm.edu/calendar/upcoming-events`).
     Swept Aug 2026: entirely grand rounds, noon conferences and case presentations.
   - **Baylor Scott & White** (a separate system) — `ce.bswhealth.com`, catalogue is JS-gated.
     Not yet swept; it does publish real meetings (e.g. the Matthew Davis Trauma Symposium,
     Temple TX, and the annual Internal Medicine Review).

**WATCHLIST — call these out, don't just add them:**

The site owner personally wants to attend the conferences below. If one appears with confirmed
dates during a run, add it as normal AND state it prominently at the very top of your run summary
(e.g. `*** WATCHLIST HIT: SMA Tavarua 2027, June 19-26, Fiji ***`) so it is not lost among the
routine additions.

- **Surfers Medical Association @ Tavarua, Fiji.** The June 2026 edition already ran. Check
  `https://surfersmedicalassociation.org/product-category/conferences/` each run — SMA publishes
  conferences as WooCommerce products. Their date metadata is unreliable (the 2026 listing still
  used a `june-2025` URL slug, and the product page disagreed with search results on the exact
  days), so confirm dates from the product page body itself.

**PENDING RE-CHECKS — real meetings held back only for a missing credit statement.**

These are genuine, in-person meetings from accredited providers that were deliberately NOT
added because their own page carries no AMA PRA Category 1 designation yet (only boilerplate
ACCME text). The rule is "if the credit type is not stated, skip it" — so re-check each on a
later run and add it once the statement appears. Do not add them on the strength of a prior
edition's accreditation.

- **Johns Hopkins, 44th Annual Medical and Surgical Gastroenterology: A Multidisciplinary
  Approach** — The Pines Lodge, Beaver Creek, CO, 7–10 Feb 2027.
  `hopkinscme.cloud-cme.com/course/courseoverview?P=0&EID=68380`
- **Johns Hopkins, 27th Gastroenterology and Hepatology: Viva la Vida** — Caribe Hilton,
  San Juan, PR, 16–19 Mar 2027. Same site, `EID=68379`.
- **Johns Hopkins, 41st Annual Pediatrics for Practitioner Update 2026** — Baltimore,
  15–16 Oct 2026. Same site, `EID=68094`.
- **Cleveland Clinic** — the `radonc`, `marfan` and `neuromuscular` courses, for the same reason.

Also worth re-checking later: **ASTRO 2027** host city (not yet announced as of Aug 2026).

**Finding CloudCME providers we do not yet watch.**

`diff-sources.js` only scrapes hosts it can see — those with a `cloud-cme.com` URL already in
`conferences.js`, plus anything listed in `scripts/cloudcme-extra-hosts.txt`. A provider outside
both is invisible to the weekly diff no matter how many conferences it runs. Twice a year, and any
time a hand-added conference names an institution we have not seen:

```
bash scripts/probe-cloudcme.sh          # prints NEW <slug> for unwatched live instances
/usr/bin/python3 scripts/scrape-cloudcme.py <slug>.cloud-cme.com   # then triage each
```

Add at least **one verified entry per new host** — that is what pulls it into the weekly rotation.
If a live host has nothing that passes the bar today, put it in `cloudcme-extra-hosts.txt` instead
so it is still scraped. Add new candidate slugs to `scripts/cloudcme-slugs.txt` as you meet them.

**Audience rule — physician CME only:**

The site is aimed at physicians. Add an activity only if it offers **AMA PRA Category 1 Credit™**
(or the national equivalent for non-US conferences — e.g. EACCME credits in Europe, RACGP/ACRRM
in Australia, national college accreditation elsewhere).

- **Skip** activities accredited only for nurses, pharmacists or other non-physician professions
  (ACPE, ANCC/state nursing contact hours, CPEU) with no physician credit.
- **Skip** meetings explicitly aimed at nurses or advanced practice providers — e.g. anything titled
  "… for Nurses", "Nursing Congress", "Advanced Practice Provider Symposium". Real examples caught
  this way: NASS's "Advanced Practice Provider Course", the SVM "Fellows & APP Course", Psych
  Congress's PA and NP Institutes, and the UK "National Clinical Endoscopist Conference" (clinical
  endoscopist is a non-physician role there).
- **Some meetings say outright that they offer no credit — believe them.** The ASTCT Gene Therapy
  Summit states it is not accredited; SIAAIC's national congress is labelled "CONGRESSO NO ECM"
  (its ECM is online-only, afterwards); the ASBrS BSO Fellows Summit calls itself "a non-CME
  educational experience". An accredited parent society does not make every one of its activities
  accredited.
- **Keep** physician conferences that merely welcome allied professionals as well, and keep physician
  conferences that happen to be *held at* a school of nursing or run alongside a separate nursing
  congress — the venue or a co-located event is not the audience.
- If the credit type is not stated anywhere on the official site, skip it.
- **Before skipping, check the back catalogue — and prefer an old BROCHURE to an old agenda.**
  Three meetings have now been recovered this way (Advances in Trauma 2023 programme, NCS 2025
  accreditation PDF, Detroit Trauma 2019 brochure). Agendas are session lists and usually omit
  accreditation; brochures carry a dedicated CME Credit page. A recurring meeting's accreditation
  pathway rarely changes, so a prior edition's statement establishes the credit TYPE — but do not
  carry over the credit COUNT unless the programme length is unchanged.


**Quality rules:**

- Be conservative — only add conferences you're confident about (clear date, clear location, real organizing society with an official site).
- Skip vague "global conference on surgery"/"international conference on X" listings from predatory
  conference mills (magnusgroup, conferenceseries, longdom, omicsonline, allconferencealert, conferenceindex, etc.) — no
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
