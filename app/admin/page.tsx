"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getAllBookings,
  updateBookingStatusAction,
  sendOnMyWayEmail,
  rescheduleBookingAction,
} from "@/app/actions/adminActions";
import { recoverStripeBooking } from "@/app/actions/recoverStripeBooking";
import { sendStripePaymentLink } from "@/app/actions/sendStripePaymentLink";
import { useToast } from "@/components/admin/Toast";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Modal } from "@/components/admin/Modal";
import {
  Navigation, Phone, MessageSquare, Check, DollarSign,
  Car, Clock, MapPin, ChevronRight, CalendarDays, Loader2,
  Zap, AlertTriangle, Send, RotateCcw, X, TrendingUp, RefreshCw,
  CreditCard, Banknote,
} from "lucide-react";
import { format, isToday, parseISO, isTomorrow, differenceInMinutes } from "date-fns";
import { cn } from "@/lib/utils";
import { to12h, timeToMins } from "@/lib/availability";

// ── helpers ────────────────────────────────────────────────────────────────
function bName(b: any): string {
  return b.customer_name ?? ([b.profiles?.first_name, b.profiles?.last_name].filter(Boolean).join(" ") || "Unknown");
}
function bPhone(b: any): string | null { return b.customer_phone ?? b.profiles?.phone ?? null; }
function bEmail(b: any): string | null { return b.customer_email ?? b.profiles?.email ?? null; }
function bService(b: any): string { return b.service_name ?? b.services?.name ?? "Detail"; }
function bAddress(b: any): string | null {
  if (b.service_address) return b.service_address;
  const m = b.notes?.match(/📍 Service Location:\s*(.+)/);
  return m ? m[1].trim() : null;
}
function bVehicle(b: any): string {
  return [b.vehicle_year ?? b.vehicles?.year, b.vehicle_make ?? b.vehicles?.make, b.vehicle_model ?? b.vehicles?.model].filter(Boolean).join(" ");
}
function formatTime(t: string): string {
  if (!t) return "";
  return to12h(t.slice(0, 5));
}
function dayLabel(dateStr: string): string {
  try {
    const d = parseISO(dateStr + "T12:00:00");
    if (isToday(d)) return "Today";
    if (isTomorrow(d)) return "Tomorrow";
    return format(d, "EEE MMM d");
  } catch { return dateStr; }
}

// ── Countdown hook ─────────────────────────────────────────────────────────
function useCountdown(nextBooking: any | null) {
  const [mins, setMins] = useState<number | null>(null);
  useEffect(() => {
    function calc() {
      if (!nextBooking) { setMins(null); return; }
      const now = new Date();
      const nowMins = now.getHours() * 60 + now.getMinutes();
      const bMins = timeToMins(nextBooking.booking_time ?? "");
      setMins(bMins - nowMins);
    }
    calc();
    const id = setInterval(calc, 60_000);
    return () => clearInterval(id);
  }, [nextBooking]);
  return mins;
}

