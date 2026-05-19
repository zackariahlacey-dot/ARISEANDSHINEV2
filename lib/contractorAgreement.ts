/**
 * INDEPENDENT CONTRACTOR DOCUMENTS — TEMPLATE v2.0
 *
 * Three focused e-signature documents that together replace the older
 * single master agreement. Each document is legally self-complete: it
 * includes the Independent-Contractor anchor clause at the top and the
 * governance + electronic-signature acknowledgment at the bottom, so any
 * one of them is enforceable on its own.
 *
 *   payment       — How the contractor gets paid (tier, tips, taxes,
 *                   expenses, adjustments)
 *   restrictions  — What the contractor cannot do (side channels,
 *                   non-solicit, non-compete, confidentiality)
 *   liability     — Their responsibility (damage, insurance, incident
 *                   reporting, indemnification, sober workplace,
 *                   background-check consent)
 *
 * ⚠️ LEGAL DISCLAIMER ⚠️
 * These are STARTER templates. They are not legal advice. Before using
 * with any contractor:
 *
 *   1. Have a Vermont employment / business attorney review the full
 *      text, especially the non-solicitation and non-compete clauses.
 *      Vermont restricts non-competes; provisions may be partially or
 *      fully unenforceable as drafted.
 *   2. Verify that the day-to-day working relationship matches contractor
 *      classification under the IRS SS-8 factors and Vermont's ABC test.
 *      Misclassification penalties (back taxes, interest, Workers' Comp
 *      liability) can be severe.
 *   3. Bump CONTRACT_VERSION whenever you make any substantive change so
 *      past signatures stay tied to the exact text consented to.
 *
 * Each signing event snapshots the rendered HTML at sign time into
 * contractor_agreements.agreement_html, so future template edits never
 * alter past contracts.
 */

export const CONTRACT_VERSION = "v2.0";

export type DocKind = "payment" | "restrictions" | "liability";

export type AgreementContext = {
  contractorLegalName: string;
  contractorEmail: string;
  effectiveDate: string;              // YYYY-MM-DD
  businessName?: string;              // default "Arise & Shine VT"
  businessAddress?: string;
  governingState?: string;            // default "Vermont"
  nonSolicitationMonths?: number;     // default 24
  nonCompeteMonths?: number;          // default 12
  nonCompeteMiles?: number;           // default 25
  probationaryDays?: number;          // default 30
  noticeDays?: number;                // default 14
  initialCommissionPct?: number;      // default 35
  /** Display-only tier ladder shown in the Payment doc. The system tracks
   *  progress against these but money math happens off-platform. */
  tierLadder?: Array<{ tier: number; label: string; pct: number; minJobs: number; minRating: number | null; manualOnly: boolean }>;
};

export const DEFAULT_TIER_LADDER = [
  { tier: 1, label: "Starter",     pct: 35, minJobs: 0,  minRating: null, manualOnly: false },
  { tier: 2, label: "Established", pct: 40, minJobs: 0,  minRating: null, manualOnly: true  },
  { tier: 3, label: "Trusted",     pct: 42, minJobs: 15, minRating: 4.5,  manualOnly: false },
  { tier: 4, label: "Pro",         pct: 45, minJobs: 25, minRating: 4.6,  manualOnly: false },
  { tier: 5, label: "Elite",       pct: 50, minJobs: 50, minRating: 4.7,  manualOnly: false },
];

export type DocDefinition = {
  kind: DocKind;
  title: string;
  short: string;
  blurb: string;
};

export const DOC_DEFINITIONS: DocDefinition[] = [
  {
    kind: "payment",
    title: "Payment & Tax Terms",
    short: "How you get paid",
    blurb: "Commission tiers, tips, taxes, what we cover vs. what's on you.",
  },
  {
    kind: "restrictions",
    title: "Conduct & Restrictions",
    short: "What you can't do",
    blurb: "Customer protection, confidentiality, non-solicit, non-compete, photos.",
  },
  {
    kind: "liability",
    title: "Liability & Damage",
    short: "Your responsibility",
    blurb: "Damage to customer property, insurance, safety, incident reporting.",
  },
];

// ─── Public renderer ────────────────────────────────────────────────────────
export function renderContractorDoc(kind: DocKind, ctx: AgreementContext): string {
  const def = DOC_DEFINITIONS.find(d => d.kind === kind)!;
  const body =
    kind === "payment"      ? paymentBody(ctx)
    : kind === "restrictions" ? restrictionsBody(ctx)
    : liabilityBody(ctx);

  return `
<article class="contractor-doc">
  ${header(def, ctx)}
  ${disclaimerBanner(ctx)}
  ${preamble(def, ctx)}
  ${anchorClause(ctx)}
  ${body}
  ${governanceFooter(ctx)}
  ${signatureBlock(def, ctx)}
</article>`.trim();
}

