# Coverage plan

How convene.md keeps 1,100+ conferences current. Agreed 2026-09-08.

## The priority order

Effort goes in this order. When time is short, the lower tiers wait.

1. **Big conferences first.** The flagship annual meetings — ACS, ASCO, RSNA, ACC, AAOS,
   STS, AATS and their equivalents in all 46 specialties. These are what a physician
   searches for by name, they are booked a year ahead, and missing one is the most
   visible possible failure.
2. **Then the smaller societies.** National and regional bodies, chapter meetings,
   subspecialty groups. This is the long tail that makes the site comprehensive rather
   than another list of the same twenty meetings — the actual differentiator.
3. **Finally the paid CME destination courses.** MER, the academic providers, resort and
   ski CME. Valuable and on-brand, but they are also the easiest to collect (see
   Automated below), so they need the least *human* attention despite being a third of
   the dataset.

Note the inversion: tier 3 is last in priority but first in automation, precisely
because it is scriptable. Cheap to keep current, so it never competes for search budget.

## Why coverage is split at all

947 upcoming conferences sit on **460 distinct hosts** from 493 organizers, and the
distribution is extremely long-tailed:

| | |
| --- | --- |
| Hosts with exactly 1 upcoming entry | 370 of 460 |
| Hosts with ≤2 | 415 of 460 |
| Entries in that 1–2 host tail | 460 (49%) |
| Entries on the top 10 hosts | 319 (34%) |

So half the dataset lives on 415 bespoke websites holding one conference each. Those
cannot be enumerated — each needs its own search and read. The concentrated third can be
enumerated completely, in about 90 seconds. Different problems, different treatment.

A second reason, independent of volume: **society schedules barely change.** A future-meetings
page listing 2027, 2028 and 2029 gets edited roughly once a year. Checking it weekly would
be ~52 fetches to catch one edit. Frequency should track how fast a source actually moves.

---

## Tier A — Automated, checked in full every week

`node scripts/diff-sources.js` — 15 CloudCME provider instances plus mer.org, **530 live
records in ~90 seconds**, pure HTTP, no searching and no model calls. Writes
`marketing/source-diff/<date>.md`.

It reports four things and **edits nothing**:

- **Changed dates** — the only check that looks at conferences we already hold. Everything
  else in the system hunts for missing events, so until this existed a meeting that moved
  city or shifted dates would have stayed wrong indefinitely. For a site whose pitch is
  "verified, unlike the aggregators", a wrong entry costs more than a missing one.
- **Gone from source** — dropped out of the provider's listing. It also probes whether the
  course's own page still resolves, because *delisted* usually means registration closed,
  not cancelled.
- **New candidates** — filtered to in-person, Category 1, ≥4 credits, excluding the
  faculty-development and RSS patterns that dominate academic catalogues.
- **Entries with no deep link** — rows pointing at a listing page instead of a course.
  These break the deep-link rule in `update-prompt.md` and cannot be tracked at all.

Two safety properties worth preserving if this is ever edited:

- **It reports, never writes.** Silently rewriting dates from a regex would defeat the
  purpose of a verified dataset.
- **A source returning zero records is treated as a scraper failure, not mass
  cancellation.** The first version's MER regex captured only the anchor text while the
  dates sat in sibling divs; it fetched 0 records and confidently reported all 156 MER
  conferences as gone. The guard now suppresses "gone" for any empty source and says so
  loudly.

## Tier B — Rotation, for everything that cannot be enumerated

`marketing/scan-log.md` is the rotation's memory: which specialties were swept when, what
was found, and which meetings came back "not yet announced" with a re-check date so the
same dead ends are not re-searched every week. `scripts/update-prompt.md` requires reading
it first and updating it at the end.

Rotate on **two** axes, not one. Picking only the thinnest specialties starves the large
ones, which also gain meetings.

Standing gap, recorded honestly: **every specialty outside the surgical subspecialties has
never been swept by a logged scan.** They look well populated for 2026, largely from the
bulk MER and CloudCME imports, which is not evidence they are current for 2027+. Under the
priority order above, the next several scans belong to the large medical specialties —
cardiology, oncology, neurology, internal medicine — not to the thinnest.

## Tier C — Flagship societies, slow cadence

The ~90 flagship societies named in `update-prompt.md` publish years ahead and change
rarely. Quarterly is enough, and their **future-meetings pages yield three years per
fetch**, so this is high-yield per request.

Technique worth remembering: when a society publishes dates but no venue, check its
**exhibitor / general-information micro-site** for that year. ASTRO 2027's Chicago venue
was found there after the main future-meetings page listed dates alone.

---

## Weekly Monday routine

| Job | Runs | State |
| --- | --- | --- |
| Traffic report (`com.medconf.traffic`) | Mon 08:20 | works unattended |
| Source diff (`scripts/diff-sources.js`) | should join Monday | no LLM needed, so it *can* run unattended — unlike the updater |
| Conference scan (`com.medconf.update`) | Mon 14:07 | **broken** — Claude CLI "Not logged in"; run manually |
| Subscriber report | 1st of month 08:40 | **broken** — needs `~/.config/convene/buttondown-token` |

The source diff is the one piece of conference work that does not depend on the unresolved
CLI auth, since it makes no model calls. That makes it the reliable half of Monday.
