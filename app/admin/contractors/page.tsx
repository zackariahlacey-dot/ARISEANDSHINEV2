"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  HardHat, UserPlus, Search, X, Mail, Phone, Star, ChevronRight, Loader2,
  ShieldCheck, AlertTriangle, PauseCircle, PlayCircle, FileText, ClipboardList,
  TrendingUp, Save, Eye, Sparkles, Check,
} from "lucide-react";
import {
  listContractors, inviteContractor, getContractorDetail, getSignedAgreementHtml,
  setContractorTier, setContractorStatus, setContractorDailyCap, setContractorNotes,
  type ContractorSummary, type ContractorDetail,
} from "@/app/actions/contractorAdminActions";
import { DEFAULT_TIER_LADDER } from "@/lib/contractorAgreement";
import { useToast } from "@/components/admin/Toast";
import { Modal } from "@/components/admin/Modal";
import { SubNav, PEOPLE_SUBNAV } from "@/components/admin/SubNav";
import { PayrollPanel } from "@/components/admin/PayrollPanel";
import { cn } from "@/lib/utils";

type StatusFilter = "all" | "pending" | "active" | "paused" | "terminated";

export default function ContractorsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showInvite, setShowInvite] = useState(false);

  const { data: contractors = [], isLoading } = useQuery({
    queryKey: ["contractors"],
    queryFn: listContractors,
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return (contractors as ContractorSummary[]).filter(c => {
      if (filter !== "all" && c.employmentStatus !== filter) return false;
      if (!q) return true;
      const name = `${c.firstName} ${c.lastName}`.toLowerCase();
      return name.includes(q) || c.email.toLowerCase().includes(q) || c.phone.includes(q);
    });
  }, [contractors, filter, search]);

  const counts = useMemo(() => {
    const cs = contractors as ContractorSummary[];
    return {
      all:        cs.length,
      pending:    cs.filter(c => c.employmentStatus === "pending").length,
      active:     cs.filter(c => c.employmentStatus === "active").length,
      paused:     cs.filter(c => c.employmentStatus === "paused").length,
      terminated: cs.filter(c => c.employmentStatus === "terminated").length,
    };
  }, [contractors]);

  // Contractors who finished onboarding (all 3 docs signed) but admin hasn't
  // flipped them to Active yet. Surfaced as a one-tap banner so they don't
  // get stuck in pending limbo after doing their part.
  const readyToActivate = useMemo(
    () => (contractors as ContractorSummary[]).filter(
      c => c.employmentStatus === "pending" && c.fullyOnboarded,
    ),
    [contractors],
  );

  return (
    <div className="px-4 pt-4 pb-6 max-w-3xl mx-auto space-y-4">

      {/* Header */}
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-600 mb-1">People</p>
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <HardHat size={18} className="text-amber-500" />
            <h1 className="text-xl font-black">Contractors</h1>
          </div>
          <button
            onClick={() => setShowInvite(true)}
            className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-black uppercase tracking-wider px-3 py-2 rounded-xl hover:bg-amber-500/20 transition-all active:scale-95"
          >
            <UserPlus size={13} /> Invite
          </button>
        </div>
        <SubNav items={PEOPLE_SUBNAV} />
      </div>

      {/* Ready-to-activate banner */}
      {readyToActivate.length > 0 && (
        <ActivationBanner
          contractors={readyToActivate}
          onActivated={() => qc.invalidateQueries({ queryKey: ["contractors"] })}
        />
      )}

      {/* Search */}
      <div className="relative">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, email, phone…"
          className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-8 pr-3 py-2.5 text-sm text-white placeholder:text-zinc-700 focus:outline-none focus:border-amber-500/50"
        />
        {search && (
          <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-white">
            <X size={13} />
          </button>
        )}
      </div>

      {/* Filter pills */}
      <div className="flex gap-1.5 overflow-x-auto scrollbar-hide -mx-4 px-4">
        {([
          { id: "all",        label: "All",        count: counts.all },
          { id: "pending",    label: "Pending",    count: counts.pending },
          { id: "active",     label: "Active",     count: counts.active },
          { id: "paused",     label: "Paused",     count: counts.paused },
          { id: "terminated", label: "Terminated", count: counts.terminated },
        ] as const).map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={cn(
              "shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap",
              filter === f.id
                ? "border-amber-500/50 bg-amber-500/15 text-amber-300"
                : "border-white/[0.08] text-zinc-500 hover:text-zinc-200"
            )}
          >
            {f.label}
            <span className={cn(
              "inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[9px] font-black tabular-nums",
              filter === f.id ? "bg-amber-500 text-black" : "bg-zinc-800 text-zinc-400"
            )}>{f.count}</span>
          </button>
        ))}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-amber-500" size={24} /></div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/[0.06] p-10 text-center">
          <HardHat size={28} className="mx-auto text-zinc-700 mb-3" />
          <p className="text-sm font-semibold text-zinc-500">No contractors {filter !== "all" && `in "${filter}"`}</p>
          <p className="text-[11px] text-zinc-700 mt-1">Tap Invite to add your first contractor.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(c => (
            <ContractorRow key={c.id} c={c} onOpen={() => setActiveId(c.id)} />
          ))}
        </div>
      )}

      {/* Modals */}
      {showInvite && (
        <InviteModal
          onClose={() => setShowInvite(false)}
          onInvited={() => { qc.invalidateQueries({ queryKey: ["contractors"] }); setShowInvite(false); }}
        />
      )}
      {activeId && (
        <ContractorDrawer
          contractorId={activeId}
          onClose={() => setActiveId(null)}
          onAnyChange={() => qc.invalidateQueries({ queryKey: ["contractors"] })}
        />
      )}
    </div>
  );
}

