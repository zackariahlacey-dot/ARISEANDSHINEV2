"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Phone, Navigation, Check, Camera, AlertOctagon, ChevronRight,
  Loader2, X, ShieldCheck, Clock, Car, DollarSign, MessageSquare, Plus,
} from "lucide-react";
import { SiteHeader } from "@/components/landing/SiteHeader";
import {
  startOnMyWay, markArrived, startJob, completeJob, reportIssue, acceptJob,
} from "@/app/actions/jobLifecycle";
import { uploadJobPhoto } from "@/app/actions/jobPhotoActions";
import { sendContractorPaymentLink, type PaymentLinkChannel } from "@/app/actions/contractorPaymentLink";
import { slotLabel, type PhotoRequirement, type PhotoChecklist } from "@/lib/jobPhotos";
import type { JobPhoto } from "@/app/actions/jobPhotoActions";
import { cn } from "@/lib/utils";

type Booking = {
  id: string;
  booking_date: string;
  booking_time: string | null;
  service_name: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  customer_email?: string | null;
  service_address: string | null;
  vehicle_year: string | null;
  vehicle_make: string | null;
  vehicle_model: string | null;
  vehicle_size: string | null;
  total_price: number | null;
  addons_json: any;
  additional_vehicles_json: any;
  status: string | null;
  accepted_at: string | null;
  on_my_way_at: string | null;
  arrived_at: string | null;
  started_at: string | null;
  job_completed_at: string | null;
  photo_review_status: string | null;
  base_commission_cents: number | null;
  tip_cents: number | null;
  notes: string | null;
  payment_link_sent_at?: string | null;
  payment_link_method?: string | null;
};

function to12h(t: string | null): string {
  if (!t) return "";
  const [h, m] = t.split(":");
  const hh = parseInt(h, 10);
  if (isNaN(hh)) return t;
  return `${hh % 12 || 12}:${m ?? "00"} ${hh >= 12 ? "PM" : "AM"}`;
}