// Backwards-compat alias so any caller that referenced the v1 renderer
// (the now-removed master document) gets routed to the payment doc.
export function renderContractorAgreement(ctx: AgreementContext): string {
  return renderContractorDoc("payment", ctx);
}

// ─── Document bodies ────────────────────────────────────────────────────────
function paymentBody(ctx: AgreementContext): string {
  const startPct = ctx.initialCommissionPct ?? 35;
  const tiers = ctx.tierLadder ?? DEFAULT_TIER_LADDER;
  const tierRows = tiers.map(t =>
    `<tr>
       <td style="padding:6px 10px; border:1px solid #ddd;">${t.tier}. ${esc(t.label)}</td>
       <td style="padding:6px 10px; border:1px solid #ddd; text-align:center; font-weight:800;">${t.pct}%</td>
       <td style="padding:6px 10px; border:1px solid #ddd; font-size:11px; color:#555;">
         ${t.manualOnly ? "Promotion at Company's discretion."
           : t.minJobs === 0 ? "Default starting tier."
           : `≥ ${t.minJobs} completed jobs${t.minRating ? ` + ${t.minRating}★ average` : ""}; promotion remains at Company's discretion.`}
       </td>
     </tr>`).join("");

  return [
    section("Compensation — Commission Schedule",
      `<p>Company will compensate Contractor on a commission basis — a percentage of the gross amount Company collects from the customer for each completed assignment Contractor performs (the "<strong>Commission</strong>"). The starting Commission rate is <strong>${startPct}%</strong>. Promotions to higher tiers are at Company's sole discretion and are not automatic.</p>
       <table style="width:100%; border-collapse:collapse; margin:8px 0 4px; font-size:12px;">
         <thead>
           <tr style="background:#f5f5f5;">
             <th style="padding:6px 10px; border:1px solid #ddd; text-align:left;">Tier</th>
             <th style="padding:6px 10px; border:1px solid #ddd; text-align:center;">Commission</th>
             <th style="padding:6px 10px; border:1px solid #ddd; text-align:left;">Promotion criteria</th>
           </tr>
         </thead>
         <tbody>${tierRows}</tbody>
       </table>
       <p style="font-size:11px; color:#666;">The tier ladder shown above is displayed inside the Contractor's dashboard for transparency. Actual payment is processed by Company off-platform (e.g., by check or external transfer); Company is the sole arbiter of when payments are issued and reconciles any disputes against the figures shown in the Contractor's dashboard.</p>`),

    section("Tips — 100% to Contractor",
      `<p>Tips paid by customers belong <strong>entirely to Contractor</strong>. When a customer adds a tip through Company's payment link, the full tip amount (net only of any third-party payment-processor fee, which is disclosed in the system before the customer pays) is passed through to Contractor as part of Contractor's payable balance. Company does not retain any portion of any tip.</p>`),

    section("Equipment, Supplies, and Expenses",
      `<p>Contractor will provide, at Contractor's sole expense, all equipment, supplies, vehicles, fuel, mobile phone, and other resources needed to perform assignments. Company will not reimburse any business expense unless agreed in writing in advance.</p>`),

    section("Taxes and 1099-NEC",
      `<p>Contractor is solely responsible for paying all federal, state, and local income, self-employment, and other taxes on Contractor's compensation. Company will not withhold taxes. For each tax year in which Contractor's earnings reach the reporting threshold (currently $600), Company will issue Contractor IRS Form 1099-NEC and report the same amount to the Internal Revenue Service. Contractor is not eligible for and waives any claim to employee benefits, including health insurance, paid time off, retirement contributions, unemployment insurance, or workers' compensation provided by Company.</p>`),

    section("Commission Adjustments",
      `<p>Company may adjust the Commission for an individual assignment upward (for example, to credit a customer tip not received through the payment link) or downward (for example, to reflect a documented quality issue, a customer refund, or a missed photo requirement). Any downward adjustment will be accompanied by a written reason recorded in the system and visible to Contractor. Contractor agrees that Company's adjusted Commission, once finalized, is the full compensation owed for the assignment.</p>`),

    section("Payment Timing",
      `<p>Company will pay earned and approved Commission on a schedule Company communicates in writing (for example, weekly or biweekly). All payments are made off-platform. Company will issue any final payment of earned Commission within thirty (30) days of the end of this engagement.</p>`),
  ].join("");
}

