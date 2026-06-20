"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, FileText, Lock, ShieldCheck, ChevronRight, DollarSign, BanIcon, AlertOctagon } from "lucide-react";
import { SiteHeader } from "@/components/landing/SiteHeader";
import { AgreementSign } from "@/components/contractor/AgreementSign";
import { DOC_DEFINITIONS, type DocKind } from "@/lib/contractorAgreement";
import type { OnboardingStatus } from "@/app/actions/contractorOnboarding";

const ICONS: Record<DocKind, typeof DollarSign> = {
  payment:      DollarSign,
  restrictions: BanIcon,
  liability:    AlertOctagon,
};

export function OnboardingShell({ initialStatus }: { initialStatus: OnboardingStatus }) {
  const router = useRouter();
  const signedKinds = new Set(initialStatus.signedDocs.map(d => d.kind));

  // Default-open step = first unsigned doc; closed if all signed.
  const firstUnsigned = DOC_DEFINITIONS.find(d => !signedKinds.has(d.kind))?.kind ?? null;
  const [openStep, setOpenStep] = useState<DocKind | null>(firstUnsigned);

  const fullName = [initialStatus.profile.firstName, initialStatus.profile.lastName].filter(Boolean).join(" ").trim();
  const firstName = initialStatus.profile.firstName.trim() || "there";

  const signedCount = initialStatus.signedDocs.length;
  const total = DOC_DEFINITIONS.length;
  const progressPct = (signedCount / total) * 100;
  const allDone = signedCount === total;

  const stepStateClasses = (done: boolean, locked: boolean) =>
    done
      ? "border-emerald-500/40 bg-emerald-500/[0.06]"
      : locked
        ? "border-white/[0.06] bg-zinc-900/30 opacity-60"
        : "border-[#D4AF37]/40 bg-[#D4AF37]/[0.05]";

  // The three documents are sequential — you must sign the previous one
  // before opening the next. Keeps the contractor focused and means a half-
  // finished onboarding has a clear "next" doc.
  const isStepLocked = (idx: number) => {
    if (idx === 0) return false;
    const prev = DOC_DEFINITIONS[idx - 1];
    return !signedKinds.has(prev.kind);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <SiteHeader />
      <div className="max-w-2xl mx-auto px-4 pt-28 pb-20">

        <div className="mb-6">
          <p className="text-[10px] font-black tracking-[0.22em] uppercase text-[#D4AF37]/70 mb-1">Contractor Onboarding</p>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Welcome, {firstName}.</h1>
          <p className="text-sm text-zinc-400 mt-2 leading-relaxed">
            Before you can pick up jobs, we need you to read and electronically sign three short documents — how you get paid, what you can&apos;t do, and what you&apos;re responsible for. Takes about 10 minutes total.
          </p>
        </div>

        {/* Progress card */}
        <div className="mb-6 rounded-2xl border border-white/[0.06] bg-gradient-to-br from-zinc-900 to-zinc-950 p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Progress</p>
            <p className="text-[11px] font-bold text-zinc-300 tabular-nums">
              {signedCount} / {total} signed
            </p>
          </div>
          <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${progressPct}%`,
                background: "linear-gradient(90deg, #92700a, #D4AF37, #F3E5AB)",
              }}
            />
          </div>
        </div>

        {DOC_DEFINITIONS.map((doc, idx) => {
          const signed = signedKinds.has(doc.kind);
          const locked = !signed && isStepLocked(idx);
          const isOpen = openStep === doc.kind;
          const Icon = ICONS[doc.kind];
          const signedRecord = initialStatus.signedDocs.find(d => d.kind === doc.kind);

          return (
            <div key={doc.kind} className={`rounded-2xl border ${stepStateClasses(signed, locked)} overflow-hidden mb-3`}>
              <button
                type="button"
                disabled={locked}
                onClick={() => setOpenStep(isOpen ? null : doc.kind)}
                className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left disabled:cursor-not-allowed"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${
                    signed ? "bg-emerald-500/15"
                      : locked ? "bg-zinc-800/40"
                      : "bg-[#D4AF37]/15"
                  }`}>
                    {signed
                      ? <Check size={16} className="text-emerald-400" strokeWidth={3} />
                      : locked
                        ? <Lock size={14} className="text-zinc-600" />
                        : <Icon size={16} className="text-[#D4AF37]" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-black">
                      Step {idx + 1} · {doc.title}
                    </p>
                    <p className={`text-[11px] mt-0.5 ${
                      signed ? "text-emerald-400"
                        : locked ? "text-zinc-600"
                        : "text-zinc-500"
                    }`}>
                      {signed && signedRecord
                        ? `Signed ${new Date(signedRecord.signedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} as "${signedRecord.signedName}"`
                        : locked
                          ? "Complete the previous step first"
                          : doc.blurb}
                    </p>
                  </div>
                </div>
                {!locked && (
                  <ChevronRight size={16} className={`shrink-0 transition-transform ${isOpen ? "rotate-90" : ""} text-zinc-600`} />
                )}
              </button>
              {isOpen && !locked && (
                <div className="px-4 pb-4 border-t border-white/[0.05]">
                  {signed ? (
                    <div className="pt-4 text-[11px] text-zinc-400">
                      Your signed copy of this document is on file. If you need to review it, contact Arise And Shine Detailing and we&apos;ll send you the exact text you agreed to.
                    </div>
                  ) : (
                    <AgreementSign
                      kind={doc.kind}
                      contractorName={fullName}
                      contractorEmail={initialStatus.profile.email}
                      onSigned={() => router.refresh()}
                    />
                  )}
                </div>
              )}
            </div>
          );
        })}

        {allDone && (
          <div className="mt-6 rounded-2xl border border-emerald-500/40 bg-emerald-500/[0.08] px-4 py-5 text-center">
            <ShieldCheck size={28} className="mx-auto text-emerald-400 mb-2" />
            <p className="text-base font-black text-emerald-300">All three documents signed.</p>
            <p className="text-[11px] text-emerald-200/80 mt-1 max-w-md mx-auto leading-relaxed">
              Your onboarding is complete. Arise And Shine Detailing will activate your account and assignments will start appearing here.
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
