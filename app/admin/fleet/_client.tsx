"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Building2, Truck, Phone, Mail, MapPin, Calendar, Sparkles,
  ChevronLeft, CheckCircle, X, Plus, Trash2, Crown, ArrowLeft,
} from "lucide-react";
import { updateFleetInquiry, type FleetInquiryRow, type FleetInquiryStatus } from "@/app/actions/adminFleetActions";

const STATUS_PILLS: Record<FleetInquiryStatus, { label: string; bg: string; border: string; text: string }> = {
  pending:   { label: "Pending",   bg: "bg-amber-500/10",   border: "border-amber-500/40",   text: "text-amber-300"   },
  accepted:  { label: "Accepted",  bg: "bg-cyan-500/10",    border: "border-cyan-500/40",    text: "text-cyan-300"    },
  scheduled: { label: "Scheduled", bg: "bg-emerald-500/10", border: "border-emerald-500/40", text: "text-emerald-300" },
  declined:  { label: "Declined",  bg: "bg-zinc-500/10",    border: "border-zinc-500/40",    text: "text-zinc-400"    },
};

const STATUS_FILTERS: ("all" | FleetInquiryStatus)[] = ["all", "pending", "accepted", "scheduled", "declined"];

export function FleetInquiryAdminClient({ initialInquiries }: { initialInquiries: FleetInquiryRow[] }) {
  const [inquiries, setInquiries] = useState(initialInquiries);
  const [filter, setFilter]       = useState<"all" | FleetInquiryStatus>("pending");
  const [selected, setSelected]   = useState<FleetInquiryRow | null>(null);

  const filtered = filter === "all" ? inquiries : inquiries.filter(i => i.status === filter);
  const counts = STATUS_FILTERS.reduce<Record<string, number>>((acc, k) => {
    acc[k] = k === "all" ? inquiries.length : inquiries.filter(i => i.status === k).length;
    return acc;
  }, {});

  const handleUpdate = async (id: string, patch: { status?: FleetInquiryStatus; scheduledDates?: string[]; adminNotes?: string }) => {
    const res = await updateFleetInquiry({ id, ...patch });
    if (!res.ok) return res;
    setInquiries(prev => prev.map(i => i.id === id
      ? {
          ...i,
          ...(patch.status         != null && { status:         patch.status         }),
          ...(patch.scheduledDates != null && { scheduledDates: patch.scheduledDates }),
          ...(patch.adminNotes     != null && { adminNotes:     patch.adminNotes     }),
        }
      : i
    ));
    if (selected?.id === id) {
      setSelected(prev => prev ? {
        ...prev,
        ...(patch.status         != null && { status:         patch.status         }),
        ...(patch.scheduledDates != null && { scheduledDates: patch.scheduledDates }),
        ...(patch.adminNotes     != null && { adminNotes:     patch.adminNotes     }),
      } : prev);
    }
    return res;
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white pb-12">
      <div className="border-b border-white/[0.06] bg-zinc-950/95 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/admin" className="text-zinc-500 hover:text-white shrink-0">
              <ArrowLeft size={16} />
            </Link>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#D4AF37]">Admin</p>
              <h1 className="text-lg font-black text-white truncate flex items-center gap-2">
                <Building2 size={16} className="text-[#D4AF37]" />
                Fleet Inquiries
              </h1>
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[10px] uppercase tracking-widest text-zinc-500">Total</p>
            <p className="text-xl font-black text-white tabular-nums">{inquiries.length}</p>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-5">
        {/* Status filter pills */}
        <div className="flex items-center gap-2 mb-5 overflow-x-auto pb-1">
          {STATUS_FILTERS.map(s => {
            const isActive = filter === s;
            const label = s === "all" ? "All" : STATUS_PILLS[s].label;
            return (
              <button
                key={s}
                type="button"
                onClick={() => setFilter(s)}
                className={`shrink-0 px-3 py-1.5 rounded-full border text-xs font-bold transition-all ${
                  isActive
                    ? "border-[#D4AF37]/60 bg-[#D4AF37]/[0.1] text-[#D4AF37]"
                    : "border-white/[0.07] bg-zinc-900/40 text-zinc-400 hover:border-white/15"
                }`}
              >
                {label} <span className="text-zinc-600 ml-1 tabular-nums">{counts[s] ?? 0}</span>
              </button>
            );
          })}
        </div>

        {/* Inquiry list */}
        {filtered.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-white/[0.06] rounded-2xl bg-zinc-900/30">
            <Building2 size={32} className="text-zinc-700 mx-auto mb-3" />
            <p className="text-sm text-zinc-500">No fleet inquiries in this view.</p>
            <p className="text-[11px] text-zinc-600 mt-1">
              Customers can request quotes at <Link href="/fleet" className="text-[#D4AF37] hover:underline">/fleet</Link>.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(inq => (
              <InquiryCard key={inq.id} inquiry={inq} onOpen={() => setSelected(inq)} />
            ))}
          </div>
        )}
      </div>

      {/* Detail / action panel */}
      {selected && (
        <InquiryDetailModal
          inquiry={selected}
          onClose={() => setSelected(null)}
          onUpdate={handleUpdate}
        />
      )}
    </div>
  );
}