function restrictionsBody(ctx: AgreementContext): string {
  const nonSolMonths  = ctx.nonSolicitationMonths ?? 24;
  const nonCompMonths = ctx.nonCompeteMonths ?? 12;
  const nonCompMiles  = ctx.nonCompeteMiles ?? 25;
  const govState      = ctx.governingState ?? "Vermont";

  return [
    section("Communication with Customers",
      `<p>All communication with Company's customers regarding scheduling, pricing, payments, or service issues must occur through Company's authorized channels. Contractor will not:</p>
       <ul>
         <li>Provide Contractor's personal phone, email, or social-media handle to a Company customer for purposes related to the work;</li>
         <li>Accept cash, check, or other direct payment from a Company customer outside the payment link Company provides (tips remain Contractor's property regardless of payment channel);</li>
         <li>Solicit reviews, ratings, or feedback for Contractor personally rather than for Company; or</li>
         <li>Offer side services to a Company customer on terms that bypass Company's pricing or scheduling.</li>
       </ul>`),

    section("Confidentiality",
      `<p>"<strong>Confidential Information</strong>" means all non-public information Contractor receives or learns through this engagement, including customer lists, customer contact information, customer vehicle and service history, pricing structures, supplier relationships, marketing strategies, photographs taken on the job, training methods, and any other information Company designates as confidential or that a reasonable person would understand to be confidential. Contractor will hold Confidential Information in strict confidence, use it solely to perform assignments for Company, and not disclose it to any third party. This obligation survives termination of this engagement indefinitely with respect to trade secrets and for five (5) years with respect to all other Confidential Information.</p>`),

    section(`Non-Solicitation of Customers (${nonSolMonths} months post-termination)`,
      `<p>During this engagement and for <strong>${nonSolMonths} months</strong> following its termination for any reason, Contractor will not, directly or indirectly:</p>
       <ul>
         <li>Solicit, contact, or accept business from any customer Contractor learned of, was introduced to, or serviced through Company;</li>
         <li>Encourage any Company customer to terminate, reduce, or alter that customer's relationship with Company; or</li>
         <li>Use Company's customer list, contact data, or service history for any purpose other than performing assignments for Company.</li>
       </ul>
       <p>Contractor acknowledges that Company's customer relationships are among Company's most valuable assets and that this restriction is reasonable in scope and duration.</p>`),

    section(`Limited Non-Competition (${nonCompMonths} months / ${nonCompMiles} miles)`,
      `<p>During this engagement and for <strong>${nonCompMonths} months</strong> following its termination, Contractor will not, within a <strong>${nonCompMiles}-mile</strong> radius of Company's principal place of business, own, manage, operate, or be employed by a competing mobile-detailing business that serves residential or commercial customers in the same geographic area Company serves.</p>
       <p>The Parties intend this restriction to be enforced to the maximum extent permitted by ${esc(govState)} law. If a court of competent jurisdiction finds any portion of this restriction unenforceable, the Parties direct the court to modify the restriction so that it is enforceable to the greatest extent the court considers reasonable.</p>
       <p style="font-size:11px; color:#777;"><em>Plain-language note: Vermont restricts non-competition agreements. This clause may be partly or fully unenforceable as drafted and should be reviewed by a Vermont attorney before relying on it.</em></p>`),

    section("Photos and Marketing",
      `<p>All photographs Contractor takes during an assignment using Company's system or in the course of work for Company are <strong>the sole property of Company</strong>. Company may use, reproduce, publish, and license such photographs for any purpose, including marketing, without further compensation to Contractor. Contractor will not post, share, or distribute job-site photographs on any personal account or external platform.</p>`),

    section("No Solicited Personal Reviews",
      `<p>All customer ratings and reviews for work performed for Company belong to Company. Contractor will not solicit, redirect, or accept personal reviews from Company customers and will not link any review platform to Contractor personally.</p>`),
  ].join("");
}

