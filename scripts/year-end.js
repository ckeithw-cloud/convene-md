// Year-end CME-deadline seasonality, shared by build-hubs.js and build-seo.js.
//
// Most hospital and group CME allowances expire on 31 December and do not roll over, so from
// October the most useful thing the site can say to an arriving physician is "here is what is
// still reachable this year". Both the callout on every hub page and the sentence inside
// /how-to/use-cme-funds-before-year-end/ come from here, so the numbers can never disagree with
// each other or drift away from the dataset.
//
// It lives in its own module because build-seo.js runs its build at import time — requiring it
// from build-hubs.js would re-run the whole SEO build as a side effect.

function yearEndCounts(upcoming) {
  const today = new Date().toISOString().slice(0, 10);
  const year = today.slice(0, 4);
  const rest = upcoming.filter((c) => c.startDate >= today && c.startDate <= year + "-12-31");
  const dec = rest.filter((c) => c.startDate >= year + "-12-01");
  return { year, rest: rest.length, dec: dec.length };
}

function yearEndSentence(upcoming) {
  const n = yearEndCounts(upcoming);
  if (!n.rest) return `Everything on the map now runs in ${Number(n.year) + 1} or later.`;
  return `As of today there are <strong>${n.rest} conferences still to come before 31 December</strong>` +
    (n.dec ? `, ${n.dec} of them in December itself` : "") + ".";
}

// Rendered only in the last quarter, when the deadline is actually live. Outside that window it
// returns "" and the pages are byte-identical to what they would otherwise be — so this cannot
// quietly leave a stale "spend it before December" banner up in March.
function yearEndCallout(upcoming) {
  const month = Number(new Date().toISOString().slice(5, 7));
  if (month < 10) return "";
  const n = yearEndCounts(upcoming);
  if (!n.rest) return "";
  return `    <p class="yearend"><strong>CME money expiring 31 December?</strong> ` +
    `${n.rest} conferences still start before year end` +
    (n.dec ? ` — ${n.dec} in December` : "") +
    `. <a href="/year/${n.year}/">See what is left in ${n.year}</a> · ` +
    `<a href="/how-to/use-cme-funds-before-year-end/">what to do if you cannot travel in time</a></p>\n`;
}

module.exports = { yearEndCounts, yearEndSentence, yearEndCallout };