// ─── Row ──────────────────────────────────────────────────────────────────────

function ContractorRow({ c, onOpen }: { c: ContractorSummary; onOpen: () => void }) {
  const statusClass = c.employmentStatus === "active"     ? "border-emerald-500/30 bg-emerald-500/[0.05]"
                    : c.employmentStatus === "paused"     ? "border-amber-500/30 bg-amber-500/[0.05]"
                    : c.employmentStatus === "terminated" ? "border-rose-500/20 bg-rose-500/[0.04] opacity-60"
                    : "border-white/[0.06] bg-zinc-900/40";
  const statusBadge = c.employmentStatus === "active"     ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                    : c.employmentStatus === "paused"     ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                    : c.employmentStatus === "terminated" ? "bg-rose-500/15 text-rose-400 border-rose-500/30"
                    : "bg-zinc-800 text-zinc-400 border-white/[0.06]";

  return (
    <button
      onClick={onOpen}
      className={cn("w-full text-left rounded-2xl border p-3 transition-all hover:border-amber-500/40 active:scale-[0.99]", statusClass)}
    >
      <div className="flex items-start gap-3">
        <div className="shrink-0 w-10 h-10 rounded-xl bg-zinc-800 border border-white/[0.04] flex items-center justify-center text-[11px] font-black uppercase text-amber-400">
          {(c.firstName[0] ?? "").toUpperCase()}{(c.lastName[0] ?? "").toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <p className="text-sm font-black text-white truncate">{c.firstName} {c.lastName}</p>
            <span className={cn("px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border", statusBadge)}>
              {c.employmentStatus}
            </span>
          </div>
          <p className="text-[11px] text-zinc-500 truncate">{c.email}</p>
          <div className="flex items-center gap-3 mt-1.5 text-[10px] text-zinc-500">
            <span className="inline-flex items-center gap-1">
              <ShieldCheck size={10} className={c.fullyOnboarded ? "text-emerald-400" : "text-zinc-600"} />
              {c.signedDocsCount}/3 signed
            </span>
            <span className="text-zinc-700">·</span>
            <span className="inline-flex items-center gap-1">
              <TrendingUp size={10} className="text-amber-400" />
              T{c.commissionTier} · {c.commissionPct}%
            </span>
            {c.ratingCount > 0 && (
              <>
                <span className="text-zinc-700">·</span>
                <span className="inline-flex items-center gap-1">
                  <Star size={10} className="text-amber-400 fill-amber-400" />
                  {(c.ratingOverallAvg ?? 0).toFixed(1)} <span className="text-zinc-600">({c.ratingCount})</span>
                </span>
              </>
            )}
          </div>
        </div>
        <ChevronRight size={14} className="shrink-0 text-zinc-600 mt-1" />
      </div>
    </button>
  );
}

// ─── Invite modal ─────────────────────────────────────────────────────────────

function InviteModal({ onClose, onInvited }: { onClose: () => void; onInvited: () => void }) {
  const { toast } = useToast();
  const [firstName, setFirstName] = useState("");
  const [lastName,  setLastName]  = useState("");
  const [email,     setEmail]     = useState("");
  const [phone,     setPhone]     = useState("");
  const [error,     setError]     = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = !!firstName.trim() && !!email.trim() && !submitting;

  const handleInvite = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    const result = await inviteContractor({
      email: email.trim(),
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: phone.trim() || undefined,
    });
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error ?? "Could not invite.");
      return;
    }
    toast("Invite sent! 📧");
    onInvited();
  };

  return (
    <Modal open onClose={onClose}>
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-black flex items-center gap-2"><UserPlus size={16} className="text-amber-500" /> Invite contractor</h2>
          <p className="text-[11px] text-zinc-500 mt-1">They'll receive an email to set their password, then land on the onboarding screen to sign their three documents.</p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <FieldLabel>First name</FieldLabel>
          <FieldLabel>Last name</FieldLabel>
          <Input value={firstName} onChange={setFirstName} placeholder="Mike" />
          <Input value={lastName}  onChange={setLastName}  placeholder="Smith" />
        </div>
        <div>
          <FieldLabel>Email</FieldLabel>
          <Input value={email} onChange={setEmail} placeholder="mike@example.com" type="email" />
        </div>
        <div>
          <FieldLabel>Phone (optional)</FieldLabel>
          <Input value={phone} onChange={setPhone} placeholder="(802) 555-0100" type="tel" />
        </div>

        {error && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/[0.06] px-3 py-2.5">
            <p className="text-[11px] text-rose-300">{error}</p>
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-white/[0.08] text-zinc-400 text-xs font-black uppercase tracking-wider">Cancel</button>
          <button
            onClick={handleInvite}
            disabled={!canSubmit}
            className={cn("flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all active:scale-95 flex items-center justify-center gap-1.5",
              canSubmit ? "bg-amber-500 text-black" : "bg-zinc-800 text-zinc-600 cursor-not-allowed"
            )}
          >
            {submitting ? <Loader2 className="animate-spin" size={13} /> : <UserPlus size={13} />}
            Send invite
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Contractor drawer ────────────────────────────────────────────────────────

function ContractorDrawer({
  contractorId,
  onClose,
  onAnyChange,
}: {
  contractorId: string;
  onClose: () => void;
  onAnyChange: () => void;
}) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: detail, isLoading, refetch } = useQuery({
    queryKey: ["contractor", contractorId],
    queryFn: () => getContractorDetail(contractorId),
  });

  const [viewingAgreementId, setViewingAgreementId] = useState<string | null>(null);
  const [notesValue, setNotesValue] = useState("");
  const [editingNotes, setEditingNotes] = useState(false);

  const refresh = () => { refetch(); onAnyChange(); };

  if (isLoading || !detail) {
    return (
      <Modal open onClose={onClose}>
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-amber-500" size={24} /></div>
      </Modal>
    );
  }

  const d = detail as ContractorDetail;

  return (
    <>
      <Modal open onClose={onClose}>
        <div className="space-y-4">

          {/* Header */}
          <div className="flex items-start gap-3 pb-3 border-b border-white/[0.05]">
            <div className="shrink-0 w-11 h-11 rounded-xl bg-zinc-800 border border-white/[0.04] flex items-center justify-center text-xs font-black uppercase text-amber-400">
              {(d.firstName[0] ?? "").toUpperCase()}{(d.lastName[0] ?? "").toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-base font-black text-white">{d.firstName} {d.lastName}</p>
              <p className="text-[11px] text-zinc-500">{d.email}</p>
              {d.phone && (
                <a href={`tel:${d.phone}`} className="inline-flex items-center gap-1 text-[11px] text-amber-400 mt-0.5 hover:underline">
                  <Phone size={10} /> {d.phone}
                </a>
              )}
            </div>
          </div>

          {/* Status + tier */}
          <StatusBlock detail={d} onChange={refresh} />

          {/* Payroll / pay-period report */}
          <PayrollPanel contractorId={d.id} />

          {/* Documents */}
          <section>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500 mb-2">Signed documents</p>
            <div className="space-y-1.5">
              {(["payment", "restrictions", "liability"] as const).map(kind => {
                const signed = d.signedDocs.find(s => s.docKind === kind);
                return (
                  <div key={kind} className={cn(
                    "rounded-xl border px-3 py-2.5 flex items-center justify-between",
                    signed ? "border-emerald-500/25 bg-emerald-500/[0.04]" : "border-white/[0.06] bg-zinc-900/30"
                  )}>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-zinc-200">
                        {kind === "payment" ? "Payment & Tax Terms"
                          : kind === "restrictions" ? "Conduct & Restrictions"
                          : "Liability & Damage"}
                      </p>
                      {signed ? (
                        <p className="text-[10px] text-emerald-400 mt-0.5">
                          Signed {new Date(signed.signedAt).toLocaleDateString()} as &ldquo;{signed.signedName}&rdquo;
                        </p>
                      ) : (
                        <p className="text-[10px] text-zinc-600 mt-0.5">Not yet signed</p>
                      )}
                    </div>
                    {signed && (
                      <button
                        onClick={() => setViewingAgreementId(signed.agreementId)}
                        className="shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-white/[0.08] text-[10px] font-bold text-zinc-300 hover:bg-white/[0.04]"
                      >
                        <Eye size={11} /> View
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* Admin notes */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">Admin notes</p>
              {!editingNotes && (
                <button onClick={() => { setNotesValue(d.adminNotes ?? ""); setEditingNotes(true); }} className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">Edit</button>
              )}
            </div>
            {editingNotes ? (
              <div className="space-y-2">
                <textarea
                  value={notesValue}
                  onChange={e => setNotesValue(e.target.value)}
                  rows={3}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500/50 resize-none"
                  placeholder="Private notes about this contractor…"
                />
                <div className="flex gap-2">
                  <button onClick={() => setEditingNotes(false)} className="flex-1 py-2 rounded-xl border border-white/[0.08] text-zinc-400 text-[10px] font-black uppercase">Cancel</button>
                  <button
                    onClick={async () => {
                      const r = await setContractorNotes(contractorId, notesValue);
                      if (r.ok) { toast("Notes saved"); setEditingNotes(false); refresh(); }
                      else toast(r.error ?? "Save failed");
                    }}
                    className="flex-1 py-2 rounded-xl bg-amber-500 text-black text-[10px] font-black uppercase flex items-center justify-center gap-1"
                  >
                    <Save size={11} /> Save
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-[12px] text-zinc-400 leading-relaxed whitespace-pre-line">{d.adminNotes ?? <span className="text-zinc-700 italic">No notes yet.</span>}</p>
            )}
          </section>

          {/* Audit log */}
          {d.recentAuditLog.length > 0 && (
            <section>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500 mb-2">Recent activity</p>
              <ul className="space-y-1">
                {d.recentAuditLog.slice(0, 8).map(a => (
                  <li key={a.id} className="flex items-center justify-between gap-2 text-[10px] text-zinc-500">
                    <span className="truncate">{a.action.replace(/_/g, " ")}</span>
                    <span className="shrink-0 text-zinc-700 tabular-nums">{new Date(a.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

        </div>
      </Modal>

      {/* Agreement viewer modal */}
      {viewingAgreementId && (
        <AgreementViewerModal
          agreementId={viewingAgreementId}
          onClose={() => setViewingAgreementId(null)}
        />
      )}
    </>
  );
}

// ─── Status / tier / cap controls ─────────────────────────────────────────────

function StatusBlock({ detail, onChange }: { detail: ContractorDetail; onChange: () => void }) {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const [editingCap, setEditingCap] = useState(false);
  const [capValue, setCapValue] = useState(String(detail.dailyJobCap));
  const [editingTier, setEditingTier] = useState(false);

  const setStatus = async (status: "active" | "paused" | "terminated") => {
    if (status === "terminated" && !window.confirm("Terminate this contractor? They will lose dashboard access.")) return;
    setBusy(true);
    const r = await setContractorStatus(detail.id, status);
    setBusy(false);
    if (r.ok) { toast(`Status → ${status}`); onChange(); }
    else toast(r.error ?? "Update failed");
  };

  const promoteToTier = async (tier: number, pct: number) => {
    setBusy(true);
    const r = await setContractorTier(detail.id, tier, pct);
    setBusy(false);
    if (r.ok) { toast(`Promoted to Tier ${tier} (${pct}%)`); setEditingTier(false); onChange(); }
    else toast(r.error ?? "Update failed");
  };

  return (
    <section className="rounded-2xl border border-white/[0.06] bg-zinc-900/40 p-3 space-y-3">
      {/* Tier ladder */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">Commission tier</p>
          <button onClick={() => setEditingTier(v => !v)} className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">
            {editingTier ? "Cancel" : "Promote"}
          </button>
        </div>
        <div className="grid grid-cols-5 gap-1.5">
          {DEFAULT_TIER_LADDER.map(t => {
            const isCurrent = detail.commissionTier === t.tier;
            const eligible = t.tier === 1 || (detail.completedJobsCount >= t.minJobs && (t.minRating === null || (detail.ratingOverallAvg ?? 0) >= t.minRating));
            return (
              <button
                key={t.tier}
                disabled={!editingTier || busy || isCurrent}
                onClick={() => promoteToTier(t.tier, t.pct)}
                className={cn(
                  "rounded-xl border px-2 py-2 text-center transition-all",
                  isCurrent ? "border-amber-500 bg-amber-500/15"
                    : editingTier && eligible ? "border-emerald-500/30 hover:bg-emerald-500/10"
                    : editingTier ? "border-white/[0.06] opacity-50"
                    : "border-white/[0.06] opacity-70"
                )}
              >
                <p className={cn("text-[9px] font-black uppercase tracking-wider", isCurrent ? "text-amber-400" : eligible ? "text-emerald-400" : "text-zinc-500")}>T{t.tier}</p>
                <p className={cn("text-sm font-black tabular-nums", isCurrent ? "text-white" : "text-zinc-300")}>{t.pct}%</p>
                <p className="text-[8px] text-zinc-600 leading-tight mt-0.5">
                  {t.tier === 1 ? "start" : t.minJobs > 0 ? `${t.minJobs} jobs · ${t.minRating}★` : "manual"}
                </p>
              </button>
            );
          })}
        </div>
        {editingTier && (
          <p className="text-[10px] text-zinc-600 mt-2 text-center">
            Tap any tier to promote. Eligibility ({detail.completedJobsCount} jobs · {(detail.ratingOverallAvg ?? 0).toFixed(1)}★) is a guide — promotion is always your call.
          </p>
        )}
      </div>

      {/* Daily cap */}
      <div className="flex items-center justify-between pt-2 border-t border-white/[0.04]">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">Daily job cap</p>
          {!editingCap ? (
            <p className="text-sm font-bold text-zinc-200 mt-0.5">{detail.dailyJobCap} jobs/day max</p>
          ) : (
            <div className="flex items-center gap-2 mt-1">
              <input
                type="number"
                value={capValue}
                onChange={e => setCapValue(e.target.value)}
                min="0"
                max="20"
                className="w-16 bg-white/[0.04] border border-white/[0.08] rounded-lg px-2 py-1 text-sm text-white focus:outline-none focus:border-amber-500/50"
              />
              <button
                onClick={async () => {
                  const cap = parseInt(capValue, 10);
                  if (isNaN(cap)) return;
                  const r = await setContractorDailyCap(detail.id, cap);
                  if (r.ok) { toast(`Cap → ${cap}/day`); setEditingCap(false); onChange(); }
                  else toast(r.error ?? "Update failed");
                }}
                className="px-2 py-1 rounded-lg bg-amber-500 text-black text-[10px] font-black uppercase"
              >Save</button>
            </div>
          )}
        </div>
        {!editingCap && (
          <button onClick={() => setEditingCap(true)} className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">Edit</button>
        )}
      </div>

      {/* Status controls */}
      <div className="pt-2 border-t border-white/[0.04]">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500 mb-2">Status</p>
        <div className="grid grid-cols-3 gap-1.5">
          <button
            disabled={busy || detail.employmentStatus === "active"}
            onClick={() => setStatus("active")}
            className={cn(
              "py-2 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1",
              detail.employmentStatus === "active" ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-400" : "border-white/[0.08] text-zinc-400 hover:border-emerald-500/30"
            )}
          ><PlayCircle size={11} /> Active</button>
          <button
            disabled={busy || detail.employmentStatus === "paused"}
            onClick={() => setStatus("paused")}
            className={cn(
              "py-2 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1",
              detail.employmentStatus === "paused" ? "border-amber-500/40 bg-amber-500/15 text-amber-400" : "border-white/[0.08] text-zinc-400 hover:border-amber-500/30"
            )}
          ><PauseCircle size={11} /> Pause</button>
          <button
            disabled={busy || detail.employmentStatus === "terminated"}
            onClick={() => setStatus("terminated")}
            className={cn(
              "py-2 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1",
              detail.employmentStatus === "terminated" ? "border-rose-500/40 bg-rose-500/15 text-rose-400" : "border-white/[0.08] text-zinc-400 hover:border-rose-500/30"
            )}
          ><AlertTriangle size={11} /> Terminate</button>
        </div>
      </div>
    </section>
  );
}

// ─── Agreement viewer modal ───────────────────────────────────────────────────

function AgreementViewerModal({ agreementId, onClose }: { agreementId: string; onClose: () => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ["agreement-html", agreementId],
    queryFn: () => getSignedAgreementHtml(agreementId),
  });
  return (
    <Modal open onClose={onClose}>
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-black flex items-center gap-2"><FileText size={14} className="text-amber-500" /> Signed document</p>
        </div>
        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="animate-spin text-amber-500" size={20} /></div>
        ) : data?.ok && data.html ? (
          <div className="max-h-[65vh] overflow-y-auto rounded-xl border border-white/[0.08] bg-white text-zinc-900 px-4 py-4" dangerouslySetInnerHTML={{ __html: data.html }} />
        ) : (
          <p className="text-xs text-rose-400">{data?.error ?? "Could not load agreement."}</p>
        )}
      </div>
    </Modal>
  );
}

// ─── Field primitives ─────────────────────────────────────────────────────────

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="text-[9px] font-black uppercase tracking-widest text-zinc-500 block mb-1">{children}</label>;
}

function Input({ value, onChange, placeholder, type = "text" }: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-zinc-700 focus:outline-none focus:border-amber-500/50"
    />
  );
}

// ─── Activation banner ────────────────────────────────────────────────────────

function ActivationBanner({
  contractors,
  onActivated,
}: {
  contractors: ContractorSummary[];
  onActivated: () => void;
}) {
  const { toast } = useToast();
  const [busy, setBusy] = useState<string | null>(null);

  const handleActivate = async (id: string, name: string) => {
    setBusy(id);
    const r = await setContractorStatus(id, "active");
    setBusy(null);
    if (!r.ok) { toast(r.error ?? "Failed"); return; }
    toast(`${name} activated 🎉`);
    onActivated();
  };

  return (
    <div className="rounded-2xl border border-emerald-500/40 bg-gradient-to-br from-emerald-500/[0.12] via-emerald-500/[0.04] to-transparent p-3">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
          <Sparkles size={13} className="text-emerald-400" />
        </div>
        <div className="min-w-0">
          <p className="text-[12px] font-black text-emerald-300">
            {contractors.length === 1
              ? "1 contractor finished onboarding"
              : `${contractors.length} contractors finished onboarding`}
          </p>
          <p className="text-[10px] text-emerald-200/70">
            All 3 documents signed — flip them to active to start receiving job assignments.
          </p>
        </div>
      </div>
      <div className="space-y-1.5">
        {contractors.map(c => {
          const name = `${c.firstName} ${c.lastName}`.trim() || "(no name)";
          const isBusy = busy === c.id;
          return (
            <div
              key={c.id}
              className="flex items-center gap-2 px-2.5 py-2 rounded-xl bg-zinc-900/40 border border-white/[0.04]"
            >
              <div className="w-7 h-7 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-[10px] font-black text-amber-400 shrink-0">
                {(c.firstName[0] ?? "").toUpperCase()}{(c.lastName[0] ?? "").toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-bold text-zinc-200 truncate">{name}</p>
                <p className="text-[10px] text-zinc-500 truncate">{c.email}</p>
              </div>
              <button
                onClick={() => handleActivate(c.id, name)}
                disabled={isBusy}
                className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-500 text-black text-[10px] font-black uppercase tracking-wider disabled:opacity-60 active:scale-95 transition-transform"
              >
                {isBusy ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} strokeWidth={3} />}
                Activate
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