function liabilityBody(ctx: AgreementContext): string {
  return [
    section("Insurance Required",
      `<p>Before performing any assignment, and continuously throughout this engagement, Contractor will maintain at Contractor's sole expense:</p>
       <ul>
         <li>Commercial general liability insurance with limits not less than $1,000,000 per occurrence and $2,000,000 aggregate;</li>
         <li>Commercial auto liability insurance covering any vehicle used to travel to or from job sites, with limits not less than $1,000,000 combined single limit; and</li>
         <li>Coverage for care, custody, and control of customer vehicles or property where applicable.</li>
       </ul>
       <p>Contractor will name Company as an additional insured on the general-liability policy upon Company's request. Lapse of coverage may result in immediate suspension of assignments until proof of coverage is restored.</p>`),

    section("Damage to Customer Property — Contractor's Responsibility",
      `<p><strong>Contractor is solely responsible for any damage to a customer's vehicle, property, or person caused by Contractor's negligence, error, or willful misconduct while performing an assignment.</strong> Contractor will report any such damage or incident to Company within twenty-four (24) hours of occurrence. Contractor will cooperate fully with Company's investigation and will use Contractor's own insurance as the first source of payment for any claim. Company is not financially liable for damage caused by Contractor, and Contractor will indemnify Company against any third-party claim arising from the same (see Indemnification, below).</p>`),

    section("Quality Standards and Photo Documentation",
      `<p>Contractor will follow all quality procedures published by Company, including:</p>
       <ul>
         <li>Performing a pre-existing-damage walk-around and photographing any prior scratches, dents, stains, or defects <strong>before beginning</strong> the assignment;</li>
         <li>Uploading the required before- and after-photo set specified for each service type prior to marking the assignment Complete;</li>
         <li>Maintaining professional appearance and conduct on the customer's property; and</li>
         <li>Completing the assignment within the time window estimated for the service.</li>
       </ul>
       <p>Repeated failure to meet these standards may result in Commission reductions, tier demotion, or termination for cause.</p>`),

    section("Mandatory Incident and Damage Reporting",
      `<p>Contractor will report to Company, within twenty-four (24) hours of occurrence, any of the following: damage to a customer's vehicle or property; customer complaint or refusal of service; injury to any person on a job site; accident involving a vehicle used for Company-related work; loss of equipment or supplies; or any law-enforcement contact related to the work. Failure to report is a material breach of this engagement.</p>`),

    section("Sober and Drug-Free Workplace",
      `<p>Contractor will not be under the influence of alcohol, illegal drugs, or any substance that impairs Contractor's ability to safely perform the assignment while on a job site or operating a vehicle for Company-related work. Company may, on reasonable suspicion, require Contractor to submit to a drug or alcohol test at Company's expense.</p>`),

    section("Background-Check Consent",
      `<p>Contractor authorizes Company to obtain a background check and motor-vehicle-record check at any time during this engagement and to repeat such checks annually. Contractor will disclose to Company any criminal charge or conviction occurring during the term of this engagement within three (3) business days of the event. Failure to disclose, or a result that Company in good faith determines disqualifies Contractor from servicing customers, is grounds for immediate termination.</p>`),

    section("Indemnification",
      `<p>Contractor will indemnify, defend, and hold harmless Company, its owners, officers, employees, and affiliates from and against any and all claims, demands, losses, costs, expenses, damages, and liabilities (including reasonable attorneys' fees) arising out of or relating to: (a) Contractor's performance or non-performance of any assignment; (b) Contractor's negligence, error, or willful misconduct; (c) any damage to a customer's vehicle or property caused by Contractor; (d) any third-party claim brought by a customer Contractor serviced; (e) Contractor's failure to maintain required insurance; or (f) Contractor's breach of this engagement.</p>`),

    section("Termination for Cause",
      `<p>Company may terminate this engagement immediately, without notice, for any of the following: theft, fraud, dishonesty, or material breach; customer safety concerns, including unprofessional or threatening behavior; violation of the Background-Check or Sober Workplace provisions; repeated or serious quality issues (low customer ratings, damage incidents, no-shows); lapse of required insurance; or loss of Contractor's driver's license or legal right to perform the work. Upon termination, Contractor's access to Company's systems will be revoked.</p>`),
  ].join("");
}

// ─── Shared chrome ──────────────────────────────────────────────────────────
function header(def: DocDefinition, ctx: AgreementContext): string {
  return `
  <header style="text-align:center; margin-bottom:18px;">
    <p style="font-size:10px; font-weight:800; letter-spacing:0.18em; text-transform:uppercase; color:#888; margin:0 0 4px;">Independent Contractor Document</p>
    <h1 style="font-size:18px; font-weight:900; letter-spacing:0.02em; margin:0;">${esc(def.title)}</h1>
    <p style="font-size:11px; color:#666; margin-top:4px;">Template ${CONTRACT_VERSION} · Effective ${esc(ctx.effectiveDate)}</p>
  </header>`;
}

