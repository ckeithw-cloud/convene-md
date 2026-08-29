#!/usr/bin/env python3
"""Scrape a CloudCME instance's Live Courses listing.

CloudCME renders /course/listing server-side (10 rows/page) and paginates with a
plain ASP.NET postback: __EVENTTARGET=ResultsPageClick, __EVENTARGUMENT=ResultPageN.
The results-per-page <select> posts ApplyFilters instead, which bounces to a login
form -- so walk the numbered pages, don't try to widen them.
"""
import re, sys, json, html, time
import requests

UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36")

def strip(s):
    s = re.sub(r"<br\s*/?>", "\n", s, flags=re.I)
    s = re.sub(r"<[^>]+>", "", s)
    return html.unescape(s).strip()

def hidden(h):
    f = {}
    for name in ("__VIEWSTATE", "__VIEWSTATEGENERATOR", "__EVENTVALIDATION"):
        m = re.search(r'id="%s"[^>]*value="([^"]*)"' % name, h)
        if m: f[name] = html.unescape(m.group(1))
    return f

CARD = re.compile(r"<div id='(\d+)' class='12u activityListContainer'>(.*?)(?=<div id='\d+' class='12u activityListContainer'>|<div id='pageResultsBottomDiv'|</body>)", re.S)

def parse(h, host):
    out = []
    for eid, body in CARD.findall(h):
        t = re.search(r"class='activTitle'>(.*?)</span>", body, re.S)
        d = re.search(r"class='activTimeDate'>(.*?)</span>", body, re.S)
        if not (t and d):
            continue
        when = strip(d.group(1)).split("\n")
        cred = re.search(r"<strong>Credits:</strong>(.*?)<br", body, re.S)
        credtxt = strip(cred.group(1)) if cred else ""
        hrs = re.search(r"AMA PRA Category 1 Credit[^(]*\(([\d.]+)", credtxt)
        spec = re.search(r"<em>Specialties</em>\s*-\s*(.*?)</div>", body, re.S)
        tags = re.findall(r'class="categoryTag activityFormatTags">(.*?)</span>', body)
        out.append({
            "eid": eid,
            "name": strip(t.group(1)),
            "when": when[0] if when else "",
            "where": when[1] if len(when) > 1 else "",
            "cat1": "AMA PRA Category 1" in credtxt,
            "hours": float(hrs.group(1)) if hrs else None,
            "specialties": strip(spec.group(1)) if spec else "",
            "tags": [strip(x) for x in tags],
            "desc": strip((re.search(r"<p>(.*?)</p>", body, re.S).group(1) if re.search(r"<p>(.*?)</p>", body, re.S) else ""))[:300],
            "url": "https://%s/default.aspx?P=0&EID=%s" % (host, eid),
        })
    return out

def scrape(host, max_pages=25):
    s = requests.Session()
    s.headers["User-Agent"] = UA
    base = "https://%s/course/listing?p=1000" % host
    r = s.get(base, timeout=30)
    h = r.text
    rows, seen = [], set()
    for c in parse(h, host):
        if c["eid"] not in seen:
            seen.add(c["eid"]); rows.append(c)
    pages = sorted({int(m) for m in re.findall(r"title='ResultPage(\d+)'", h)})
    last = max(pages) if pages else 1
    page = 2
    while page <= min(last, max_pages):
        f = hidden(h)
        f["__EVENTTARGET"] = "ResultsPageClick"
        f["__EVENTARGUMENT"] = "ResultPage%d" % page
        try:
            r = s.post(base, data=f, timeout=30,
                       headers={"Referer": base, "Content-Type": "application/x-www-form-urlencoded"})
        except Exception as e:
            sys.stderr.write("  page %d failed: %s\n" % (page, e)); break
        h = r.text
        new = [c for c in parse(h, host) if c["eid"] not in seen]
        if not new:
            sys.stderr.write("  page %d returned nothing new; stopping\n" % page); break
        for c in new:
            seen.add(c["eid"]); rows.append(c)
        found = sorted({int(m) for m in re.findall(r"title='ResultPage(\d+)'", h)})
        if found: last = max(last, max(found))
        page += 1
        time.sleep(0.6)
    return rows

if __name__ == "__main__":
    host = sys.argv[1]
    rows = scrape(host)
    sys.stderr.write("%s: %d courses\n" % (host, len(rows)))
    print(json.dumps(rows, indent=1))
