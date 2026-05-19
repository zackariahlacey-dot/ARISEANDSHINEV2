"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, FileText, Lock, ShieldCheck, ChevronRight, AlertTriangle } from "lucide-react";
import { SiteHeader } from "@/components/landing/SiteHeader";
import { AgreementSign } from "@/components/contractor/AgreementSign";
import type { OnboardingStatus } from "@/app/actions/contractorOnboarding";

const REQUIRED_DOC_TYPES = [
  { id: "w9",                       label: "W-9 Tax Form",                   note: "We need this on file to issue your 1099 at year end." },
  { id: "insurance",                label: "Insurance Certificate",          note: "General liability + commercial auto. Company must be named additional insured." },
  { id: "drivers_license",          label: "Driver's License",               note: "We verify your right to drive to job sites." },
  { id: "background_check_consent", label: "Background Check Consent",       note: "Required before your first assignment." },
  { id: "headshot",                 label: "Headshot",                       note: "Shown to customers so they know who's arriving." },
];

export function OnboardingShell({ initialStatus }: { initialStatus: OnboardingStatus }) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [openStep, setOpenStep] = useState<string | null>(
    initialStatus.agreement ? null : "agreement"
  );

  const docByType = new Map(status.documents.map(d => [d.docType, d]));
  const agreementDone = !!status.agreement;
  const docsDone = REQUIRED_DOC_TYPES.every(d => docByType.get(d.id)?.status === "approved");
  const allDone = agreementDone && docsDone;

  const firstName = status.profile.firstName.trim() || "there";

  const stepStateClasses = (done: boolean, locked: boolean) =>
    done
      ? "border-emerald-500/40 bg-emerald-500/[0.06]"
      : locked
        ? "border-white/[0.06] bg-zinc-900/30 opacity-60"
        : "border-[#D4AF37]/40 bg-[#D4AF37]/[0.05]";

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <SiteHeader />
      <div className="max-w-2xl mx-auto px-4 pt-28 pb-20">

        {/* Header */}
        <div className="mb-6">
          <p className="text-[10px] font-black tracking-[0.22em] uppercase text-[#D4AF37]/70 mb-1">Contractor Onboarding</p>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Welcome, {firstName}.</h1>
          <p className="text-sm text-zinc-400 mt-2 leading-relaxed">
            Before you can pick up jobs, we need to finish a few things — sign your contractor agreement and submit a handful of documents. This usually takes about 10 minutes.
          </p>
        </div>

        {/* Progress card */}
        <div className="mb-6 rounded-2xl border border-white/[0.06] bg-gradient-to-br from-zinc-900 to-zinc-950 p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Progress</p>
            <p className="text-[11px] font-bold text-zinc-300 tabular-nums">
              {[agreementDone, ...REQUIRED_DOC_TYPES.map(d => docByType.get(d.id)?.status === "approved")].filter(Boolean).length}
              {" / "}
              {1 + REQUIRED_DOC_TYPES.length} complete
            </p>
          </div>
          <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${(([agreementDone, ...REQUIRED_DOC_TYPES.map(d => docByType.get(d.id)?.status === "approved")].filter(Boolean).length) / (1 + REQUIRED_DOC_TYPES.length)) * 100}%`,
                background: "linear-gradient(90deg, #92700a, #D4AF37, #F3E5AB)",
              }}
            />
          </div>
        </div>

        {/* Step 1 — Agreement */}
        <div className={`rounded-2xl border ${stepStateClasses(agreementDone, false)} overflow-hidden mb-3`}>
          <button
            type="button"
            onClick={() => setOpenStep(openStep === "agreement" ? null : "agreement")}
            className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${
                agreementDone ? "bg-emerald-500/15" : "bg-[#D4AF37]/15"
              }`}>
                {agreementDone
                  ? <Check size={16} className="text-emerald-400" strokeWidth={3} />
                  : <FileText size={16} className="text-[#D4AF37]" />
                }
              </div>
              <div className="min-w-0">
                <p className="text-sm font-black">Step 1 · Sign Contractor Agreement</p>
                {agreementDone ? (
                  <p className="text-[11px] text-emerald-400 mt-0.5">
                    Signed {new Date(status.agreement!.signedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} as &ldquo;{status.agreement!.signedName}&rdquo;
                  </p>
                ) : (
                  <p className="text-[11px] text-zinc-500 mt-0.5">Required before you can submit any other documents.</p>
                )}
              </div>
            </div>
            <ChevronRight size={16} className={`shrink-0 transition-transform ${openStep === "agreement" ? "rotate-90" : ""} text-zinc-600`} />
          </button>
          {openStep === "agreement" && (
            <div className="px-4 pb-4 border-t border-white/[0.05]">
              {agreementDone ? (
                <div className="pt-4 text-[11px] text-zinc-400">
                  Your signed copy is on file. If you ever need to review the agreement, contact Arise &amp; Shine VT and we&apos;ll send you a copy.
                </div>
              ) : (
                <AgreementSign
                  contractorName={[status.profile.firstName, status.profile.lastName].filter(Boolean).join(" ").trim()}
                  contractorEmail={status.profile.email}
                  onSigned={() => router.refresh()}
                />
              )}
            </div>
          )}
        </div>

        {/* Steps 2-6 — Documents (placeholder until the upload commit lands) */}
        {REQUIRED_DOC_TYPES.map((doc, idx) => {
          const docStatus = docByType.get(doc.id);
          const done = docStatus?.status === "approved";
          const uploaded = docStatus?.status === "uploaded";
          const rejected = docStatus?.status === "rejected";
          const locked = !agreementDone;
          const isOpen = openStep === doc.id;
          return (
            <div key={doc.id} className={`rounded-2xl border ${stepStateClasses(done, locked)} overflow-hidden mb-3`}>
              <button
                type="button"
                disabled={locked}
                onClick={() => setOpenStep(isOpen ? null : doc.id)}
                className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left disabled:cursor-not-allowed"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${
                    done ? "bg-emerald-500/15" : rejected ? "bg-rose-500/15" : locked ? "bg-zinc-800/40" : "bg-[#D4AF37]/15"
                  }`}>
                    {done ? <Check size={16} className="text-emerald-400" strokeWidth={3} />
                      : rejected ? <AlertTriangle size={16} className="text-rose-400" />
                      : locked ? <Lock size={14} className="text-zinc-600" />
                      : <FileText size={16} className="text-[#D4AF37]" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-black">Step {idx + 2} · {doc.label}</p>
                    <p className={`text-[11px] mt-0.5 ${
                      done ? "text-emerald-400"
                        : rejected ? "text-rose-400"
                        : uploaded ? "text-amber-400"
                        : locked ? "text-zinc-600"
                        : "text-zinc-500"
                    }`}>
                      {done ? `Approved ${docStatus?.reviewedAt ? new Date(docStatus.reviewedAt).toLocaleDateString() : ""}`
                        : rejected ? `Rejected — ${docStatus?.reviewNotes ?? "see notes"}`
                        : uploaded ? "Uploaded — awaiting Arise & Shine review"
                        : locked ? "Sign the agreement first"
                        : doc.note}
                    </p>
                  </div>
                </div>
                {!locked && <ChevronRight size={16} className={`shrink-0 transition-transform ${isOpen ? "rotate-90" : ""} text-zinc-600`} />}
              </button>
              {isOpen && !locked && (
                <div className="px-4 pb-4 border-t border-white/[0.05] pt-4">
                  <div className="rounded-xl border border-dashed border-white/[0.08] bg-zinc-900/40 px-4 py-6 text-center">
                    <p className="text-xs text-zinc-500 leading-relaxed">
                      Document upload UI for <strong className="text-zinc-300">{doc.label}</strong> ships in the next update. For now, email your file to <a href="mailto:contact@ariseandshinevt.com" className="text-[#D4AF37] hover:underline">contact@ariseandshinevt.com</a> and we&apos;ll mark it received.
                    </p>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* All done banner */}
        {allDone && (
          <div className="mt-6 rounded-2xl border border-emerald-500/40 bg-emerald-500/[0.08] px-4 py-5 text-center">
            <ShieldCheck size={28} className="mx-auto text-emerald-400 mb-2" />
            <p className="text-base font-black text-emerald-300">You&apos;re all set!</p>
            <p className="text-[11px] text-emerald-200/80 mt-1">
              Your account is fully onboarded. Jobs will start appearing on your dashboard.
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
