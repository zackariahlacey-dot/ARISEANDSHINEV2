"use client";

import { useMemo, useState } from "react";
import { Loader2, Check, AlertTriangle } from "lucide-react";
import { renderContractorAgreement } from "@/lib/contractorAgreement";
import { signContractorAgreement } from "@/app/actions/contractorOnboarding";

/**
 * Renders the full Independent Contractor Agreement in a scrollable viewer
 * and gates the "Sign Electronically" button behind:
 *
 *   1. The customer has scrolled to the bottom (so we know they've at
 *      least loaded the entire document on screen).
 *   2. They've checked the "I have read and agree" box.
 *   3. They've typed a name that's at least 2 characters.
 *
 * On submit, the server action snapshots the rendered HTML and captures
 * IP + user-agent. We don't re-render the agreement client-side after
 * signing — the server does the canonical render so any client-side
 * tampering can't change what's stored.
 */
export function AgreementSign({
  contractorName,
  contractorEmail,
  onSigned,
}: {
  contractorName: string;
  contractorEmail: string;
  onSigned: () => void;
}) {
  const [readChecked, setReadChecked] = useState(false);
  const [typedName, setTypedName]     = useState("");
  const [scrolledToEnd, setScrolledToEnd] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signedAt, setSignedAt] = useState<string | null>(null);

  // Preview HTML — exactly what the server will snapshot, so the contractor
  // sees the same document they're signing.
  const previewHtml = useMemo(() => renderContractorAgreement({
    contractorLegalName: contractorName || "[Your legal name]",
    contractorEmail:     contractorEmail || "",
    effectiveDate:       new Date().toISOString().slice(0, 10),
  }), [contractorName, contractorEmail]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 60) {
      setScrolledToEnd(true);
    }
  };

  const canSubmit = readChecked && scrolledToEnd && typedName.trim().length >= 2 && !submitting;

  const handleSign = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    const result = await signContractorAgreement(typedName.trim());
    setSubmitting(false);
    if (!("ok" in result) || !result.ok) {
      setError(("error" in result && result.error) || "Something went wrong. Try again.");
      return;
    }
    setSignedAt(result.signedAt);
    setTimeout(() => onSigned(), 600);
  };

  if (signedAt) {
    return (
      <div className="pt-4 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500/15 border border-emerald-500/40 mb-3">
          <Check size={22} className="text-emerald-400" strokeWidth={3} />
        </div>
        <p className="text-sm font-black text-emerald-300">Agreement signed</p>
        <p className="text-[11px] text-zinc-500 mt-1">
          {new Date(signedAt).toLocaleString()}
        </p>
      </div>
    );
  }

  return (
    <div className="pt-4 space-y-4">

      {/* Disclaimer banner — visible above the document */}
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/[0.06] px-3 py-2.5 flex items-start gap-2">
        <AlertTriangle size={14} className="text-amber-400 shrink-0 mt-0.5" />
        <p className="text-[11px] text-amber-200/90 leading-snug">
          This is a legally binding contract. Read every clause carefully — once you sign, it governs every assignment you accept through us.
        </p>
      </div>

      {/* Scrollable agreement viewer */}
      <div
        onScroll={handleScroll}
        className="max-h-[55vh] overflow-y-auto rounded-xl border border-white/[0.08] bg-white text-zinc-900 px-5 py-5 shadow-inner"
        dangerouslySetInnerHTML={{ __html: previewHtml }}
      />

      {!scrolledToEnd && (
        <p className="text-[11px] text-zinc-500 text-center -mt-2">
          ↑ Scroll to the end of the agreement to enable signing.
        </p>
      )}

      {/* Read-and-agree checkbox */}
      <label className={`flex items-start gap-2.5 px-3 py-3 rounded-xl border cursor-pointer transition-colors ${
        readChecked
          ? "border-[#D4AF37]/40 bg-[#D4AF37]/[0.06]"
          : "border-white/[0.08] bg-zinc-900/40 hover:border-white/[0.15]"
      } ${!scrolledToEnd ? "opacity-50 cursor-not-allowed" : ""}`}>
        <input
          type="checkbox"
          checked={readChecked}
          disabled={!scrolledToEnd}
          onChange={(e) => setReadChecked(e.target.checked)}
          className="mt-0.5 accent-[#D4AF37] w-4 h-4 shrink-0"
        />
        <span className="text-[12px] leading-snug text-zinc-300">
          I have read the Independent Contractor Agreement in full, understand its contents (including the non-solicitation, non-compete, indemnification, and damage-liability provisions), and agree to be bound by all of its terms.
        </span>
      </label>

      {/* Typed signature */}
      <div>
        <label className="block text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500 mb-1.5">
          Type your full legal name (this is your signature)
        </label>
        <input
          type="text"
          value={typedName}
          disabled={!readChecked}
          onChange={(e) => setTypedName(e.target.value)}
          placeholder={contractorName || "First Middle Last"}
          autoComplete="off"
          spellCheck={false}
          className="w-full bg-white text-zinc-900 border border-white/[0.08] rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/40 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ fontFamily: "'Dancing Script', 'Brush Script MT', cursive", fontSize: typedName ? "20px" : "14px" }}
        />
        <p className="text-[10px] text-zinc-600 mt-1.5">
          By submitting, you electronically sign the Agreement and we record your IP address and browser identifier as evidence of acceptance.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/[0.06] px-3 py-2.5">
          <p className="text-[12px] text-rose-300">{error}</p>
        </div>
      )}

      <button
        type="button"
        onClick={handleSign}
        disabled={!canSubmit}
        className={`w-full inline-flex items-center justify-center gap-2 py-3.5 rounded-xl font-black text-sm uppercase tracking-wider transition-all active:scale-[0.97] ${
          canSubmit
            ? "bg-gradient-to-r from-[#D4AF37] to-[#F0D060] text-black shadow-[0_4px_14px_rgba(212,175,55,0.3)]"
            : "bg-zinc-800 text-zinc-600 cursor-not-allowed"
        }`}
      >
        {submitting ? <><Loader2 size={15} className="animate-spin" /> Recording signature…</>
          : <>Sign Electronically · {new Date().toLocaleDateString()}</>}
      </button>
    </div>
  );
}
