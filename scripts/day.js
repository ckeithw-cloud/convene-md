// Two different "today"s, because "is this conference over?" and "what day is it?" are not
// the same question and must not share an answer.
//
// WHY THIS EXISTS
// Every script here used `new Date().toISOString().slice(0, 10)` -- the UTC date. On a machine
// in US Pacific that rolls over at 16:00 local time, so from 16:00 onward the site dropped
// conferences that were still running. On 10 Nov 2026 the Huntley, Illinois and Park City,
// Utah meetings disappeared from the crawlable list and the JSON-LD while they were in
// progress, and the reported "upcoming" count fell by three for no real reason. The skew hit
// US events hardest, which are most of the dataset.
//
// conferenceDay() answers "is this conference over?", and it must never say yes early. A
// conference whose last day is the 10th is still running somewhere on earth until 11 Nov
// 12:00 UTC -- 23:59 on the 10th in UTC-12, the last timezone to leave that date. Comparing
// endDate against the date in UTC-12 keeps an event listed for exactly as long as it is still
// happening anywhere, and drops it the moment it is over everywhere. It is deliberately
// generous by up to a day: listing a conference that has just finished is a far smaller
// failure than hiding one that is still sitting in session.
//
// localDay() answers "what day is it here?" and belongs on anything stamped with the day the
// operator ran it -- report filenames, headings, CSV keys. Those should match the calendar on
// the wall. A report run at 17:00 Pacific used to be filed under tomorrow's date.
//
// Neither of these replaces UTC where UTC is the real unit: traffic-report.js queries
// Cloudflare over midnight-UTC windows and labels them in UTC, because that is what the
// analytics data is. Only the report's own identity became local.
const HALF_DAY_MS = 12 * 60 * 60 * 1000;

// The date in UTC-12: the last timezone on earth still on a given calendar day.
function conferenceDay(now = Date.now()) {
  return new Date(now - HALF_DAY_MS).toISOString().slice(0, 10);
}

// The machine's own calendar date, built from local components so no locale can reformat it.
function localDay(d = new Date()) {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

module.exports = { conferenceDay, localDay };