function disclaimerBanner(ctx: AgreementContext): string {
  const govState = ctx.governingState ?? "Vermont";
  return `
  <aside style="background:#fff8e1; border:1px solid #ffc107; border-radius:8px; padding:12px 14px; margin-bottom:18px; font-size:12px; color:#7a5300;">
    <strong>Important.</strong> This document governs an
    <strong>independent contractor</strong> relationship — not employment.
    You are responsible for your own taxes, insurance, equipment, and
    expenses. Read fully before signing; signing creates a binding contract
    under ${esc(govState)} law.
  </aside>`;
}

function preamble(def: DocDefinition, ctx: AgreementContext): string {
  const business = esc(ctx.businessName ?? "Arise & Shine VT");
  const address  = ctx.businessAddress ? `, located at ${esc(ctx.businessAddress)}` : "";
  const name     = esc(ctx.contractorLegalName);
  const email    = esc(ctx.contractorEmail);
  return `
  <p style="font-size:13px; line-height:1.65; margin-bottom:16px;">
    This <strong>${esc(def.title)}</strong> document is entered into as of <strong>${esc(ctx.effectiveDate)}</strong> between <strong>${business}</strong>${address} ("<strong>Company</strong>") and <strong>${name}</strong>${email ? ` (${email})` : ""} ("<strong>Contractor</strong>"). This is one of three documents that together govern the engagement; the other two cover the topics not addressed here. All three apply concurrently.
  </p>`;
}

function anchorClause(ctx: AgreementContext): string {
  return section("Independent Contractor Status",
    `<p>Contractor is engaged as an independent contractor, not as an employee, agent, partner, or joint venturer of Company. Nothing in this document creates an employment, partnership, or agency relationship. Contractor retains the right to provide similar services to other parties, subject to the Restrictions document.</p>`);
}

function governanceFooter(ctx: AgreementContext): string {
  const govState  = ctx.governingState ?? "Vermont";
  return [
    section("Dispute Resolution",
      `<p>Any dispute arising out of or relating to this document will first be addressed in good faith between the Parties for thirty (30) days. If unresolved, the dispute will be finally settled by binding arbitration administered by JAMS under its Streamlined Arbitration Rules, with arbitration to take place in ${esc(govState)}. The prevailing Party is entitled to recover reasonable attorneys' fees and costs. Either Party may seek injunctive relief from a court of competent jurisdiction to enforce the Restrictions or Photos and Marketing provisions of the Restrictions document.</p>`),
    section("Governing Law and Miscellaneous",
      `<p>This document is governed by the laws of the State of ${esc(govState)}, without regard to its conflict-of-laws principles. If any provision is held unenforceable, the remaining provisions remain in full force. This document, together with the other two contractor documents on file, constitutes the entire agreement between the Parties regarding its subject matter and supersedes all prior or contemporaneous communications. No modification is effective unless in writing and signed by both Parties (electronic acceptance via Company's system satisfies the writing requirement).</p>`),
    section("Electronic Signature",
      `<p>Contractor acknowledges having read and understood this document and agrees that electronic acceptance — typing Contractor's full legal name in the signature field, checking the acknowledgment box, and submitting the signing form — constitutes Contractor's electronic signature under the federal Electronic Signatures in Global and National Commerce Act (E-SIGN) and ${esc(govState)}'s Uniform Electronic Transactions Act (UETA), and is legally binding to the same extent as a handwritten signature. Company will retain a timestamped copy of this document and the signing event, including the IP address and user-agent string of the device used to sign.</p>`),
  ].join("");
}

function signatureBlock(def: DocDefinition, ctx: AgreementContext): string {
  return `
  <section style="margin-top:24px; padding-top:18px; border-top:2px solid #111;">
    <p style="font-size:12px; color:#444; margin-bottom:6px;">
      <strong>Document:</strong> ${esc(def.title)}<br/>
      <strong>Contractor:</strong> ${esc(ctx.contractorLegalName)}<br/>
      <strong>Effective Date:</strong> ${esc(ctx.effectiveDate)}<br/>
      <strong>Template Version:</strong> ${CONTRACT_VERSION}
    </p>
    <p style="font-size:11px; color:#777; line-height:1.55;">
      By typing your full legal name and clicking the sign button on this screen, you confirm that you have read this document, agree to all of its terms, and intend your typed name to be your electronic signature.
    </p>
  </section>`;
}

function section(heading: string, bodyHtml: string): string {
  return `
  <section style="margin-bottom:16px;">
    <h2 style="font-size:13px; font-weight:800; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:6px; color:#111;">${esc(heading)}</h2>
    <div style="font-size:13px; line-height:1.65; color:#222;">${bodyHtml}</div>
  </section>`;
}

function esc(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
