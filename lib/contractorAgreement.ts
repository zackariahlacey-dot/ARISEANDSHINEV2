/**
 * INDEPENDENT CONTRACTOR AGREEMENT — TEMPLATE v1
 *
 * ⚠️ LEGAL DISCLAIMER ⚠️
 * This is a STARTER template generated for Arise & Shine VT. It is NOT
 * legal advice. Before using this with any contractor:
 *
 *   1. Have a Vermont employment / business attorney review the full
 *      document, especially the non-solicitation and non-compete clauses
 *      (Vermont restricts non-competes; some provisions may be
 *      unenforceable as drafted).
 *   2. Verify that the day-to-day relationship matches the contractor
 *      classification under both IRS Form SS-8 factors and Vermont's
 *      ABC test. If you exert significant control over how, when, or
 *      where the work is done, the contractor may legally be an
 *      employee regardless of what this document says — and
 *      misclassification penalties (back taxes + interest +
 *      Workers' Comp liability) can be severe.
 *   3. Update CONTRACT_VERSION below whenever you make any substantive
 *      change so old signatures stay tied to the text they actually
 *      consented to.
 *
 * Each signing event snapshots the rendered HTML at the moment of
 * signing into contractor_agreements.agreement_html, so future edits
 * to this template never alter past contracts.
 */

export const CONTRACT_VERSION = "v1.0";

export type AgreementContext = {
  contractorLegalName: string;
  contractorEmail: string;
  effectiveDate: string;             // YYYY-MM-DD
  businessName?: string;             // default "Arise & Shine VT"
  businessAddress?: string;          // optional, for the header
  governingState?: string;           // default "Vermont"
  nonSolicitationMonths?: number;    // default 24
  nonCompeteMonths?: number;         // default 12
  nonCompeteMiles?: number;          // default 25
  probationaryDays?: number;         // default 30
  noticeDays?: number;               // default 14
  initialCommissionPct?: number;     // default 35
};