// ── Card ──────────────────────────────────────────────────────────────────────
function InquiryCard({ inquiry, onOpen }: { inquiry: FleetInquiryRow; onOpen: () => void }) {
  const pill = STATUS_PILLS[inquiry.status];
  const isUltimate = inquiry.serviceTier.includes("Ultimate");
  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full text-left rounded-2xl border border-white/[0.07] bg-zinc-900/40 hover:border-[#D4AF37]/30 hover:bg-zinc-900/60 transition-all p-4 sm:p-5"
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-wider ${pill.bg} ${pill.border} ${pill.text}`}>
              {pill.label}
            </span>
            <span className="text-[10px] text-zinc-600 uppercase tracking-widest">
              {formatRelative(inquiry.createdAt)}
            </span>
          </div>
          <p className="text-sm font-black text-white truncate">
            {inquiry.businessName ?? inquiry.contactName}
            {inquiry.businessName && <span className="text-zinc-500 font-medium"> — {inquiry.contactName}</span>}
          </p>
          <p className="text-[11px] text-zinc-500 mt-0.5 flex items-center gap-3 flex-wrap">
            <span className="inline-flex items-center gap-1"><Truck size={10} /> {inquiry.vehicleCount} vehicle{inquiry.vehicleCount === 1 ? "" : "s"}</span>
            <span className="inline-flex items-center gap-1">
              {isUltimate && <Crown size={10} className="text-[#D4AF37]" fill="currentColor" />}
              {inquiry.serviceTier}
            </span>
            {inquiry.fleetDiscountPct > 0 && (
              <span className="text-emerald-400 font-bold">{inquiry.fleetDiscountPct}% off</span>
            )}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-xl font-black text-[#D4AF37] tabular-nums">${inquiry.estimatedTotal.toLocaleString()}</p>
          <p className="text-[10px] text-zinc-600">est.</p>
        </div>
      </div>
      {inquiry.scheduledDates.length > 0 && (
        <div className="flex items-center gap-1.5 text-[11px] text-emerald-300 font-bold mt-2">
          <Calendar size={11} />
          {inquiry.scheduledDates.map(d => formatDateShort(d)).join(" · ")}
        </div>
      )}
    </button>
  );
}

// ── Detail Modal ───────────────────────────────────────────────────────────────
function InquiryDetailModal({
  inquiry, onClose, onUpdate,
}: {
  inquiry: FleetInquiryRow;
  onClose: () => void;
  onUpdate: (id: string, patch: { status?: FleetInquiryStatus; scheduledDates?: string[]; adminNotes?: string }) => Promise<{ ok: boolean; message?: string }>;
}) {
  const [dates, setDates] = useState(inquiry.scheduledDates);
  const [newDate, setNewDate] = useState("");
  const [adminNotes, setAdminNotes] = useState(inquiry.adminNotes ?? "");
  const [saving, setSaving] = useState(false);

  const pill = STATUS_PILLS[inquiry.status];

  const addDate = () => {
    if (!newDate || dates.includes(newDate)) return;
    setDates([...dates, newDate].sort());
    setNewDate("");
  };
  const removeDate = (d: string) => setDates(dates.filter(x => x !== d));

  const save = async (status?: FleetInquiryStatus) => {
    setSaving(true);
    await onUpdate(inquiry.id, {
      ...(status != null && { status }),
      scheduledDates: dates,
      adminNotes,
    });
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-2xl max-h-[92vh] overflow-y-auto bg-zinc-950 border border-white/[0.08] rounded-2xl shadow-2xl">
        <div className="sticky top-0 bg-zinc-950 px-5 sm:px-6 py-4 border-b border-white/[0.08] flex items-center justify-between z-10">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-wider ${pill.bg} ${pill.border} ${pill.text}`}>
                {pill.label}
              </span>
              <span className="text-[10px] text-zinc-600">{formatRelative(inquiry.createdAt)}</span>
            </div>
            <h2 className="text-lg font-black text-white truncate">
              {inquiry.businessName ?? inquiry.contactName}
            </h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/[0.06]">
            <X size={16} />
          </button>
        </div>

        <div className="px-5 sm:px-6 py-5 space-y-5">
          {/* Top summary */}
          <div className="grid grid-cols-3 gap-3">
            <SummaryStat label="Vehicles" value={String(inquiry.vehicleCount)} />
            <SummaryStat label="Service" value={inquiry.serviceTier.replace("Ultimate ", "Ult. ")} />
            <SummaryStat label="Total" value={`$${inquiry.estimatedTotal.toLocaleString()}`} accent />
          </div>

          {/* Contact */}
          <Section title="Contact">
            {inquiry.businessName && <Row icon={Building2} label="Business">{inquiry.businessName}</Row>}
            <Row icon={Mail} label="Email">
              <a href={`mailto:${inquiry.contactEmail}`} className="text-[#D4AF37] hover:underline">{inquiry.contactEmail}</a>
            </Row>
            <Row icon={Phone} label="Phone">
              <a href={`tel:${inquiry.contactPhone}`} className="text-[#D4AF37] hover:underline">{inquiry.contactPhone}</a>
            </Row>
            {inquiry.serviceAddress && (
              <Row icon={MapPin} label="Address">{inquiry.serviceAddress}</Row>
            )}
          </Section>

          {/* Vehicle mix */}
          <Section title="Vehicle Mix">
            <div className="grid grid-cols-3 gap-2">
              {([
                ["sedan", "Sedan / Coupe"],
                ["suv",   "SUV / Truck"],
                ["xl",    "3-Row / Work Van"],
              ] as const).map(([k, lbl]) => (
                <div key={k} className="rounded-xl border border-white/[0.06] bg-zinc-900/40 p-3 text-center">
                  <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1">{lbl}</p>
                  <p className="text-2xl font-black text-[#D4AF37] tabular-nums">
                    {inquiry.vehicleMix[k] ?? 0}
                  </p>
                </div>
              ))}
            </div>
            {inquiry.fleetDiscountPct > 0 && (
              <p className="text-[11px] text-emerald-300 font-bold mt-2 inline-flex items-center gap-1">
                <Sparkles size={11} /> Fleet discount: {inquiry.fleetDiscountPct}% off applied
              </p>
            )}
          </Section>

          {/* Customer notes */}
          {(inquiry.preferredWindow || inquiry.notes) && (
            <Section title="Customer Request">
              {inquiry.preferredWindow && (
                <Row icon={Calendar} label="Preferred timing">{inquiry.preferredWindow}</Row>
              )}
              {inquiry.notes && (
                <div className="rounded-xl border border-white/[0.06] bg-zinc-900/40 p-3 text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">
                  {inquiry.notes}
                </div>
              )}
            </Section>
          )}

          {/* Schedule */}
          <Section title="Scheduled Date(s)">
            {dates.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {dates.map(d => (
                  <span key={d} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-emerald-500/40 bg-emerald-500/[0.08] text-emerald-300 text-xs font-bold tabular-nums">
                    <Calendar size={11} />
                    {formatDateLong(d)}
                    <button type="button" onClick={() => removeDate(d)}
                      className="ml-1 text-emerald-300/60 hover:text-emerald-200"
                      aria-label="Remove date">
                      <Trash2 size={10} />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)}
                className="flex-1 bg-zinc-900/60 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#D4AF37]/50" />
              <button type="button" onClick={addDate} disabled={!newDate}
                className="inline-flex items-center gap-1 px-4 py-2.5 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/40 text-[#D4AF37] text-sm font-bold hover:bg-[#D4AF37]/20 disabled:opacity-40 disabled:cursor-not-allowed">
                <Plus size={13} /> Add
              </button>
            </div>
            <p className="text-[10px] text-zinc-600 mt-1.5">Multi-day fleets: add each date the team will be on site.</p>
          </Section>

          {/* Admin notes */}
          <Section title="Admin Notes (internal)">
            <textarea value={adminNotes} onChange={e => setAdminNotes(e.target.value)} rows={3}
              placeholder="Internal notes — not visible to the customer."
              className="w-full bg-zinc-900/60 border border-white/10 rounded-xl px-3.5 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#D4AF37]/50 resize-none" />
          </Section>
        </div>

        {/* Action footer */}
        <div className="sticky bottom-0 bg-zinc-950 border-t border-white/[0.08] px-5 sm:px-6 py-4 flex flex-wrap items-center gap-2 justify-end">
          <button type="button" onClick={() => save("declined")} disabled={saving}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-white/[0.07] text-zinc-400 text-xs font-bold hover:border-red-500/40 hover:text-red-300">
            Decline
          </button>
          <button type="button" onClick={() => save()} disabled={saving}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-white/[0.1] text-zinc-300 text-xs font-bold hover:border-white/[0.2]">
            Save
          </button>
          <button type="button" onClick={() => save("accepted")} disabled={saving}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-cyan-500/40 bg-cyan-500/[0.08] text-cyan-300 text-xs font-bold hover:bg-cyan-500/[0.15]">
            <CheckCircle size={12} /> Accept
          </button>
          <button type="button" onClick={() => save("scheduled")} disabled={saving || dates.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#D4AF37] text-black text-xs font-black hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed">
            <Calendar size={12} /> Mark Scheduled
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Small bits ────────────────────────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">{title}</p>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function Row({ icon: Icon, label, children }: { icon: React.ComponentType<{ size?: number; className?: string }>; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 text-sm">
      <Icon size={13} className="text-zinc-500 shrink-0 mt-0.5" />
      <div className="min-w-0 flex-1">
        <span className="text-[10px] uppercase tracking-widest text-zinc-600 mr-2">{label}</span>
        <span className="text-zinc-200">{children}</span>
      </div>
    </div>
  );
}

function SummaryStat({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-zinc-900/40 p-3 text-center">
      <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1">{label}</p>
      <p className={`text-base font-black tabular-nums truncate ${accent ? "text-[#D4AF37]" : "text-white"}`}>{value}</p>
    </div>
  );
}

// ── Formatters ────────────────────────────────────────────────────────────────
function formatRelative(iso: string): string {
  const d = new Date(iso).getTime();
  const now = Date.now();
  const diff = (now - d) / 1000;
  if (diff < 60)        return "just now";
  if (diff < 3600)      return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400)     return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatDateShort(d: string): string {
  return new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
function formatDateLong(d: string): string {
  return new Date(d + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}