function fmtDate(d: string): string {
  try {
    return new Date(d + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  } catch { return d; }
}

export function JobExecutionShell({
  booking,
  photos: initialPhotos,
  checklist,
}: {
  booking: Booking;
  photos: JobPhoto[];
  checklist: PhotoChecklist;
}) {
  const router = useRouter();
  const [photos, setPhotos] = useState(initialPhotos);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [missingSlots, setMissingSlots] = useState<string[]>([]);
  const [showIssue, setShowIssue] = useState(false);

  const vehicleLabel = [booking.vehicle_year, booking.vehicle_make, booking.vehicle_model].filter(Boolean).join(" ");
  const mapsHref = booking.service_address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(booking.service_address)}` : null;
  const phoneHref = booking.customer_phone ? `tel:${booking.customer_phone.replace(/\D/g, "")}` : null;

  const photoBySlot = useMemo(() => {
    const m = new Map<string, JobPhoto>();
    for (const p of photos) m.set(p.photoType, p);
    return m;
  }, [photos]);

  const hasPreDamage = photoBySlot.has("pre_existing_damage");
  const photosUploaded = photos.length;

  // Computed stage
  const stage =
    booking.job_completed_at ? "complete"
    : booking.started_at     ? "in_progress"
    : booking.arrived_at     ? "arrived"
    : booking.on_my_way_at   ? "on_my_way"
    : booking.accepted_at    ? "accepted"
    : "new";

  const refresh = () => router.refresh();

  const doAction = async (action: () => Promise<{ ok: boolean; error?: string; missingSlots?: string[] }>, label: string) => {
    setBusy(label);
    setError(null);
    setMissingSlots([]);
    const r = await action();
    setBusy(null);
    if (!r.ok) {
      setError(r.error ?? "Action failed.");
      if ("missingSlots" in r && r.missingSlots) setMissingSlots(r.missingSlots);
      return;
    }
    refresh();
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <SiteHeader />
      <div className="max-w-2xl mx-auto px-4 pt-28 pb-24">

        <Link href="/protected" className="inline-flex items-center gap-1 text-[11px] text-zinc-500 hover:text-amber-500 mb-3">
          <ArrowLeft size={11} /> Back to dashboard
        </Link>

        {/* Job header */}
        <div className="rounded-2xl border border-white/[0.06] bg-gradient-to-br from-zinc-900 via-zinc-950 to-zinc-950 p-4 mb-4">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-500/70 mb-1">Job · {fmtDate(booking.booking_date)}</p>
          <h1 className="text-2xl font-black tracking-tight">{booking.customer_name}</h1>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-[11px] text-zinc-400">
            <span className="inline-flex items-center gap-1"><Clock size={11} className="text-amber-500" /> {to12h(booking.booking_time)}</span>
            <span className="text-zinc-700">·</span>
            <span className="inline-flex items-center gap-1"><Car size={11} /> {vehicleLabel || "—"}</span>
          </div>
          <p className="text-[12px] text-zinc-300 mt-2 font-bold">{booking.service_name}</p>
          {booking.service_address && (
            <p className="text-[11px] text-zinc-500 mt-0.5">📍 {booking.service_address}</p>
          )}
          <div className="grid grid-cols-2 gap-2 mt-3">
            {phoneHref && (
              <a href={phoneHref} className="py-2 rounded-xl border border-amber-500/30 bg-amber-500/[0.06] text-amber-400 text-[11px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5">
                <Phone size={12} /> Call
              </a>
            )}
            {mapsHref && (
              <a href={mapsHref} target="_blank" rel="noopener noreferrer" className="py-2 rounded-xl border border-amber-500/30 bg-amber-500/[0.06] text-amber-400 text-[11px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5">
                <Navigation size={12} /> Maps
              </a>
            )}
          </div>
        </div>

        {/* Stage actions */}
        <section className="mb-5">
          <div className="rounded-2xl border border-white/[0.06] bg-zinc-900/40 p-4 space-y-2.5">
            <StageTimeline booking={booking} />

            {/* Action button matrix */}
            {stage === "new" && (
              <PrimaryAction
                label="Accept assignment"
                onClick={() => doAction(() => acceptJob(booking.id), "accept")}
                busy={busy === "accept"}
              />
            )}

            {(stage === "accepted" || stage === "new") && booking.accepted_at && stage === "accepted" && (
              <PrimaryAction
                label="I'm on my way →"
                onClick={() => doAction(() => startOnMyWay(booking.id), "on_my_way")}
                busy={busy === "on_my_way"}
                hint="Sends the customer a heads-up email."
              />
            )}

            {stage === "on_my_way" && (
              <PrimaryAction
                label="I've arrived"
                onClick={() => doAction(() => markArrived(booking.id), "arrived")}
                busy={busy === "arrived"}
              />
            )}

            {stage === "arrived" && (
              <>
                <PreExistingDamageUploader
                  bookingId={booking.id}
                  uploaded={hasPreDamage}
                  onUploaded={(p) => setPhotos(prev => [...prev.filter(x => x.photoType !== "pre_existing_damage"), p])}
                />
                <PrimaryAction
                  label="Start job"
                  onClick={() => doAction(() => startJob(booking.id), "start")}
                  busy={busy === "start"}
                  disabled={!hasPreDamage}
                  hint={!hasPreDamage ? "Take the walk-around photo first." : "Begins the work timer."}
                />
              </>
            )}

            {stage === "in_progress" && (
              <>
                <p className="text-[11px] text-zinc-500 leading-relaxed">
                  Upload the required before- and after-photo set for every area. Once all are in, you can mark the job complete.
                </p>
                <PrimaryAction
                  label={`Mark complete · ${photosUploaded}/${checklist.totalRequired} photos`}
                  onClick={() => doAction(() => completeJob(booking.id), "complete")}
                  busy={busy === "complete"}
                  disabled={photosUploaded < checklist.totalRequired}
                />
              </>
            )}

            {stage === "complete" && (
              <>
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/[0.06] px-4 py-3.5 text-center">
                  <ShieldCheck size={20} className="mx-auto text-emerald-400 mb-1.5" />
                  <p className="text-sm font-black text-emerald-300">Job marked complete</p>
                  <p className="text-[11px] text-emerald-200/80 mt-0.5">
                    Status: <strong>{booking.photo_review_status === "approved" ? "Approved — commission locked" : booking.photo_review_status === "rejected" ? "Photos rejected — see notes" : "Awaiting Arise & Shine review"}</strong>
                  </p>
                  {booking.base_commission_cents != null && (
                    <p className="text-[11px] text-zinc-400 mt-1.5">
                      Estimated commission: <strong className="text-amber-400">${(booking.base_commission_cents / 100).toFixed(0)}</strong>
                    </p>
                  )}
                </div>

                <PaymentLinkPanel booking={booking} />
              </>
            )}

            {/* Report issue — available at any time */}
            <button
              type="button"
              onClick={() => setShowIssue(true)}
              className="w-full mt-1 py-2 rounded-xl border border-rose-500/30 bg-rose-500/[0.04] text-rose-300 text-[11px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 hover:bg-rose-500/[0.08]"
            >
              <AlertOctagon size={12} /> Report an issue
            </button>
          </div>

          {error && (
            <div className="mt-3 rounded-xl border border-rose-500/30 bg-rose-500/[0.06] px-3 py-2.5">
              <p className="text-[12px] text-rose-300">{error}</p>
              {missingSlots.length > 0 && (
                <p className="text-[11px] text-rose-200/80 mt-1">Missing: {missingSlots.map(slotLabel).join(", ")}</p>
              )}
            </div>
          )}
        </section>

        {/* Photo checklist — appears once the job is started or arrived */}
        {(stage === "in_progress" || stage === "arrived" || stage === "complete") && (
          <section className="mb-5">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500 mb-3">
              Photo checklist · {photosUploaded}/{checklist.totalRequired} done
            </p>
            <div className="grid grid-cols-2 gap-2">
              {checklist.areas.flatMap(area => [
                <PhotoTile
                  key={`before_${area.area}`}
                  bookingId={booking.id}
                  slot={`before_${area.area}`}
                  label={`Before · ${area.label}`}
                  hint={area.hint}
                  existing={photoBySlot.get(`before_${area.area}`) ?? null}
                  disabled={stage === "complete" && booking.photo_review_status === "approved"}
                  onUploaded={(p) => setPhotos(prev => [...prev.filter(x => x.photoType !== p.photoType), p])}
                />,
                <PhotoTile
                  key={`after_${area.area}`}
                  bookingId={booking.id}
                  slot={`after_${area.area}`}
                  label={`After · ${area.label}`}
                  hint={area.hint}
                  existing={photoBySlot.get(`after_${area.area}`) ?? null}
                  disabled={stage === "complete" && booking.photo_review_status === "approved"}
                  onUploaded={(p) => setPhotos(prev => [...prev.filter(x => x.photoType !== p.photoType), p])}
                />,
              ])}
            </div>
          </section>
        )}

        {/* Customer / vehicle / add-ons summary */}
        <section className="rounded-2xl border border-white/[0.06] bg-zinc-900/30 p-4 mb-5">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500 mb-2">Job summary</p>
          {Array.isArray(booking.addons_json) && booking.addons_json.length > 0 ? (
            <ul className="space-y-1 text-[12px]">
              {(booking.addons_json as Array<{ label: string; price: number }>).map((a, i) => (
                <li key={i} className="flex items-center justify-between">
                  <span className="text-zinc-400">+ {a.label}</span>
                  <span className="text-zinc-500 tabular-nums">${a.price}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[12px] text-zinc-600 italic">No add-ons.</p>
          )}
          {Array.isArray(booking.additional_vehicles_json) && (booking.additional_vehicles_json as any[]).length > 0 && (
            <p className="text-[11px] text-amber-400 mt-2">+ {(booking.additional_vehicles_json as any[]).length} additional vehicle(s) — full details on customer's confirmation email.</p>
          )}
          <div className="mt-3 pt-2 border-t border-white/[0.04] flex items-center justify-between text-[11px]">
            <span className="text-zinc-400">Total price</span>
            <span className="text-zinc-200 font-black tabular-nums">${(Number(booking.total_price) || 0).toFixed(0)}</span>
          </div>
        </section>

      </div>

      {showIssue && (
        <IssueModal
          bookingId={booking.id}
          onClose={() => setShowIssue(false)}
          onSent={() => { setShowIssue(false); refresh(); }}
        />
      )}
    </div>
  );
}

// ─── Stage timeline ───────────────────────────────────────────────────────────

function StageTimeline({ booking }: { booking: Booking }) {
  const steps = [
    { key: "accepted",   label: "Accepted",   at: booking.accepted_at },
    { key: "on_my_way",  label: "On my way",  at: booking.on_my_way_at },
    { key: "arrived",    label: "Arrived",    at: booking.arrived_at },
    { key: "started",    label: "Started",    at: booking.started_at },
    { key: "completed",  label: "Completed",  at: booking.job_completed_at },
  ];
  return (
    <ol className="flex items-center justify-between">
      {steps.map((s, idx) => {
        const done = !!s.at;
        const isLast = idx === steps.length - 1;
        return (
          <li key={s.key} className="flex items-center flex-1 last:flex-initial">
            <div className="flex flex-col items-center min-w-0">
              <div className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-black",
                done ? "bg-emerald-500 text-black" : "bg-zinc-800 text-zinc-600"
              )}>
                {done ? <Check size={11} strokeWidth={3} /> : idx + 1}
              </div>
              <p className={cn("text-[8px] font-bold uppercase tracking-wider mt-1", done ? "text-emerald-400" : "text-zinc-600")}>
                {s.label}
              </p>
            </div>
            {!isLast && <div className={cn("flex-1 h-0.5 mx-1.5 mt-[-12px]", done ? "bg-emerald-500/30" : "bg-zinc-800")} />}
          </li>
        );
      })}
    </ol>
  );
}

// ─── Primary action button ────────────────────────────────────────────────────

function PrimaryAction({ label, onClick, busy, disabled, hint }: { label: string; onClick: () => void; busy?: boolean; disabled?: boolean; hint?: string }) {
  return (
    <div>
      <button
        type="button"
        onClick={onClick}
        disabled={busy || disabled}
        className={cn(
          "w-full py-3.5 rounded-xl text-sm font-black uppercase tracking-wider transition-all active:scale-[0.97] inline-flex items-center justify-center gap-2",
          disabled
            ? "bg-zinc-800 text-zinc-600 cursor-not-allowed"
            : "bg-gradient-to-r from-amber-500 to-amber-400 text-black shadow-[0_4px_14px_rgba(245,158,11,0.3)]"
        )}
      >
        {busy ? <Loader2 size={15} className="animate-spin" /> : <ChevronRight size={15} />}
        {label}
      </button>
      {hint && <p className="text-[10px] text-zinc-600 mt-1.5 text-center">{hint}</p>}
    </div>
  );
}

// ─── Pre-existing damage uploader ─────────────────────────────────────────────

function PreExistingDamageUploader({
  bookingId,
  uploaded,
  onUploaded,
}: {
  bookingId: string;
  uploaded: boolean;
  onUploaded: (p: JobPhoto) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setBusy(true);
    setError(null);
    try {
      const dataUrl = await fileToDataUrl(file);
      const r = await uploadJobPhoto({ bookingId, photoType: "pre_existing_damage", dataUrl });
      if (!r.ok || !r.id) {
        setError(r.error ?? "Upload failed.");
      } else {
        onUploaded({
          id: r.id,
          photoType: "pre_existing_damage",
          fileUrl: dataUrl,         // optimistic local preview until refresh
          storagePath: "",
          uploadedAt: new Date().toISOString(),
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={cn(
      "rounded-xl border px-3 py-3",
      uploaded ? "border-emerald-500/30 bg-emerald-500/[0.04]" : "border-amber-500/30 bg-amber-500/[0.04]"
    )}>
      <div className="flex items-start gap-2 mb-2">
        <Camera size={14} className={uploaded ? "text-emerald-400" : "text-amber-400"} />
        <div className="min-w-0">
          <p className="text-[12px] font-black text-zinc-200">Pre-existing damage walk-around</p>
          <p className="text-[10px] text-zinc-500 mt-0.5">
            {uploaded ? "On file — required before you can start." : "Required before starting. Capture any prior scratches, dents, stains."}
          </p>
        </div>
      </div>
      <label className={cn(
        "block w-full text-center py-2 rounded-lg border border-dashed cursor-pointer text-[11px] font-bold uppercase tracking-wider",
        busy ? "opacity-50 cursor-wait" : uploaded ? "border-emerald-500/40 text-emerald-400" : "border-amber-500/40 text-amber-400"
      )}>
        {busy ? <Loader2 size={12} className="animate-spin inline" /> : uploaded ? "Replace photo" : "Take or upload photo"}
        {/*
          No `capture` attribute — on mobile this lets iOS/Android show
          a chooser between Camera and Photo Library (more flexible than
          forcing the camera). On desktop it opens a normal file picker
          so the operator can test the flow from a laptop.
        */}
        <input
          type="file"
          accept="image/*"
          className="hidden"
          disabled={busy}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.currentTarget.value = ""; }}
        />
      </label>
      {error && <p className="text-[10px] text-rose-400 mt-1.5">{error}</p>}
    </div>
  );
}

// ─── Photo tile (before/after grid) ───────────────────────────────────────────

function PhotoTile({
  bookingId,
  slot,
  label,
  hint,
  existing,
  disabled,
  onUploaded,
}: {
  bookingId: string;
  slot: string;
  label: string;
  hint: string;
  existing: JobPhoto | null;
  disabled?: boolean;
  onUploaded: (p: JobPhoto) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [optimisticUrl, setOptimisticUrl] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Pick an image file.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const dataUrl = await fileToDataUrl(file);
      setOptimisticUrl(dataUrl);
      const r = await uploadJobPhoto({ bookingId, photoType: slot, dataUrl });
      if (!r.ok || !r.id) {
        setError(r.error ?? "Upload failed.");
        setOptimisticUrl(null);
      } else {
        onUploaded({
          id: r.id,
          photoType: slot,
          fileUrl: dataUrl,
          storagePath: "",
          uploadedAt: new Date().toISOString(),
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
      setOptimisticUrl(null);
    } finally {
      setBusy(false);
    }
  };

  const displayUrl = optimisticUrl ?? existing?.fileUrl ?? null;
  const isStage = slot.startsWith("before_") ? "Before" : slot.startsWith("after_") ? "After" : null;

  // Desktop drag-and-drop support — mobile users still tap to open the
  // native camera / library chooser. On disabled tiles (e.g. job already
  // approved) drop events are ignored so old photos can't be overwritten.
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    if (disabled || busy) return;
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <label
      onDragOver={(e) => { e.preventDefault(); if (!disabled && !busy) setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
      className={cn(
        "relative aspect-square rounded-xl border overflow-hidden block",
        disabled ? "border-white/[0.04] opacity-50 cursor-not-allowed"
          : existing ? "border-emerald-500/30 cursor-pointer"
          : "border-amber-500/30 cursor-pointer",
        dragOver && !disabled && "ring-2 ring-amber-400"
      )}
    >
      {displayUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={displayUrl} alt={label} className="absolute inset-0 w-full h-full object-cover" />
      ) : (
        <div className="absolute inset-0 bg-zinc-900/60 flex flex-col items-center justify-center gap-1">
          <Camera size={16} className="text-amber-400" />
          <p className="text-[9px] font-black uppercase tracking-wider text-amber-400">{isStage} · {label.split(" · ")[1]}</p>
          <p className="text-[8px] text-zinc-600 text-center px-2 leading-tight">{hint}</p>
        </div>
      )}
      {displayUrl && (
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-2 py-1.5">
          <p className="text-[9px] font-black uppercase tracking-wider text-white truncate">{label}</p>
        </div>
      )}
      {!displayUrl && (
        <span className={cn(
          "absolute top-1.5 right-1.5 inline-flex items-center justify-center w-5 h-5 rounded-full",
          existing ? "bg-emerald-500" : "bg-amber-500"
        )}>
          {existing ? <Check size={11} className="text-black" strokeWidth={3} /> : <Plus size={11} className="text-black" strokeWidth={3} />}
        </span>
      )}
      {busy && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
          <Loader2 size={20} className="text-amber-400 animate-spin" />
        </div>
      )}
      {error && (
        <div className="absolute inset-x-0 bottom-0 bg-rose-500/95 px-2 py-1">
          <p className="text-[9px] font-bold text-white truncate">{error}</p>
        </div>
      )}
      {/*
        No `capture` attribute → mobile shows a chooser between Camera
        and Photo Library; desktop opens a regular file picker. Drag-drop
        also works on desktop via the wrapping label's drop handler above.
      */}
      <input
        type="file"
        accept="image/*"
        className="hidden"
        disabled={busy || !!disabled}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.currentTarget.value = ""; }}
      />
    </label>
  );
}

// ─── Issue report modal ──────────────────────────────────────────────────────

function IssueModal({
  bookingId,
  onClose,
  onSent,
}: {
  bookingId: string;
  onClose: () => void;
  onSent: () => void;
}) {
  const [category, setCategory] = useState<string>("not_home");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handle = async () => {
    setBusy(true);
    setError(null);
    const r = await reportIssue(bookingId, category, notes);
    setBusy(false);
    if (!r.ok) { setError(r.error ?? "Could not send."); return; }
    onSent();
  };

  return (
    <div className="fixed inset-0 z-[150] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-3" onClick={onClose}>
      <div className="w-full sm:max-w-md rounded-2xl bg-zinc-950 border border-rose-500/40 p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-black flex items-center gap-2"><AlertOctagon size={14} className="text-rose-400" /> Report issue</p>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-600 hover:text-white">
            <X size={14} />
          </button>
        </div>
        <p className="text-[11px] text-zinc-500 mb-3 leading-relaxed">Urgent alert sent to Arise &amp; Shine right away. Use this for safety issues, damage discovered, customer not present, etc.</p>

        <label className="block mb-3">
          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 block mb-1">Category</span>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500/50"
          >
            <option value="not_home">Customer not home / vehicle inaccessible</option>
            <option value="damage_discovered">Damage discovered (pre-existing)</option>
            <option value="customer_refused">Customer refused service</option>
            <option value="safety">Safety concern</option>
            <option value="vehicle_condition">Vehicle condition different than expected</option>
            <option value="other">Other</option>
          </select>
        </label>

        <label className="block mb-3">
          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 block mb-1">Notes</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            placeholder="What happened?"
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500/50 resize-none"
          />
        </label>

        {error && <p className="text-[12px] text-rose-300 mb-2">{error}</p>}

        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-white/[0.08] text-zinc-400 text-xs font-black uppercase tracking-wider">Cancel</button>
          <button
            onClick={handle}
            disabled={busy || notes.trim().length < 3}
            className={cn(
              "flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5",
              busy || notes.trim().length < 3 ? "bg-zinc-800 text-zinc-600 cursor-not-allowed" : "bg-rose-500 text-white"
            )}
          >
            {busy ? <Loader2 size={13} className="animate-spin" /> : <AlertOctagon size={13} />}
            Send alert
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error("read failed"));
    reader.readAsDataURL(file);
  });
}

// ─── Payment link panel (post-Complete) ──────────────────────────────────────

function PaymentLinkPanel({ booking }: { booking: Booking }) {
  const [busy, setBusy] = useState<PaymentLinkChannel | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [smsHref, setSmsHref] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [lastUrl, setLastUrl] = useState<string | null>(null);
  const router = useRouter();

  const handle = async (channel: PaymentLinkChannel) => {
    setBusy(channel);
    setError(null);
    const r = await sendContractorPaymentLink(booking.id, channel);
    setBusy(null);
    if (!r.ok) { setError(r.error); return; }
    setLastUrl(r.url);
    if (channel === "sms") {
      setSmsHref(r.smsHref);
      // Auto-open the contractor's Messages app if a phone is on file
      if (r.smsHref && r.smsHref !== "sms:") {
        window.location.href = r.smsHref;
      }
    }
    router.refresh();
  };

  const wasSent = !!booking.payment_link_sent_at;

  return (
    <div className="mt-2 rounded-xl border border-amber-500/30 bg-amber-500/[0.04] px-4 py-3.5">
      <div className="flex items-start gap-2 mb-3">
        <DollarSign size={14} className="text-amber-400 mt-0.5 shrink-0" />
        <div className="min-w-0">
          <p className="text-[12px] font-black text-zinc-200">
            {wasSent ? "Payment link sent" : "Send payment link to customer"}
          </p>
          <p className="text-[10px] text-zinc-500 mt-0.5 leading-snug">
            {wasSent
              ? `Last sent via ${booking.payment_link_method} ${booking.payment_link_sent_at ? new Date(booking.payment_link_sent_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : ""}. You can resend.`
              : "Customer pays online (card) and can add an optional tip. 100% of any tip is yours."}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => handle("email")}
          disabled={busy !== null}
          className={cn(
            "py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all",
            busy === "email" ? "bg-zinc-800 text-zinc-600"
              : "bg-amber-500/15 border border-amber-500/40 text-amber-300 hover:bg-amber-500/25 active:scale-95"
          )}
        >
          {busy === "email" ? <Loader2 size={12} className="animate-spin" /> : <MessageSquare size={12} />}
          {wasSent ? "Resend email" : "Send via email"}
        </button>
        <button
          type="button"
          onClick={() => handle("sms")}
          disabled={busy !== null}
          className={cn(
            "py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all",
            busy === "sms" ? "bg-zinc-800 text-zinc-600"
              : "bg-amber-500/15 border border-amber-500/40 text-amber-300 hover:bg-amber-500/25 active:scale-95"
          )}
        >
          {busy === "sms" ? <Loader2 size={12} className="animate-spin" /> : <Phone size={12} />}
          {wasSent ? "Resend text" : "Send via text"}
        </button>
      </div>

      {smsHref && (
        <div className="mt-2 rounded-lg border border-white/[0.08] bg-zinc-900/40 px-3 py-2.5">
          <p className="text-[10px] text-zinc-500 mb-1">Messages didn&apos;t open?</p>
          <a
            href={smsHref}
            className="text-[11px] font-bold text-amber-400 underline break-all"
          >
            Tap to open in Messages
          </a>
        </div>
      )}

      {lastUrl && (
        <div className="mt-2 rounded-lg border border-white/[0.06] bg-zinc-900/40 px-3 py-2 flex items-center justify-between gap-2">
          <p className="text-[10px] text-zinc-500 truncate">{lastUrl}</p>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(lastUrl);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
            className="shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded border border-white/[0.08] text-[10px] font-bold text-zinc-300"
          >
            {copied ? <><Check size={10} /> Copied</> : <>Copy</>}
          </button>
        </div>
      )}

      {error && (
        <p className="text-[11px] text-rose-300 mt-2">{error}</p>
      )}

      <p className="text-[10px] text-zinc-600 mt-3 leading-relaxed">
        💰 Tips go 100% to you (Stripe fee deducted). Customer can pick a preset or enter any amount on the payment page.
      </p>
    </div>
  );
}
