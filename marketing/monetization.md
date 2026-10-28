# convene.md — monetization options

One page because the options were scattered across `instagram.md`, `growth-channels.md`,
`signup-block.js` and `subscribers/README.md`, and answering "what were our options again?"
meant grepping four files. Status is honest: most of this is unbuilt.

**Standing principle.** The site's worth is that its dates are verified and nobody paid to be
listed. Every option below is judged against that first. No modals or popup overlays, ever —
that rule predates any of this and outranks all of it.

---

## Live

### 1. Chase Sapphire referral — running since 27 Oct 2026
`/how-to/cme-travel-points/`, linked from a card under the newsletter box on all 332 hub pages.

The honest ceiling: **15,000 points per approval, maximum 7 referrals, 100,000 points per
calendar year.** Chase's terms also zero out any month in which 10+ people apply through the
link, which is to say the programme is built so it cannot scale. Approvals are unattributable
(Chase never says who applied) and post up to 8 weeks later, so **the number to read is
click-through to the page**, not referrals. Target ~15–25 views/week; single digits after a
fortnight means the framing is wrong.

Treat this as a proof of concept for whether the audience tolerates commercial content at all,
not as revenue.

---

## Documented, not built

### 2. Flight affiliates — the best fit on the list
Detailed in `marketing/instagram.md` ("Monetization: flights first").

Owner opens a free **Travelpayouts** account (aggregates Skyscanner/WayAway/Kiwi), gets a marker
ID; a **"Find flights →"** button goes on each popup and list row, deep-linked to a search with
the conference city and dates prefilled.

This is the only option where the commercial action *is* the user's next step — someone reading
about a congress in Kyoto needs a flight to Kyoto. It is also the one case where the map popup is
arguably the right surface rather than an intrusion, since it sits beside "Visit site" as another
thing you would do next. **661 of 1,420 upcoming conferences are outside the USA**, so the
international leg is a real share of the inventory.

Hotels were considered and rejected in the same note: conferences route rooms through discount
blocks, so hotel affiliates underperform.

### 3. The newsletter list — the only option with real upside
The thesis is in `scripts/signup-block.js`: at this site's realistic traffic ceiling, affiliate
commissions top out around a couple of thousand a month, while a segmented list of verified
physicians is worth several times that. The signup asks role and specialty for that reason —
"10,000 physicians" is a rate card, "10,000 visitors" is not. `scripts/subscriber-report.js`
exists to produce that rate card monthly.

**Position as of 5 Oct 2026: 17 subscribers, 8 confirmed.** That is the distance between the
thesis and reality, and it is the thing that gates every sponsorship conversation. 9 of 17 never
confirmed, so double opt-in may be eating the list — worth checking before blaming acquisition.

### 4. Sponsored pins / newsletter sponsorship
Named in `instagram.md` as "revisit once traffic is measurable". Traffic is now measurable
(~1,180 views/week). Still gated on the list, not on traffic: a society or CME provider buys a
described audience, and 8 confirmed subscribers does not describe one.

Carries the most risk to the standing principle above — a sponsored pin is the one thing that
would make "nobody paid to be listed" untrue. If it is ever done, it needs to be visibly
distinct from verified listings, not blended into them.

---

## Raised in conversation, not previously recorded

### 5. Global Rescue — medical evacuation / travel-risk membership
Added 28 Oct 2026 at the owner's request. **Provenance note:** this was discussed at some point
but never written down, and Claude twice recalled it as a "parked strong alternative" when
nothing in the repo supported that. Recorded here so the list is complete — but nothing below is
verified, and none of it should be repeated as established.

Why it plausibly fits:
- Evacuation membership is bought *per trip*, and this site's whole subject is trips.
- **24 upcoming Sports & Wilderness Medicine meetings**, including dive-medicine courses in
  Saint Lucia, Little Cayman and the Philippines, and expedition/altitude medicine. That cohort
  is the natural buyer, and it is a category the site already covers well.
- The audience is physicians, who understand what evacuation coverage is and do not need the
  concept sold to them.

What is unknown and must be checked before any work:
- Whether Global Rescue runs an affiliate or partner programme at all, and on what terms.
- Commission structure, cookie window, and whether referrals from a content site are permitted.
- Whether a membership pitch alongside *physician* travel reads as useful or as insulting.

Next step if pursued: find the programme terms first. Do not build anything against assumptions.

---

## Not revenue, but on the same page because they get confused with it

- **KevinMD / Doximity Op-Med guest piece** (`marketing/growth-channels.md`) — "Use your CME
  budget to see the world". Audience acquisition. Was deferred pending traction.
- **Per-conference SEO pages** — roughly 900 pages from the existing hub generator. A traffic
  lever, and traffic gates everything above.

---

## Ordering, as of 28 Oct 2026

1. Let the card test run a month. Adding a second commercial element now makes both unreadable.
2. Flights next — better fit, and the click-through test is the same shape.
3. The list is the only path to a *formal* programme, and it is the furthest behind. 8 confirmed
   subscribers is the binding constraint on options 3 and 4, not traffic.
