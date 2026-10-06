#!/bin/bash
# Find CloudCME provider instances we are not already watching.
#
#   bash scripts/probe-cloudcme.sh            # probe every slug in cloudcme-slugs.txt
#   bash scripts/probe-cloudcme.sh uw chop    # probe just these
#
# WHY: diff-sources.js builds its weekly watch list by regexing cloud-cme.com hostnames out of
# conferences.js, so a provider we hold no entries from is invisible to the diff permanently.
# Nothing discovers a new provider on its own. Run this twice a year, and whenever a hand-added
# conference turns up a provider we have not seen.
#
# A live instance answers 200 on /course/listing; anything else is not a tenant. Output is
# "NEW <slug>" for live instances absent from conferences.js and "known <slug>" for the rest,
# so a re-run reads as a diff rather than a wall of text.
#
# After this prints NEW slugs: scrape each with
#   /usr/bin/python3 scripts/scrape-cloudcme.py <slug>.cloud-cme.com
# then verify and add at least ONE entry per host — that is what pulls the host into the weekly
# rotation. Apply the same bar diff-sources.js uses: in-person, Category 1, >= 4 credits.
set -u
cd "$(dirname "$0")/.." || exit 1
LIST="scripts/cloudcme-slugs.txt"
CONC=12

known() { grep -oiE 'https?://[a-z0-9-]+\.cloud-cme\.com' conferences.js \
          | sed -E 's|https?://||; s|\.cloud-cme\.com||' | tr 'A-Z' 'a-z' | sort -u; }

if [ $# -gt 0 ]; then
  SLUGS=$(printf '%s\n' "$@")
else
  [ -f "$LIST" ] || { echo "missing $LIST" >&2; exit 1; }
  # Strip comments, then split remaining lines into whitespace-separated words so the
  # grouped "probed, nothing there" blocks can stay readable in the list file.
  SLUGS=$(sed 's/#.*//' "$LIST" | tr -s ' \t' '\n' | grep -E '^[a-z0-9][a-z0-9-]*$' | sort -u)
fi

KNOWN=$(known)
TOTAL=$(printf '%s\n' "$SLUGS" | grep -c .)
echo "probing $TOTAL slug(s); $(printf '%s\n' "$KNOWN" | grep -c .) already in the dataset" >&2

probe() {
  code=$(curl -s -o /dev/null -m 12 -A 'Mozilla/5.0' \
         -w '%{http_code}' "https://$1.cloud-cme.com/course/listing?p=5" 2>/dev/null)
  [ "$code" = "200" ] && echo "$1"
}
export -f probe

LIVE=$(printf '%s\n' "$SLUGS" | xargs -P "$CONC" -I{} bash -c 'probe "$@"' _ {} | sort -u)

new=0
for s in $LIVE; do
  if printf '%s\n' "$KNOWN" | grep -qx "$s"; then
    echo "known $s"
  else
    echo "NEW   $s"
    new=$((new+1))
  fi
done
echo "---" >&2
echo "$(printf '%s\n' "$LIVE" | grep -c .) live instance(s), $new not yet in the dataset" >&2
[ "$new" -gt 0 ] && echo "Next: scrape each NEW slug, verify, and add >=1 entry so the host joins the weekly diff." >&2
exit 0