export function renderContractorAgreement(ctx: AgreementContext): string {
  const business     = ctx.businessName ?? "Arise & Shine VT";
  const govState     = ctx.governingState ?? "Vermont";
  const nonSolMonths = ctx.nonSolicitationMonths ?? 24;
  const nonCompMonths= ctx.nonCompeteMonths ?? 12;
  const nonCompMiles = ctx.nonCompeteMiles ?? 25;
  const probDays     = ctx.probationaryDays ?? 30;
  const noticeDays   = ctx.noticeDays ?? 14;
  const startPct     = ctx.initialCommissionPct ?? 35;
  const escName      = escapeHtml(ctx.contractorLegalName);
  const escEmail     = escapeHtml(ctx.contractorEmail);
  const escEffDate   = escapeHtml(ctx.effectiveDate);
  const escBusiness  = escapeHtml(business);
  const escAddress   = escapeHtml(ctx.businessAddress ?? "");

  return `
<article class="contractor-agreement">

  <!-- ── Header ───────────────────────────────────────────────────────── -->
  <header style="text-align:center; margin-bottom:24px;">
    <h1 style="font-size:18px; font-weight:900; letter-spacing:0.04em; text-transform:uppercase;">
      Independent Contractor Agreement
    </h1>
    <p style="font-size:11px; color:#666; margin-top:4px;">
      Template ${CONTRACT_VERSION} · Effective ${escEffDate}
    </p>
  </header>

  <!-- ── Disclaimer banner (visible to the contractor too) ─────────────── -->
  <aside style="background:#fff8e1; border:1px solid #ffc107; border-radius:8px; padding:12px 14px; margin-bottom:20px; font-size:12px; color:#7a5300;">
    <strong>Important.</strong> This Agreement governs an
    <strong>independent contractor</strong> relationship — not employment.
    You are responsible for your own taxes, insurance, equipment, and
    expenses. You will receive an IRS Form 1099-NEC at the end of each
    tax year you earn $600 or more. Read this document fully before
    signing; signing creates a binding contract under ${escapeHtml(govState)} law.
  </aside>

  <p style="font-size:13px; line-height:1.65; margin-bottom:18px;">
    This Independent Contractor Agreement (the "<strong>Agreement</strong>")
    is entered into as of <strong>${escEffDate}</strong> (the
    "<strong>Effective Date</strong>") between <strong>${escBusiness}</strong>${escAddress ? `, located at ${escAddress}` : ""}
    ("<strong>Company</strong>") and <strong>${escName}</strong>
    (${escEmail || "contractor"}) ("<strong>Contractor</strong>"). Company and
    Contractor are each a "<strong>Party</strong>" and together the
    "<strong>Parties</strong>".
  </p>

  ${section("1. Independent Contractor Status",
    `<p>Contractor is engaged as an independent contractor, not as an employee, agent, partner, or joint venturer of Company. Nothing in this Agreement creates an employment, partnership, or agency relationship. Contractor:</p>
     <ul>
       <li>Is solely responsible for paying all federal, state, and local income, self-employment, and other taxes on Contractor's compensation;</li>
       <li>Is not eligible for and waives any claim to employee benefits, including but not limited to health insurance, paid time off, unemployment insurance, workers' compensation, or retirement contributions provided by Company;</li>
       <li>Will receive IRS Form 1099-NEC from Company for each tax year in which Contractor's earnings reach the reporting threshold; and</li>
       <li>Has the right to provide similar services to other parties, provided doing so does not violate Section 9 (Confidentiality), Section 10 (Non-Solicitation), or Section 11 (Limited Non-Competition).</li>
     </ul>`)}

  ${section("2. Scope of Work and Right to Refuse Assignments",
    `<p>Contractor will perform mobile vehicle, boat, and recreational-vehicle detailing services on assignments offered by Company through Company's scheduling system. Contractor retains the right to accept or refuse any individual assignment without penalty, subject to the daily-cap and availability windows Contractor has set in the system. Company does not guarantee any minimum volume of assignments.</p>`)}

  ${section("3. Compensation",
    `<p>Company will compensate Contractor on a commission basis equal to a percentage of the gross amount Company collects from the customer for each completed assignment Contractor performs (the "<strong>Commission</strong>"). The starting Commission rate is <strong>${startPct}%</strong>. Company may, at its sole discretion, promote Contractor to a higher tier based on completed-job count, average customer rating, and other performance factors; promotions are not automatic and may be granted or withheld at Company's discretion. Tips received from customers belong 100% to Contractor and pass through to Contractor without Company deduction (less any payment-processor fees, which are disclosed in the system).</p>
     <p>Commission is calculated after the assignment is marked Complete and the required photo set has been approved by Company. Company may adjust the Commission upward (for example, to reflect a customer tip) or downward (for example, to reflect a documented quality issue or a customer refund), provided that any downward adjustment is accompanied by a written reason recorded in the system. Contractor agrees that Company's adjusted Commission, once final, is the full compensation owed for that assignment.</p>`)}

  ${section("4. Equipment, Supplies, and Expenses",
    `<p>Contractor will provide, at Contractor's sole expense, all equipment, supplies, vehicles, and other resources necessary to perform the work, including but not limited to: cleaning products, pressure washer, vacuum, transportation to and from job sites, fuel, mobile phone, and personal protective equipment. Company will not reimburse Contractor for any business expense unless agreed in writing in advance.</p>`)}

  ${section("5. Insurance",
    `<p>Before performing any assignment, and continuously throughout this Agreement, Contractor will maintain at Contractor's sole expense:</p>
     <ul>
       <li>Commercial general liability insurance with limits not less than $1,000,000 per occurrence and $2,000,000 aggregate;</li>
       <li>Commercial auto liability insurance covering any vehicle used to travel to or from job sites, with limits not less than $1,000,000 combined single limit; and</li>
       <li>Coverage for care, custody, and control of customer vehicles or property where applicable.</li>
     </ul>
     <p>Contractor will name Company as an additional insured on the general-liability policy and will provide Company a current certificate of insurance. Lapse of coverage will result in immediate suspension of assignments until proof of coverage is restored.</p>`)}

  ${section("6. Liability for Damage to Customer Property",
    `<p><strong>Contractor is solely responsible for any damage to a customer's vehicle, property, or person caused by Contractor's negligence, error, or willful misconduct while performing an assignment.</strong> Contractor will report any such damage or incident to Company within twenty-four (24) hours of occurrence. Contractor will cooperate with Company's investigation and will use Contractor's own insurance as the first source of payment for any claim. Company is not liable for any damage caused by Contractor, and Contractor will indemnify and hold Company harmless from any third-party claim arising from the same (see Section 19).</p>`)}

  ${section("7. Quality Standards and Photo Documentation",
    `<p>Contractor will follow all quality procedures published by Company, including but not limited to:</p>
     <ul>
       <li>Performing a pre-existing-damage walk-around and photographing any prior scratches, dents, stains, or defects before beginning the assignment;</li>
       <li>Uploading the required before- and after-photo set specified for each service type prior to marking the assignment Complete;</li>
       <li>Maintaining professional appearance and conduct on the customer's property; and</li>
       <li>Completing the assignment within the time window estimated for the service.</li>
     </ul>
     <p>Repeated failure to meet these standards may result in Commission reductions, tier demotion, or termination of this Agreement under Section 17.</p>`)}

  ${section("8. Communication with Customers",
    `<p>All communication with Company's customers regarding scheduling, pricing, payments, or service issues must occur through Company's authorized channels. Contractor will not:</p>
     <ul>
       <li>Provide Contractor's personal phone number, email address, or social-media handle to a Company customer for purposes related to the work;</li>
       <li>Accept cash, check, or other direct payment from a Company customer outside the payment link Company provides;</li>
       <li>Solicit reviews, ratings, or feedback for Contractor personally rather than for Company; or</li>
       <li>Offer side services to a Company customer on terms that bypass Company's pricing or scheduling.</li>
     </ul>
     <p>Tips remain the property of Contractor regardless of payment channel.</p>`)}

  ${section("9. Confidentiality",
    `<p>"<strong>Confidential Information</strong>" means all non-public information Contractor receives or learns through this engagement, including but not limited to: customer lists, customer contact information, customer vehicle and service history, pricing structures, supplier relationships, marketing strategies, photographs taken on the job, training methods, and any other information Company designates as confidential or that a reasonable person would understand to be confidential. Contractor will hold Confidential Information in strict confidence, use it solely to perform assignments for Company, and not disclose it to any third party. This obligation survives termination of this Agreement indefinitely with respect to trade secrets and for five (5) years with respect to all other Confidential Information.</p>`)}

  ${section(`10. Non-Solicitation of Customers (${nonSolMonths} months post-termination)`,
    `<p>During this Agreement and for <strong>${nonSolMonths} months</strong> following its termination for any reason, Contractor will not, directly or indirectly:</p>
     <ul>
       <li>Solicit, contact, or accept business from any customer that Contractor learned of, was introduced to, or serviced through Company;</li>
       <li>Encourage any Company customer to terminate, reduce, or alter that customer's relationship with Company; or</li>
       <li>Use Company's customer list, contact data, or service history for any purpose other than performing assignments for Company.</li>
     </ul>
     <p>Contractor acknowledges that Company's customer relationships are among Company's most valuable assets and that this restriction is reasonable in scope and duration.</p>`)}

  ${section(`11. Limited Non-Competition (${nonCompMonths} months / ${nonCompMiles} miles)`,
    `<p>During this Agreement and for <strong>${nonCompMonths} months</strong> following its termination, Contractor will not, within a <strong>${nonCompMiles}-mile</strong> radius of Company's principal place of business, own, manage, operate, or be employed by a competing mobile-detailing business that serves residential or commercial customers in the same geographic area Company serves.</p>
     <p>The Parties intend this restriction to be enforced to the maximum extent permitted by ${escapeHtml(govState)} law. If a court of competent jurisdiction finds any portion of this restriction unenforceable, the Parties direct the court to modify the restriction so that it is enforceable to the greatest extent the court considers reasonable.</p>
     <p><em>Plain-language note: Vermont restricts non-competition agreements. This clause may be partly or fully unenforceable as drafted and should be reviewed by a Vermont attorney before relying on it.</em></p>`)}

  ${section("12. Background Check and Driving Record",
    `<p>Contractor authorizes Company to obtain a background check and motor-vehicle-record check at any time during this Agreement, and to repeat such checks annually. Contractor will disclose any criminal charge or conviction occurring during the term of this Agreement within three (3) business days of the event. Failure to disclose, or a result that Company in good faith determines disqualifies Contractor from servicing customers, is grounds for immediate termination under Section 17.</p>`)}

  ${section("13. Sober and Drug-Free Workplace",
    `<p>Contractor will not be under the influence of alcohol, illegal drugs, or any substance that impairs Contractor's ability to safely perform the assignment while on a job site or operating a vehicle for Company-related work. Company may, with reasonable suspicion, require Contractor to submit to a drug or alcohol test at Company's expense.</p>`)}

  ${section("14. Ownership of Work Product and Photographs",
    `<p>All photographs Contractor takes during an assignment using Company's system or in the course of work for Company are <strong>the sole property of Company</strong>. Company may use, reproduce, publish, and license such photographs for any purpose, including marketing, without further compensation to Contractor. Contractor will not post, share, or distribute job-site photographs on any personal account or external platform.</p>`)}

  ${section("15. No Solicited Personal Reviews",
    `<p>All customer ratings and reviews for work performed for Company belong to Company. Contractor will not solicit, redirect, or accept personal reviews from Company customers and will not link any review platform to Contractor personally.</p>`)}

  ${section(`16. Probationary Period (${probDays} days)`,
    `<p>The first <strong>${probDays} days</strong> following the Effective Date are a probationary period. During the probationary period, either Party may terminate this Agreement for any reason or no reason, without prior notice. Sections 9, 10, 11, 14, 19, and 21 survive any such termination.</p>`)}

  ${section(`17. Termination`,
    `<p><strong>For convenience.</strong> After the probationary period, either Party may terminate this Agreement upon <strong>${noticeDays} days</strong> prior written notice (email is sufficient).</p>
     <p><strong>For cause, immediate.</strong> Company may terminate this Agreement immediately, without notice, for any of the following:</p>
     <ul>
       <li>Theft, fraud, dishonesty, or material breach of this Agreement;</li>
       <li>Customer safety concerns, including unprofessional or threatening behavior;</li>
       <li>Violation of Section 12 (background or driving) or Section 13 (drugs/alcohol);</li>
       <li>Repeated or serious quality issues (low customer ratings, damage incidents, no-shows);</li>
       <li>Lapse of required insurance; or</li>
       <li>Loss of Contractor's driver's license or legal right to perform the work.</li>
     </ul>
     <p>Upon termination, Contractor's access to Company's systems will be revoked. Company will pay any earned but unpaid Commission less any documented offsets within thirty (30) days of termination.</p>`)}

  ${section("18. Mandatory Incident and Damage Reporting",
    `<p>Contractor will report to Company, within twenty-four (24) hours of occurrence, any of the following: damage to a customer's vehicle or property; customer complaint or refusal of service; injury to any person on a job site; accident involving a vehicle used for Company-related work; loss of equipment or supplies; or any law-enforcement contact related to the work. Failure to report is a material breach.</p>`)}

  ${section("19. Indemnification",
    `<p>Contractor will indemnify, defend, and hold harmless Company, its owners, officers, employees, and affiliates from and against any and all claims, demands, losses, costs, expenses, damages, and liabilities (including reasonable attorneys' fees) arising out of or relating to: (a) Contractor's performance or non-performance of any assignment; (b) Contractor's negligence, error, or willful misconduct; (c) any damage to a customer's vehicle or property caused by Contractor; (d) any third-party claim brought by a customer Contractor serviced; (e) Contractor's failure to maintain required insurance; or (f) Contractor's breach of this Agreement.</p>`)}

  ${section("20. Limitation of Liability",
    `<p>Except for Contractor's indemnification obligations under Section 19 and either Party's confidentiality obligations under Section 9, neither Party will be liable to the other for indirect, incidental, special, consequential, exemplary, or punitive damages, or for lost profits or lost business opportunity. Company's total aggregate liability to Contractor arising from this Agreement is capped at the total earned but unpaid Commission owed to Contractor at the time the claim accrues.</p>`)}

  ${section("21. Dispute Resolution",
    `<p>Any dispute arising out of or relating to this Agreement will first be addressed in good faith between the Parties for thirty (30) days. If unresolved, the dispute will be finally settled by binding arbitration administered by JAMS under its Streamlined Arbitration Rules, with arbitration to take place in ${escapeHtml(govState)}. Judgment on the award may be entered in any court of competent jurisdiction. The prevailing Party is entitled to recover reasonable attorneys' fees and costs. Notwithstanding the foregoing, either Party may seek injunctive relief from a court of competent jurisdiction to enforce Sections 9, 10, 11, or 14.</p>`)}

  ${section("22. Governing Law",
    `<p>This Agreement is governed by and construed in accordance with the laws of the State of ${escapeHtml(govState)}, without regard to its conflict-of-laws principles.</p>`)}

  ${section("23. Miscellaneous",
    `<p><strong>Severability.</strong> If any provision of this Agreement is held unenforceable, the remaining provisions remain in full force and effect.</p>
     <p><strong>Entire Agreement.</strong> This Agreement is the entire agreement between the Parties regarding its subject matter and supersedes all prior or contemporaneous communications.</p>
     <p><strong>Modification.</strong> No modification of this Agreement is effective unless in writing and signed by both Parties (electronic acceptance via Company's system satisfies the writing requirement).</p>
     <p><strong>Assignment.</strong> Contractor may not assign this Agreement without Company's prior written consent. Company may assign this Agreement in connection with a sale or transfer of its business.</p>
     <p><strong>Notices.</strong> Notices to Contractor are delivered to the email address Contractor has on file with Company. Notices to Company are delivered to Company's customer-service email address.</p>
     <p><strong>Survival.</strong> Sections 6, 9, 10, 11, 14, 15, 19, 20, 21, and 22 survive termination of this Agreement.</p>`)}

  ${section("24. Electronic Signature and Acknowledgment",
    `<p>Contractor acknowledges that Contractor has read, understood, and had the opportunity to consult independent legal counsel regarding this Agreement before signing. Contractor agrees that electronic acceptance — typing Contractor's full legal name in the signature field below, clicking the agreement checkbox, and submitting the signing form — constitutes Contractor's electronic signature under the federal Electronic Signatures in Global and National Commerce Act (E-SIGN) and ${escapeHtml(govState)}'s Uniform Electronic Transactions Act (UETA), and is legally binding to the same extent as a handwritten signature.</p>
     <p>Company will retain a timestamped copy of this Agreement and the signing event, including the IP address and user-agent string of the device used to sign, as evidence of acceptance.</p>`)}

  <!-- ── Signature block ──────────────────────────────────────────────── -->
  <section style="margin-top:32px; padding-top:20px; border-top:2px solid #111;">
    <p style="font-size:12px; color:#444; margin-bottom:8px;">
      <strong>Contractor:</strong> ${escName}<br/>
      <strong>Effective Date:</strong> ${escEffDate}<br/>
      <strong>Agreement Version:</strong> ${CONTRACT_VERSION}
    </p>
    <p style="font-size:11px; color:#777; line-height:1.55;">
      By typing your full legal name and clicking the sign button on the next
      screen, you confirm that you have read this Agreement, agree to all of
      its terms, and intend your typed name to be your electronic signature.
    </p>
  </section>

</article>
`.trim();
}

function section(heading: string, bodyHtml: string): string {
  return `
  <section style="margin-bottom:18px;">
    <h2 style="font-size:13px; font-weight:800; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:6px; color:#111;">${escapeHtml(heading)}</h2>
    <div style="font-size:13px; line-height:1.65; color:#222;">${bodyHtml}</div>
  </section>`;
}

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
