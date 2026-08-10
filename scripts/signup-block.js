// Single source of truth for the newsletter capture block.
//
// The list is the asset: at convene.md's realistic traffic ceiling, affiliate commissions
// top out around a couple of thousand a month, while a segmented list of verified physicians
// is worth several times that. So the block asks for role and specialty, not just an email —
// "10,000 physicians" is a rate card, "10,000 visitors" is not.
//
// Friction is bought back where we already know the answer: on /specialty/<x>/ the specialty
// is passed in and becomes a hidden field, so those pages ask for one field fewer AND get
// cleaner data than a dropdown would.
//
// Used by build-hubs.js (every hub) and build-seo.js (homepage + articles).

const SPECIALTIES = [
  "Allergy & Immunology","Anesthesiology","Bariatric Surgery","Cardiology","Cardiothoracic Surgery",
  "Colorectal Surgery","Critical Care","Dermatology","Emergency Medicine","Endocrine / ENT Surgery",
  "Endocrinology","Family Medicine","Gastroenterology","General Surgery","Geriatrics",
  "HPB / Transplant Surgery","Hematology","Hospital Medicine","Infectious Disease","Internal Medicine",
  "Lifestyle & Preventive Medicine","Medical Oncology","Nephrology","Neurology","Neurosurgery",
  "Obstetrics & Gynecology","Ophthalmology","Orthopedic Surgery","Pain Medicine",
  "Palliative & Supportive Care","Pathology","Pediatric Surgery","Pediatrics",
  "Physical Medicine & Rehabilitation","Plastic Surgery","Psychiatry","Pulmonology",
  "Radiation Oncology","Radiology","Rheumatology","Sports & Wilderness Medicine","Sports Medicine",
  "Surgical Oncology","Trauma Surgery","Urology","Vascular Surgery"
];

const ROLES = ["Physician (MD/DO)", "Resident / Fellow", "NP / PA", "Other"];

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;")
  .replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// The behaviour script is emitted once per page and guards against double-binding, so a
// page can safely carry more than one block. Submission targets a hidden iframe: the POST
// still reaches Buttondown, but the page never navigates and nothing overlays the content
// (this site has a standing no-modal rule).
const BEHAVIOUR = `<script>
(function(){
  if (window.__signupBound) return;
  window.__signupBound = true;
  document.addEventListener("submit", function(e){
    var f = e.target.closest("form.signup-form");
    if (!f) return;
    var box = f.closest(".signup");
    setTimeout(function(){
      f.hidden = true;
      var fine = box.querySelector(".signup-fine"); if (fine) fine.hidden = true;
      var done = box.querySelector(".signup-done"); if (done) done.hidden = false;
    }, 60);
  });
})();
</script>`;

/**
 * @param {object} opts
 * @param {string} [opts.specialty] known specialty — rendered as a hidden field
 * @param {string} opts.source     page identifier, stored so we can see which pages convert
 * @param {boolean} [opts.behaviour=true] emit the shared script with this block
 */
function signupBlock({ specialty, source, behaviour = true } = {}) {
  const title = specialty
    ? `New ${esc(specialty)} conferences, monthly`
    : "New conferences, monthly";

  const specialtyField = specialty
    ? `<input type="hidden" name="metadata__specialty" value="${esc(specialty)}" />`
    : `<select name="metadata__specialty" aria-label="Your specialty">
            <option value="">Specialty (optional)</option>
${SPECIALTIES.map((s) => `            <option value="${esc(s)}">${esc(s)}</option>`).join("\n")}
          </select>`;

  return `      <aside class="signup">
        <p class="signup-title">${title}</p>
        <p class="signup-sub">One email a month: newly added meetings and destination CME, every date verified against the organiser's own site. No spam, unsubscribe anytime.</p>
        <form class="signup-form" action="https://buttondown.com/api/emails/embed-subscribe/convenemd" method="post" target="signup-sink">
          <input type="email" name="email" placeholder="you@hospital.org" required autocomplete="email" aria-label="Email address" />
          <select name="metadata__role" aria-label="Your role">
            <option value="">I am a…</option>
${ROLES.map((r) => `            <option value="${esc(r)}">${esc(r)}</option>`).join("\n")}
          </select>
          ${specialtyField}
          <input type="hidden" name="metadata__source" value="${esc(source || "")}" />
          <button type="submit">Subscribe</button>
        </form>
        <p class="signup-fine">Free. We never sell your address.</p>
        <p class="signup-done" hidden>Thanks — check your inbox to confirm your subscription.</p>
        <iframe name="signup-sink" class="signup-sink" title="" aria-hidden="true" tabindex="-1"></iframe>
      </aside>
${behaviour ? BEHAVIOUR : ""}`;
}

module.exports = { signupBlock, SPECIALTIES, ROLES };
