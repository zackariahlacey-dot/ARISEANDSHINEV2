"use client";

import { useEffect } from "react";

type Meta = {
  docKind: string;
  version: string;
  signedName: string;
  signedAt: string;
  signedIp: string | null;
  signedUa: string | null;
  contractorEmail: string | null;
};

const DOC_TITLES: Record<string, string> = {
  payment:      "Payment & Tax Terms",
  restrictions: "Conduct & Restrictions",
  liability:    "Liability & Damage",
  master:       "Independent Contractor Agreement",
};

/**
 * Read-only printable view of a signed contractor agreement. Renders the
 * snapshotted HTML on a clean white sheet with a footer carrying the
 * signature metadata (who signed, when, from what IP / browser).
 *
 * Workflow: the owner hits this page, clicks the "Print" button, and uses
 * the browser's "Save as PDF" option in the print dialog. Adds an
 * @page CSS rule so the result prints at letter size with reasonable
 * margins.
 */
export function AgreementPrintShell({ agreementHtml, meta }: { agreementHtml: string; meta: Meta }) {
  // Inject print CSS so the toolbar disappears + the document stretches
  // edge-to-edge when printing.
  useEffect(() => {
    const style = document.createElement("style");
    style.id = "agreement-print-css";
    style.textContent = `
      @page { size: letter; margin: 0.75in; }
      @media print {
        body { background: #fff !important; }
        .no-print { display: none !important; }
        .print-sheet { box-shadow: none !important; border: none !important; }
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.getElementById("agreement-print-css")?.remove();
    };
  }, []);

  const docTitle = DOC_TITLES[meta.docKind] ?? "Contractor Agreement";

  return (
    <div className="min-h-screen bg-zinc-200 py-8 px-4">
      {/* Toolbar (hidden when printing) */}
      <div className="no-print max-w-3xl mx-auto mb-4 flex items-center justify-between gap-3">
        <a
          href="/admin/contractors"
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-300 text-xs font-bold hover:bg-zinc-800"
        >
          ← Back to Contractors
        </a>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-500 text-black text-xs font-black uppercase tracking-wider hover:bg-amber-400 transition-colors"
        >
          Print / Save as PDF
        </button>
      </div>

      {/* Printable sheet */}
      <div className="print-sheet max-w-3xl mx-auto bg-white text-zinc-900 px-10 py-10 rounded shadow-xl border border-zinc-300" style={{ fontFamily: "ui-serif, Georgia, serif" }}>
        {/* Header — visible both on screen and in print */}
        <div className="text-center pb-6 mb-6 border-b-2 border-zinc-900">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 mb-1">Arise & Shine VT</p>
          <h1 className="text-xl font-black uppercase tracking-wider">{docTitle}</h1>
          <p className="text-[11px] text-zinc-600 mt-1">
            Template {meta.version}
            <span className="mx-2">·</span>
            Signed {new Date(meta.signedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>

        {/* Body: the snapshotted HTML the contractor signed */}
        <div dangerouslySetInnerHTML={{ __html: agreementHtml }} />

        {/* Signature metadata block */}
        <div className="mt-10 pt-6 border-t-2 border-zinc-900">
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-500 mb-3">Signature Record</p>
          <table className="w-full text-[12px]">
            <tbody>
              <tr><td className="py-1 pr-4 text-zinc-600 align-top w-40">Signed by</td><td className="py-1 font-bold text-zinc-900">{meta.signedName}</td></tr>
              {meta.contractorEmail && (
                <tr><td className="py-1 pr-4 text-zinc-600 align-top">Email on file</td><td className="py-1 text-zinc-900">{meta.contractorEmail}</td></tr>
              )}
              <tr><td className="py-1 pr-4 text-zinc-600 align-top">Signed at</td><td className="py-1 text-zinc-900 tabular-nums">{new Date(meta.signedAt).toLocaleString()}</td></tr>
              {meta.signedIp && (
                <tr><td className="py-1 pr-4 text-zinc-600 align-top">IP address</td><td className="py-1 font-mono text-zinc-700">{meta.signedIp}</td></tr>
              )}
              {meta.signedUa && (
                <tr><td className="py-1 pr-4 text-zinc-600 align-top">Browser</td><td className="py-1 font-mono text-[10px] text-zinc-700 break-all">{meta.signedUa}</td></tr>
              )}
              <tr><td className="py-1 pr-4 text-zinc-600 align-top">Document version</td><td className="py-1 text-zinc-900">{meta.version}</td></tr>
            </tbody>
          </table>
          <p className="mt-5 text-[10px] text-zinc-500 leading-relaxed">
            Electronic signature recorded under the federal Electronic Signatures in Global and National Commerce Act (E-SIGN) and Vermont's Uniform Electronic Transactions Act (UETA). The contractor named above typed their full legal name into the signature field on Arise &amp; Shine's contractor portal and submitted the signing form, indicating intent to be bound by the terms above. This record is retained as evidence of acceptance.
          </p>
        </div>
      </div>
    </div>
  );
}
