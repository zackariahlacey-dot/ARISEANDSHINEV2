"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  ArrowLeft, ClipboardList, Search, X, ChevronDown, ChevronRight,
  Loader2, User, Clock,
} from "lucide-react";
import { listAuditLog, listAuditActions, type AuditLogEntry } from "@/app/actions/adminAuditLog";
import { cn } from "@/lib/utils";

export default function AuditLogPage() {
  const [actionFilter, setActionFilter] = useState<string>("");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["audit-log", actionFilter],
    queryFn:  () => listAuditLog({ action: actionFilter || null, limit: 200 }),
  });
  const { data: actionList = [] } = useQuery({
    queryKey: ["audit-actions"],
    queryFn:  listAuditActions,
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return entries as AuditLogEntry[];
    return (entries as AuditLogEntry[]).filter(e =>
      e.action.toLowerCase().includes(q)
      || (e.adminName ?? "").toLowerCase().includes(q)
      || (e.adminEmail ?? "").toLowerCase().includes(q)
      || (e.targetTable ?? "").toLowerCase().includes(q)
      || (e.targetId ?? "").toLowerCase().includes(q)
      || JSON.stringify(e.payload ?? "").toLowerCase().includes(q)
    );
  }, [entries, search]);

  return (
    <div className="px-4 pt-4 pb-6 max-w-3xl mx-auto space-y-4">

      <div>
        <Link href="/admin/settings" className="inline-flex items-center gap-1 text-[11px] text-zinc-500 hover:text-amber-500 mb-2">
          <ArrowLeft size={11} /> Setup
        </Link>
        <div className="flex items-center gap-2 mb-2">
          <ClipboardList size={18} className="text-amber-500" />
          <h1 className="text-xl font-black">Audit log</h1>
          <span className="text-[10px] text-zinc-600 ml-1">{filtered.length} entr{filtered.length === 1 ? "y" : "ies"}</span>
        </div>
        <p className="text-[11px] text-zinc-500 max-w-md leading-relaxed">
          Every admin-side action — promotions, status changes, commission adjustments, photo approvals, manual reassignments, and contractor signing events — is recorded here with timestamp + IP for audit and dispute purposes.
        </p>
      </div>

      {/* Filters */}
      <div className="space-y-2">
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search action, admin name, target ID, payload…"
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-8 pr-3 py-2.5 text-sm text-white placeholder:text-zinc-700 focus:outline-none focus:border-amber-500/50"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-white">
              <X size={13} />
            </button>
          )}
        </div>

        <div className="relative">
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500/50 appearance-none"
          >
            <option value="">All actions ({actionList.length})</option>
            {actionList.map(a => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
          <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 pointer-events-none" />
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex justify-center py-10"><Loader2 className="animate-spin text-amber-500" size={20} /></div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/[0.06] px-4 py-10 text-center">
          <p className="text-[11px] text-zinc-600">No entries match the current filters.</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {filtered.map(e => {
            const isOpen = expandedId === e.id;
            const isReadable = humanReadableAction(e.action);
            return (
              <div
                key={e.id}
                className={cn(
                  "rounded-xl border transition-colors overflow-hidden",
                  isOpen ? "border-amber-500/40 bg-amber-500/[0.04]" : "border-white/[0.06] bg-zinc-900/40 hover:bg-zinc-900/60"
                )}
              >
                <button
                  type="button"
                  onClick={() => setExpandedId(isOpen ? null : e.id)}
                  className="w-full text-left px-3 py-2.5 flex items-center gap-3"
                >
                  <div className="shrink-0 w-8 h-8 rounded-lg bg-zinc-800 border border-white/[0.04] flex items-center justify-center">
                    <User size={13} className="text-amber-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-bold text-zinc-100 truncate">
                      {isReadable}
                    </p>
                    <div className="flex items-center gap-2 text-[10px] text-zinc-500 mt-0.5">
                      <span className="truncate">{e.adminName ?? e.adminEmail ?? "—"}</span>
                      <span className="text-zinc-700">·</span>
                      <span className="inline-flex items-center gap-1 shrink-0">
                        <Clock size={9} /> {new Date(e.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                      </span>
                    </div>
                  </div>
                  <ChevronRight size={13} className={cn("shrink-0 text-zinc-600 transition-transform", isOpen && "rotate-90")} />
                </button>
                {isOpen && (
                  <div className="px-3 pb-3 border-t border-white/[0.04] space-y-2 text-[11px]">
                    <DetailRow label="Action" value={<code className="text-amber-300 bg-amber-500/[0.08] px-1.5 py-0.5 rounded text-[11px]">{e.action}</code>} />
                    {e.targetTable && (
                      <DetailRow label="Target" value={<span className="text-zinc-300"><code className="text-zinc-400">{e.targetTable}</code>{e.targetId ? <span className="text-zinc-600"> · </span> : null}{e.targetId && <code className="text-zinc-500 break-all">{e.targetId}</code>}</span>} />
                    )}
                    {e.adminEmail && <DetailRow label="By" value={<span className="text-zinc-300">{e.adminName ? `${e.adminName} (${e.adminEmail})` : e.adminEmail}</span>} />}
                    {e.ipAddress && <DetailRow label="IP" value={<code className="text-zinc-500 text-[10px]">{e.ipAddress}</code>} />}
                    <DetailRow label="At" value={<span className="text-zinc-400 tabular-nums">{new Date(e.createdAt).toLocaleString()}</span>} />
                    {e.payload != null && typeof e.payload === "object" && Object.keys(e.payload as object).length > 0 && (
                      <div className="pt-1">
                        <p className="text-[9px] font-black uppercase tracking-widest text-zinc-600 mb-1">Payload</p>
                        <pre className="text-[10px] text-zinc-400 bg-black/40 border border-white/[0.04] rounded-lg p-2 overflow-x-auto whitespace-pre-wrap break-words">
{JSON.stringify(e.payload, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-[9px] font-black uppercase tracking-widest text-zinc-600 shrink-0 w-12">{label}</span>
      <span className="flex-1 min-w-0">{value}</span>
    </div>
  );
}

/**
 * Maps machine action names to friendlier English. Action strings that
 * aren't in the table are returned verbatim with underscores converted
 * to spaces so even un-mapped actions are still legible.
 */
function humanReadableAction(action: string): string {
  const map: Record<string, string> = {
    invite_contractor:                 "Invited a contractor",
    set_contractor_tier:               "Set contractor tier",
    contractor_active:                 "Activated contractor",
    contractor_paused:                 "Paused contractor",
    contractor_terminated:             "Terminated contractor",
    set_contractor_daily_cap:          "Adjusted contractor daily cap",
    update_contractor_notes:           "Updated contractor notes",
    contractor_signed_payment:         "Contractor signed Payment & Tax Terms",
    contractor_signed_restrictions:    "Contractor signed Conduct & Restrictions",
    contractor_signed_liability:       "Contractor signed Liability & Damage",
    contractor_signed_agreement:       "Contractor signed legacy master agreement",
    manually_assign_booking:           "Manually assigned a booking",
    unassign_booking:                  "Cleared booking assignment",
    contractor_accept_job:             "Contractor accepted job",
    contractor_on_my_way:              "Contractor marked on-my-way",
    contractor_arrived:                "Contractor marked arrived",
    contractor_start_job:              "Contractor started job",
    contractor_complete_job:           "Contractor completed job",
    contractor_report_issue:           "Contractor reported an issue",
    contractor_send_payment_link:      "Contractor sent payment link",
    approve_photos:                    "Approved job photos",
    reject_photos:                     "Rejected job photos",
    commission_bonus:                  "Added commission bonus",
    commission_reduction:              "Reduced commission",
    delete_job_photo:                  "Deleted a job photo",
    resend_payment_confirmation:       "Re-sent payment confirmation email",
  };
  return map[action] ?? action.replace(/_/g, " ");
}
