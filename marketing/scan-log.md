# Conference scan log

> Rotation covers only the sources that cannot be enumerated. The machine-readable
> third (CloudCME + mer.org) is checked in FULL every week by `scripts/diff-sources.js`
> and must not be rotated. Priority order and the reasoning behind the split live in
> [coverage-plan.md](coverage-plan.md).

What each weekly scan actually covered, and what it found. The scan cannot check
all 46 specialties every week — that would be hundreds of searches — so it rotates.
Without this file the rotation had no memory: each run re-picked targets by eye, so
well-covered specialties were never revisited and the same unannounced meetings got
re-searched from scratch.

Two things to read before starting a scan:

1. **Rotation** — pick the specialties with the fewest 2027+ entries that have NOT been
   swept in the last ~6 weeks. Both halves matter. Thin-only rotation starves the big
   specialties, which also gain new meetings.
2. **Not-yet-announced** — do not re-search anything in that table before its re-check
   date. Those searches already came back empty; repeating them wastes the budget.

Coverage counts come from:

```
node -e 'const fs=require("fs");const s=fs.readFileSync("conferences.js","utf8");
const C=eval("(function(){"+s+"\nreturn CONFERENCES;})()");
const up=C.filter(c=>c.endDate>=new Date().toISOString().slice(0,10));const f={};
up.filter(c=>c.year>=2027).forEach(c=>f[c.specialty]=(f[c.specialty]||0)+1);
Object.entries(f).sort((a,b)=>a[1]-b[1]).slice(0,15).forEach(([k,v])=>console.log(String(v).padStart(3),k))'
```

---

## Rotation ledger

Last swept, by specialty. Anything absent has never been swept by a logged scan.

| Specialty | Last swept | Found |
| --- | --- | --- |
| Cardiothoracic Surgery | 2026-09-04 | STS ×3, AATS ×3, ISHLT ×3 |
| Vascular Surgery | 2026-09-04 | SVS VAM ×3, VEITH 2026 |
| Plastic Surgery | 2026-09-04 | ASPS ×2 |
| Allergy & Immunology | 2026-09-04 | ACAAI ×3 |
| Physical Medicine & Rehabilitation | 2026-09-04 | AAPM&R ×2 |
| Radiation Oncology | 2026-09-08 | ASTRO 2027 |
| HPB / Transplant Surgery | 2026-09-08 | AHPBA 2027/2029, IHPBA 2028 (+ ATC 2027 on 09-04) |
| Surgical Oncology | 2026-09-08 | SSO 2028/2029 (+ ESSO 45 on 09-04) |
| Pediatric Surgery | 2026-09-08 | APSA 2028 |
| Colorectal Surgery | 2026-09-08 | nothing new |
| Hospital Medicine | 2026-09-08 | nothing new |

**Never swept by a logged scan** — the whole of Medicine & subspecialties, Neuro & psych,
Acute & hospital-based, Primary care & family, Diagnostic & other, plus Palliative,
Geriatrics, Pain Medicine, Bariatric, Trauma, Lifestyle & Preventive, Sports.
These are well-populated for 2026 but that is not evidence they are current for 2027+.

---

## Not yet announced — do not re-search before the re-check date

| Meeting | Checked | Status | Re-check |
| --- | --- | --- | --- |
| EACTS 2027 | 2026-09-04 | 2026 Barcelona is the latest published | 2026-12 |
| EAACI Congress 2027 | 2026-09-04 | 2026 Istanbul latest; only the 2027 Skin Allergy meeting is out | 2026-12 |
| EUPSA 2027 | 2026-09-04 | 2026 Vienna joint congress was the latest | 2026-12 |
| ESCP 2027 | 2026-09-04 | dates 22–24 Sep 2027, host city TBC | 2026-11 |
| ILTS 2027 | 2026-09-04 | society event pages 404 | 2026-11 |
| SHM Converge 2028 | 2026-09-08 | 2027 Las Vegas is the latest published | 2027-01 |
| ACPGBI 2027 | 2026-09-08 | events list is login-gated | 2026-12 |
| BAPS 2027 | 2026-09-08 | listed as "August 2027 (or to be agreed)" — dates unconfirmed | 2026-12 |
| ASTRO 2028 / 2029 | 2026-09-08 | dates published (21–25 Oct 2028, 6–10 Oct 2029), **no host city** | 2027-03 |

## Held back for a missing credit statement

Real meetings from accredited providers whose own page carries no AMA PRA Category 1
designation yet. See the PENDING RE-CHECKS section of `scripts/update-prompt.md` for the
full list (Hopkins Beaver Creek / San Juan / Pediatrics for Practitioner, Cleveland Clinic
radonc / marfan / neuromuscular).

---

## Scan history

### 2026-09-08 — thinnest surgical subspecialties
Targets: Pediatric Surgery (1 entry for 2027+), Radiation Oncology (1), Surgical
Oncology (1), Colorectal (2), HPB/Transplant (2), Hospital Medicine (2).
**Added 7.** ASTRO 2027 Chicago; AHPBA 2027 Miami Beach, IHPBA World Congress 2028
Vancouver, AHPBA 2029 Miami Beach; SSO 2028 Tampa, SSO 2029 Boston; APSA 2028 Washington DC.
Note: ASTRO's host city was NOT on its future-meetings page but WAS on the 2027 exhibitor
micro-site (`/micro-sites/2027/am-exhibitors/general-information`) — worth checking exhibitor
pages when a society publishes dates without a venue.

### 2026-09-04 — thin surgical + selected medical
Targets: Cardiothoracic (1 for 2027+), Vascular (1), Plastics (3), Allergy (2), PM&R (3),
Palliative, Geriatrics. **Added 22.** Cardiothoracic 2027+ went 1 → 10, vascular 1 → 4.
Caught that ESCP's 2027 slot is the Tripartite meeting already held as ASCRS 2027 —
one event, not two. AAPM&R 2026, AAHPM 2027 and AGS 2027 were already present.

### Before 2026-09-04
Unlogged. Earlier passes covered MER's catalogue (170 courses), the CloudCME academic
providers (see `scripts/update-prompt.md` §3d) and assorted ad-hoc society sweeps, but
no record was kept of which specialties were searched when.