// ─────────────────────────────────────────────────────────────────────────────
export default function TodayPage() {
  const { toast } = useToast();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [activeBooking, setActiveBooking] = useState<any>(null);
  const [sendingPaymentLink, setSendingPaymentLink] = useState(false);
  const [showReschedule, setShowReschedule] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("09:00 AM");
  const [showRecovery, setShowRecovery] = useState(false);
  const [recoverySessionId, setRecoverySessionId] = useState("");
  const [recoveryResult, setRecoveryResult] = useState<string | null>(null);
  const [recovering, setRecovering] = useState(false);

  const handleRecoverBooking = async () => {
    const id = recoverySessionId.trim();
    if (!id) return;
    setRecovering(true);
    setRecoveryResult(null);
    try {
      const result = await recoverStripeBooking(id);
      switch (result.status) {
        case "already_fulfilled":
          setRecoveryResult(`✅ Booking already exists for ${result.customerName} — ${result.bookingDate} ${result.bookingTime}`);
          break;
        case "recovered":
          setRecoveryResult(`✅ Recovered! Booking created for ${result.customerName} — ${result.bookingDate} ${result.bookingTime}. Confirmation email sent.`);
          queryClient.invalidateQueries({ queryKey: ["admin", "bookings"] });
          break;
        case "overbooked":
          setRecoveryResult(`⚠️ Payment received but slot was already taken (${result.bookingDate} ${result.bookingTime}). Manual refund required.`);
          break;
        case "not_paid":
          setRecoveryResult("❌ Session found but payment is not complete.");
          break;
        case "gift_card":
          setRecoveryResult("ℹ️ This session was a gift card purchase, not a booking.");
          break;
        case "error":
          setRecoveryResult(`❌ Error: ${result.error}`);
          break;
      }
    } catch {
      setRecoveryResult("❌ Unexpected error. Check the session ID and try again.");
    }
    setRecovering(false);
  };

  const { data: bookings, isLoading, refetch } = useQuery({
    queryKey: ["admin", "bookings"],
    queryFn: async () => await getAllBookings(),
    staleTime: 30_000,
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => updateBookingStatusAction(id, status),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["admin", "bookings"] }),
  });
  const sendOmw = useMutation({ mutationFn: (id: string) => sendOnMyWayEmail(id) });
  const doReschedule = useMutation({
    mutationFn: ({ id, date, time }: { id: string; date: string; time: string }) => rescheduleBookingAction(id, date, time),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["admin", "bookings"] }),
  });

  const todayStr = format(new Date(), "yyyy-MM-dd");

  const todayJobs = useMemo(() => {
    if (!bookings) return [];
    return bookings
      .filter((b: any) => b.booking_date === todayStr && b.status !== "cancelled" && b.service_name !== "Personal Block")
      .sort((a: any, b: any) => (a.booking_time ?? "").localeCompare(b.booking_time ?? ""));
  }, [bookings, todayStr]);

  const recentBookings = useMemo(() => {
    if (!bookings) return [];
    return bookings
      .filter((b: any) =>
        b.booking_date < todayStr &&
        (b.status === "completed" || b.status === "confirmed" || b.status === "no-show") &&
        b.service_name !== "Personal Block"
      )
      .sort((a: any, b: any) => {
        const dateCmp = b.booking_date.localeCompare(a.booking_date);
        if (dateCmp !== 0) return dateCmp;
        return (b.booking_time ?? "").localeCompare(a.booking_time ?? "");
      })
      .slice(0, 8);
  }, [bookings, todayStr]);

  const nowMins = new Date().getHours() * 60 + new Date().getMinutes();

  const nextJob = useMemo(() => {
    return todayJobs.find((b: any) => {
      const bMins = timeToMins(b.booking_time ?? "");
      return bMins >= nowMins && b.status === "confirmed";
    }) ?? null;
  }, [todayJobs, nowMins]);

  const countdown = useCountdown(nextJob);

  // Week at a glance
  const weekDays = useMemo(() => {
    const today = new Date();
    const monday = new Date(today);
    monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const ds = format(d, "yyyy-MM-dd");
      const count = bookings?.filter((b: any) => b.booking_date === ds && b.status !== "cancelled" && b.service_name !== "Personal Block").length ?? 0;
      return { date: d, ds, count };
    });
  }, [bookings]);

  // Today earnings
  const todayEarnings = useMemo(() => {
    const completed = todayJobs.filter((b: any) => b.status === "completed");
    return completed.reduce((s: number, b: any) => s + Number(b.total_price || 0), 0);
  }, [todayJobs]);

  const pendingEarnings = useMemo(() => {
    const confirmed = todayJobs.filter((b: any) => b.status === "confirmed");
    return confirmed.reduce((s: number, b: any) => s + Number(b.total_price || 0), 0);
  }, [todayJobs]);

  // ── Actions ──────────────────────────────────────────────────────────────
  async function handleComplete(b: any) {
    try {
      await updateStatus.mutateAsync({ id: b.id, status: "completed" });
      toast("Job marked complete! 🎉");
      setActiveBooking(null);
      refetch();
    } catch { toast("Error marking complete", "error"); }
  }

  async function handleCancel(b: any) {
    if (!confirm("Cancel this booking?")) return;
    try {
      await updateStatus.mutateAsync({ id: b.id, status: "cancelled" });
      toast("Booking cancelled");
      setActiveBooking(null);
      refetch();
    } catch { toast("Error", "error"); }
  }

  async function handleSendOmw(b: any) {
    const addr = bAddress(b);
    if (addr) window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(addr)}`, "_blank");
    try {
      await sendOmw.mutateAsync(b.id);
      toast("On My Way email sent!");
    } catch { toast("Failed to send", "error"); }
  }

  async function handleStripeLink(b: any) {
    const email = bEmail(b);
    if (!email) { toast("No email on file for this client", "error"); return; }
    setSendingPaymentLink(true);
    try {
      const r = await sendStripePaymentLink(b.id, {
        serviceName:   b.service_name  ?? "Detailing Service",
        totalPrice:    Number(b.total_price),
        vehicleYear:   b.vehicle_year  ?? undefined,
        vehicleMake:   b.vehicle_make  ?? undefined,
        vehicleModel:  b.vehicle_model ?? undefined,
        vehicleSize:   b.vehicle_size  ?? undefined,
        bookingDate:   b.booking_date  ?? "",
        bookingTime:   b.booking_time  ?? "",
        customerEmail: email,
      });
      if ("url" in r) toast("Stripe payment link sent!");
      else toast(r.error ?? "Failed", "error");
    } catch { toast("Failed", "error"); }
    setSendingPaymentLink(false);
  }

  async function handleReschedule() {
    if (!activeBooking || !rescheduleDate || !rescheduleTime) return;
    try {
      await doReschedule.mutateAsync({ id: activeBooking.id, date: rescheduleDate, time: rescheduleTime });
      toast("Booking rescheduled!");
      setShowReschedule(false);
      setActiveBooking(null);
      refetch();
    } catch { toast("Error rescheduling", "error"); }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-amber-500" size={28} />
      </div>
    );
  }

  return (
    <div className="px-4 pt-4 pb-6 max-w-2xl mx-auto space-y-5">

      {/* ── Date header ──────────────────────────────────────────────────── */}
      <div className="flex items-baseline justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-500">Today</p>
          <h1 className="text-2xl font-black tracking-tight">{format(new Date(), "EEEE, MMMM d")}</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowRecovery(true)}
            className="flex items-center gap-1.5 bg-white/[0.06] text-zinc-400 text-xs font-bold uppercase tracking-wider px-3 py-2 rounded-xl active:scale-95 transition-transform hover:bg-white/[0.10]"
            title="Recover a missed Stripe booking"
          >
            <RefreshCw size={12} /> Recover
          </button>
          <button
            onClick={() => router.push("/admin/schedule?new=1")}
            className="flex items-center gap-1.5 bg-amber-500 text-black text-xs font-black uppercase tracking-wider px-3 py-2 rounded-xl active:scale-95 transition-transform"
          >
            <Zap size={13} /> Book
          </button>
        </div>
      </div>

      {/* ── Next job hero ────────────────────────────────────────────────── */}
      {nextJob ? (
        <div
          className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500/10 to-amber-500/[0.03] border border-amber-500/20 p-5 cursor-pointer active:scale-[0.98] transition-transform"
          onClick={() => setActiveBooking(nextJob)}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Clock size={12} className="text-amber-500 shrink-0" />
                <span className="text-[10px] font-black uppercase tracking-widest text-amber-500">Next Job</span>
                {countdown !== null && countdown > 0 && (
                  <span className="ml-auto text-[10px] font-black text-zinc-400">
                    in {countdown >= 60 ? `${Math.floor(countdown / 60)}h ${countdown % 60}m` : `${countdown}m`}
                  </span>
                )}
                {countdown !== null && countdown <= 0 && (
                  <span className="ml-auto text-[10px] font-black text-emerald-400">NOW</span>
                )}
              </div>
              <p className="text-xl font-black truncate">{bName(nextJob)}</p>
              <p className="text-sm text-zinc-400 font-medium truncate">{bService(nextJob)}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-2xl font-black text-amber-500">{formatTime(nextJob.booking_time)}</p>
              <p className="text-sm font-bold text-zinc-300">${Number(nextJob.total_price).toFixed(0)}</p>
            </div>
          </div>

          {bAddress(nextJob) && (
            <div className="flex items-center gap-1.5 mt-3 text-zinc-400 text-xs">
              <MapPin size={11} className="shrink-0" />
              <span className="truncate">{bAddress(nextJob)}</span>
            </div>
          )}

          {/* Quick action strip */}
          <div className="flex gap-2 mt-4">
            <QuickBtn icon={<Navigation size={14} />} label="Directions" gold onClick={() => {
              const addr = bAddress(nextJob);
              if (addr) window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(addr)}`, "_blank");
            }} />
            {bPhone(nextJob) && (
              <QuickBtn icon={<Phone size={14} />} label="Call" onClick={() => window.open(`tel:${bPhone(nextJob)}`, "_self")} />
            )}
            {bPhone(nextJob) && (
              <QuickBtn icon={<MessageSquare size={14} />} label="Text" onClick={() => window.open(`sms:${bPhone(nextJob)}`, "_self")} />
            )}
            <QuickBtn icon={<Send size={14} />} label="On My Way" onClick={() => handleSendOmw(nextJob)} />
          </div>
        </div>
      ) : todayJobs.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8 text-center">
          <p className="text-zinc-500 text-sm">No jobs scheduled today.</p>
          <button
            onClick={() => router.push("/admin/schedule?new=1")}
            className="mt-3 text-amber-500 text-xs font-black uppercase tracking-wider hover:underline"
          >
            + Add a booking
          </button>
        </div>
      ) : (
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.04] p-5 text-center">
          <Check size={24} className="mx-auto text-emerald-500 mb-2" />
          <p className="font-black text-emerald-400">All jobs done for today!</p>
        </div>
      )}

      {/* ── Today earnings strip ─────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3">
        <EarnCard label="Collected" value={`$${todayEarnings.toFixed(0)}`} color="text-emerald-400" />
        <EarnCard label="Pending" value={`$${pendingEarnings.toFixed(0)}`} color="text-amber-400" />
        <EarnCard label="Jobs" value={String(todayJobs.length)} color="text-zinc-300" />
      </div>

      {/* ── Week at a glance ─────────────────────────────────────────────── */}
      <div>
        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600 mb-2">This Week</p>
        <div className="flex gap-1.5">
          {weekDays.map(({ date, ds, count }) => {
            const isT = ds === todayStr;
            return (
              <button
                key={ds}
                onClick={() => router.push(`/admin/schedule?date=${ds}`)}
                className={cn(
                  "flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl border transition-all active:scale-95",
                  isT
                    ? "bg-amber-500 border-amber-500 text-black"
                    : "border-white/[0.06] bg-white/[0.02] text-zinc-400 hover:border-white/[0.12]"
                )}
              >
                <span className="text-[8px] font-black uppercase">{format(date, "EEE")}</span>
                <span className="text-[10px] font-black">{format(date, "d")}</span>
                {count > 0 && (
                  <span className={cn(
                    "w-1.5 h-1.5 rounded-full",
                    isT ? "bg-black/30" : "bg-amber-500"
                  )} />
                )}
                {count === 0 && <span className="w-1.5 h-1.5" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Today's jobs list ────────────────────────────────────────────── */}
      {todayJobs.length > 0 && (
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600 mb-2">Today's Schedule</p>
          <div className="space-y-2">
            {todayJobs.map((b: any) => (
              <JobCard key={b.id} b={b} onClick={() => setActiveBooking(b)} />
            ))}
          </div>
        </div>
      )}

      {/* ── Recent Bookings ──────────────────────────────────────────────── */}
      {recentBookings.length > 0 && (
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600 mb-2">Recent Bookings</p>
          <div className="space-y-1.5">
            {recentBookings.map((b: any) => (
              <button
                key={b.id}
                onClick={() => setActiveBooking(b)}
                className="w-full text-left bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.05] rounded-xl px-4 py-3 flex items-center gap-3 transition-all active:scale-[0.98]"
              >
                {/* Date badge */}
                <div className="shrink-0 w-10 text-center">
                  <p className="text-[9px] font-black uppercase text-zinc-600">{format(parseISO(b.booking_date + "T12:00:00"), "MMM")}</p>
                  <p className="text-base font-black text-zinc-400 leading-tight">{format(parseISO(b.booking_date + "T12:00:00"), "d")}</p>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate text-zinc-200">{b.customer_name ?? "Unknown"}</p>
                  <p className="text-xs text-zinc-600 truncate">{b.service_name ?? "Detail"} · {b.vehicle_make ?? ""} {b.vehicle_model ?? ""}</p>
                </div>
                <div className="shrink-0 text-right space-y-0.5">
                  <p className="text-sm font-black text-zinc-300">${Number(b.total_price).toFixed(0)}</p>
                  <div className="flex items-center justify-end gap-1">
                    <PayBadge b={b} />
                    <span className={cn(
                      "text-[8px] font-black uppercase tracking-wider",
                      b.status === "completed" ? "text-emerald-500" :
                      b.status === "no-show"   ? "text-red-400" : "text-zinc-600"
                    )}>{b.status}</span>
                  </div>
                </div>
                <ChevronRight size={13} className="text-zinc-700 shrink-0" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Booking detail modal ─────────────────────────────────────────── */}
      <Modal open={!!activeBooking && !showReschedule} onClose={() => setActiveBooking(null)}>
        {activeBooking && (
          <div className="space-y-5">
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs text-zinc-500">{dayLabel(activeBooking.booking_date)} · {formatTime(activeBooking.booking_time)}</p>
                <h2 className="text-xl font-black mt-0.5">{bName(activeBooking)}</h2>
                <p className="text-sm text-zinc-400">{bService(activeBooking)}</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-black text-amber-500">${Number(activeBooking.total_price).toFixed(0)}</p>
                <StatusBadge status={activeBooking.status} />
              </div>
            </div>

            {/* Details */}
            <div className="space-y-2 text-sm">
              {bVehicle(activeBooking) && (
                <DetailRow icon={<Car size={14} />} value={bVehicle(activeBooking)} />
              )}
              {bAddress(activeBooking) && (
                <DetailRow icon={<MapPin size={14} />} value={bAddress(activeBooking)!} />
              )}
              {bPhone(activeBooking) && (
                <DetailRow icon={<Phone size={14} />} value={bPhone(activeBooking)!} />
              )}
              {bEmail(activeBooking) && (
                <DetailRow icon={<MessageSquare size={14} />} value={bEmail(activeBooking)!} />
              )}
              {activeBooking.notes && (
                <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 text-xs text-zinc-400 whitespace-pre-wrap">
                  {activeBooking.notes}
                </div>
              )}
            </div>

            {/* Primary actions */}
            <div className="grid grid-cols-2 gap-2">
              {bAddress(activeBooking) && (
                <ActionBtn icon={<Navigation size={15} />} label="Directions" onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(bAddress(activeBooking)!)}`, "_blank")} />
              )}
              {bPhone(activeBooking) && (
                <ActionBtn icon={<Phone size={15} />} label="Call" onClick={() => window.open(`tel:${bPhone(activeBooking)}`, "_self")} />
              )}
              {bPhone(activeBooking) && (
                <ActionBtn icon={<MessageSquare size={15} />} label="Text" onClick={() => window.open(`sms:${bPhone(activeBooking)}`, "_self")} />
              )}
              <ActionBtn icon={<Send size={15} />} label="On My Way" onClick={() => handleSendOmw(activeBooking)} />
              <ActionBtn icon={<DollarSign size={15} />} label={sendingPaymentLink ? "Sending…" : "Stripe Link"} onClick={() => handleStripeLink(activeBooking)} disabled={sendingPaymentLink} />
              <ActionBtn icon={<RotateCcw size={15} />} label="Reschedule" onClick={() => { setRescheduleDate(activeBooking.booking_date); setShowReschedule(true); }} />
            </div>

            {/* Status actions */}
            {activeBooking.status === "confirmed" && (
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleComplete(activeBooking)}
                  className="flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs uppercase tracking-wider py-3 rounded-xl transition-all active:scale-95"
                >
                  <Check size={15} /> Mark Complete
                </button>
                <button
                  onClick={() => handleCancel(activeBooking)}
                  className="flex items-center justify-center gap-2 bg-white/[0.05] hover:bg-red-500/20 text-red-400 font-black text-xs uppercase tracking-wider py-3 rounded-xl border border-red-500/20 transition-all active:scale-95"
                >
                  <X size={15} /> Cancel
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* ── Reschedule modal ─────────────────────────────────────────────── */}
      <Modal open={showReschedule} onClose={() => setShowReschedule(false)}>
        <div className="space-y-4">
          <h2 className="text-lg font-black">Reschedule Booking</h2>
          <div className="space-y-3">
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 block mb-1">New Date</label>
              <input
                type="date"
                value={rescheduleDate}
                onChange={e => setRescheduleDate(e.target.value)}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500/50"
              />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 block mb-1">New Time</label>
              <input
                type="time"
                value={rescheduleTime.includes(":") ? rescheduleTime : "09:00"}
                onChange={e => setRescheduleTime(e.target.value)}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500/50"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowReschedule(false)}
              className="flex-1 py-3 rounded-xl border border-white/[0.08] text-zinc-400 text-sm font-black uppercase tracking-wider"
            >
              Cancel
            </button>
            <button
              onClick={handleReschedule}
              disabled={doReschedule.isPending}
              className="flex-1 py-3 rounded-xl bg-amber-500 text-black text-sm font-black uppercase tracking-wider active:scale-95 transition-all"
            >
              {doReschedule.isPending ? <Loader2 className="animate-spin mx-auto" size={16} /> : "Reschedule"}
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Stripe recovery modal ──────────────────────────────────────────── */}
      <Modal open={showRecovery} onClose={() => { setShowRecovery(false); setRecoveryResult(null); setRecoverySessionId(""); }}>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <RefreshCw size={16} className="text-[#D4AF37]" />
            <h3 className="font-bold text-zinc-100">Recover Stripe Booking</h3>
          </div>
          <p className="text-xs text-zinc-500 leading-relaxed">
            Paste the Stripe Checkout Session ID (starts with <code className="text-zinc-300">cs_</code>) to manually fulfil a booking where payment succeeded but the webhook didn&apos;t fire.
          </p>
          <input
            type="text"
            value={recoverySessionId}
            onChange={(e) => { setRecoverySessionId(e.target.value); setRecoveryResult(null); }}
            placeholder="cs_live_..."
            className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none font-mono"
          />
          {recoveryResult && (
            <p className="text-xs text-zinc-300 bg-white/[0.04] rounded-xl px-4 py-3 leading-relaxed whitespace-pre-wrap">
              {recoveryResult}
            </p>
          )}
          <button
            onClick={handleRecoverBooking}
            disabled={recovering || !recoverySessionId.startsWith("cs_")}
            className="w-full py-3 rounded-xl bg-[#D4AF37] text-black text-sm font-black uppercase tracking-wider active:scale-95 transition-all disabled:opacity-40"
          >
            {recovering ? <Loader2 className="animate-spin mx-auto" size={16} /> : "Recover Booking"}
          </button>
        </div>
      </Modal>
    </div>
  );
}

// ── helpers ────────────────────────────────────────────────────────────────
function isStripePaid(b: any): boolean {
  return !!b.stripe_checkout_session_id || (b.notes ?? "").includes("Pay Now (Stripe)");
}

// ── Sub-components ──────────────────────────────────────────────────────────
function PayBadge({ b }: { b: any }) {
  const stripe = isStripePaid(b);
  return (
    <span className={cn(
      "inline-flex items-center gap-0.5 text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full",
      stripe
        ? "bg-sky-500/10 text-sky-400 border border-sky-500/20"
        : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
    )}>
      {stripe ? <CreditCard size={8} /> : <Banknote size={8} />}
      {stripe ? "Stripe" : "Cash"}
    </span>
  );
}

function JobCard({ b, onClick }: { b: any; onClick: () => void }) {
  const stripe = isStripePaid(b);
  const statusColor: Record<string, string> = {
    confirmed: stripe ? "border-l-sky-500" : "border-l-emerald-500",
    completed: stripe ? "border-l-sky-400" : "border-l-emerald-400",
    "no-show": "border-l-red-500",
    cancelled: "border-l-zinc-700",
  };
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-3 flex items-center gap-3 transition-all active:scale-[0.98] border-l-2",
        statusColor[b.status] ?? "border-l-zinc-700"
      )}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="text-xs font-black text-amber-500">{to12h((b.booking_time ?? "00:00").slice(0, 5))}</span>
          <span className="text-sm font-bold truncate">{b.customer_name ?? "Unknown"}</span>
        </div>
        <p className="text-xs text-zinc-500 truncate">{b.service_name ?? "Detail"}</p>
      </div>
      <div className="text-right shrink-0 space-y-0.5">
        <p className="text-sm font-black">${Number(b.total_price).toFixed(0)}</p>
        <div className="flex items-center justify-end gap-1">
          <PayBadge b={b} />
          <StatusBadge status={b.status} />
        </div>
      </div>
      <ChevronRight size={14} className="text-zinc-700 shrink-0" />
    </button>
  );
}

function EarnCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl px-3 py-3 text-center">
      <p className={cn("text-xl font-black", color)}>{value}</p>
      <p className="text-[9px] font-black uppercase tracking-wider text-zinc-600 mt-0.5">{label}</p>
    </div>
  );
}

function QuickBtn({ icon, label, onClick, gold }: { icon: React.ReactNode; label: string; onClick: () => void; gold?: boolean }) {
  return (
    <button
      onClick={e => { e.stopPropagation(); onClick(); }}
      className={cn(
        "flex-1 flex flex-col items-center gap-1 py-2 px-1 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all active:scale-95",
        gold ? "bg-amber-500 text-black" : "bg-white/[0.06] text-zinc-300"
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function ActionBtn({ icon, label, onClick, disabled }: { icon: React.ReactNode; label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex items-center justify-center gap-2 bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.07] text-zinc-200 text-xs font-black uppercase tracking-wider py-3 rounded-xl transition-all active:scale-95 disabled:opacity-50"
    >
      {icon} {label}
    </button>
  );
}

function DetailRow({ icon, value }: { icon: React.ReactNode; value: string }) {
  return (
    <div className="flex items-center gap-2 text-zinc-300">
      <span className="text-zinc-600 shrink-0">{icon}</span>
      <span className="truncate">{value}</span>
    </div>
  );
}
