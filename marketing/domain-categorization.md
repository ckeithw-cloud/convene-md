# Domain categorization submissions — convene.md

**Why:** Enterprise/hospital web filters block "uncategorized" and "newly registered"
domains by default. Submitting convene.md for categorization gets it classified as a
legitimate Health/Medical reference site so it stops being blocked on corporate networks.
Do this once per vendor below. Re-check in ~1–2 weeks.

## Copy-paste details (same for every form)

- **URL / Domain:** `https://convene.md`
- **Primary category:** Health and Medicine  (a.k.a. "Health", "Medical", "Health/Medicine")
- **Secondary / alternate category if a second is allowed:** Reference and Research  (or "Business/Professional Services", or "Education")
- **NOT:** adult, gambling, malware, phishing, shopping, social, streaming — decline all of these if asked
- **Contact email:** ckeithw@gmail.com
- **Short description (for the "reason"/"comments" field):**

> convene.md is a free, professionally maintained directory of medical and surgical
> conferences worldwide, presented as an interactive map and calendar for physicians
> planning continuing medical education (CME) travel. It is a static informational
> reference site with no user-generated content served to visitors, no downloads, and
> no advertising. Please classify it under Health/Medicine (Reference). It is a
> newly registered domain (July 2026) and has been miscategorized as uncategorized.

## Vendor submission pages

| Vendor (filters it covers) | Submission URL | Notes |
|---|---|---|
| Cisco Talos / Umbrella (OpenDNS) | https://talosintelligence.com/reputation_center → search convene.md → "Submit a Dispute / Suggest category" | Covers Cisco Umbrella, very common in hospitals |
| Zscaler | https://sitereview.zscaler.com | Big in large enterprises/health systems |
| Palo Alto Networks | https://urlfiltering.paloaltonetworks.com | Test URL → "Request Change" |
| Symantec / Broadcom (Blue Coat / WebPulse) | https://sitereview.bluecoat.com | Category = Health, then submit |
| Fortinet (FortiGuard) | https://www.fortiguard.com/webfilter → look up convene.md → "Request Review" | Common in mid-size orgs |
| Forcepoint | https://csi.forcepoint.com | "Submit a URL" / dispute |
| Netskope | https://url.netskope.com | Look up → request recategorization |
| Trellix / McAfee (TrustedSource) | https://trustedsource.org | Check reputation → categorize |
| Cloudflare Radar (its own filter) | https://radar.cloudflare.com/domains/feedback | Suggest "Health" |

## Status checked (2026-07-09)

- **Symantec / Blue Coat (WebPulse):** already categorized **"Health"** ✓ — correct, no action needed. This is a top-3 enterprise filter, so the corporate block the colleague hit is most likely the **newly-registered-domain (NRD) rule**, not miscategorization.
- **Palo Alto, Fortinet:** their lookup pages block automated browsers, and the submit step is CAPTCHA-gated → must be done by a human in a normal browser.

**Key implication:** an NRD block is a *reputation/age* filter, separate from category. Recategorizing won't clear it — only time (30–90 days) or an IT allowlist will. So the fastest real fix for a specific hospital is to ask their IT to allowlist convene.md; categorization submissions mainly help the broader long tail of networks.

## Priority order (if short on time)
Do the top 5 — they cover the majority of hospital/enterprise networks:
Cisco Talos, Zscaler, Palo Alto, Blue Coat, Fortinet.

## Also helps NRD reputation
- Keep the site live and stable (done — it's on Cloudflare).
- Get a few inbound links (Instagram bio, any society/personal site) — links age the domain's reputation.
- Time: newly-registered-domain blocks typically age out in 30–90 days automatically.

## To re-check whether it's still blocked
- Colleague loads convene.md on **cellular data** (off corp network) → if it works there, it's the filter.
- Or look up the domain on the vendor pages above to see its current category.
