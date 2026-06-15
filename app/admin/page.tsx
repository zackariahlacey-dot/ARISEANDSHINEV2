"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getAllBookings,
  updateBookingStatusAction,
  sendOnMyWayEmail,
  rescheduleBookingAction,
  getErrorLogs,
} from "@/app/actions/adminActions";
import { recoverStripeBooking } from "@/app/actions/recoverStripeBooking";
import { sendStripePaymentLink, getPaymentLinkUrl, markPaymentLinkSent } from "@/app/actions/sendStripePaymentLink";
import { markBookingPaidCash } from "@/app/actions/markBookingPaidCash";
import { BookingVehiclesPanel } from "@/components/admin/BookingVehiclesPanel";
import { useWeather, forecastForDate } from "@/lib/useWeather";
import { useToast } from "@/components/admin/Toast";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Modal } from "@/components/admin/Modal";
import { NeedsAttentionWidget } from "@/components/admin/NeedsAttentionWidget";
import {
  Navigation, Phone, MessageSquare, Check, CheckCircle2, DollarSign,
  Car, Clock, MapPin, ChevronRight, CalendarDays, Loader2,
  Zap, AlertTriangle, Send, RotateCcw, X, TrendingUp, RefreshCw,
  CreditCard, Banknote, Mail, Wind, Search,
} from "lucide-react";
import { format, isToday, parseISO, isTomorrow, isYesterday, differenceInMinutes } from "date-fns";
import { cn } from "@/lib/utils";
import { to12h, timeToMins } from "@/lib/availability";

// ── helpers ────────────────────────────────────────────────────────────────
function bName(b: any): string {
  return b.customer_name ?? ([b.profiles?.first_name, b.profiles?.last_name].filter(Boolean).join(" ") || "Unknown");
}
function fmtPhone(p: string | null | undefined): string {
  if (!p) return "";
  let d = p.replace(/\D/g, "");
  if (d.length === 11 && d.startsWith("1")) d = d.slice(1);
  if (d.length !== 10) return p;
  return `(${d.slice(0,3)}) ${d.slice(3,6)}-${d.slice(6)}`;
}
function bPhone(b: any): string | null { return b.customer_phone ?? b.profiles?.phone ?? null; }
function bEmail(b: any): string | null { return b.customer_email ?? b.profiles?.email ?? null; }
function bService(b: any): string { return b.service_name ?? b.services?.name ?? "Detail"; }
function bAddress(b: any): string | null {
  if (b.service_address) return b.service_address;
  const m = b.notes?.match(/📍 Service Location:\s*(.+)/);
  return m ? m[1].trim() : null;
}
/** Extract the promo code + discount $ from the booking notes (matches the
 *  format written by bookDetailing.ts: "🏷️ Promo code SUMMER25 applied: $70.00 off"). */
function bPromo(b: any): { code: string | null; amount: number } | null {
  const note = b.notes ?? "";
  if (!note.includes("🏷️ Promo code")) return null;
  const match = note.match(/🏷️ Promo code(?:\s+([A-Z0-9_-]+))?\s+applied:\s+\$?([\d.]+)/i);
  if (!match) return null;
  const amount = parseFloat(match[2] ?? "0");
  return { code: match[1] ?? null, amount: isNaN(amount) ? 0 : amount };
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
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });

  const { data: errorLogs = [] } = useQuery({
    queryKey: ["admin", "error-logs"],
    queryFn: () => getErrorLogs(30),
    staleTime: 60_000,
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
  const yesterdayStr = format(new Date(Date.now() - 86400000), "yyyy-MM-dd");

  const todayJobs = useMemo(() => {
    if (!bookings) return [];
    return bookings
      .filter((b: any) => b.booking_date === todayStr && b.status !== "cancelled" && b.service_name !== "Personal Block")
      .sort((a: any, b: any) => (a.booking_time ?? "").localeCompare(b.booking_time ?? ""));
  }, [bookings, todayStr]);

  // Unpaid leftovers: anything from yesterday (or earlier in the last week)
  // that's been completed but has no payment recorded yet.
  const unpaidLeftovers = useMemo(() => {
    if (!bookings) return [];
    const sevenDaysAgo = format(new Date(Date.now() - 7 * 86400000), "yyyy-MM-dd");
    return bookings
      .filter((b: any) =>
        b.booking_date >= sevenDaysAgo &&
        b.booking_date < todayStr &&
        (b.status === "completed" || b.status === "complete") &&
        !b.paid_at &&
        !b.stripe_checkout_session_id &&
        b.service_name !== "Personal Block"
      )
      .sort((a: any, b: any) => (b.booking_date ?? "").localeCompare(a.booking_date ?? ""));
  }, [bookings, todayStr]);

  const recentBookings = useMemo(() => {
    if (!bookings) return [];
    const sevenDaysAgo = Date.now() - 7 * 86400000;
    return bookings
      .filter((b: any) => {
        if (b.status === "cancelled") return false;
        if (b.service_name === "Personal Block") return false;
        const createdMs = b.created_at ? new Date(b.created_at).getTime() : 0;
        return createdMs >= sevenDaysAgo;
      })
      .sort((a: any, b: any) =>
        (b.created_at ?? "").localeCompare(a.created_at ?? "")
      );
  }, [bookings]);

  const [recentExpanded, setRecentExpanded] = useState(false);
  const [failedExpanded, setFailedExpanded] = useState(false);
  const [errorsExpanded, setErrorsExpanded] = useState(false);
  const RECENT_PREVIEW_COUNT = 3;
  const ERROR_PREVIEW_COUNT = 2;

  // Booking search — across all time, by name / phone / email
  const [bookingSearch, setBookingSearch] = useState("");
  const searchResults = useMemo(() => {
    const q = bookingSearch.trim().toLowerCase();
    if (!bookings || q.length < 2) return [];
    return bookings
      .filter((b: any) => {
        if (b.service_name === "Personal Block") return false;
        const name  = (b.customer_name ?? "").toLowerCase();
        const profName = `${b.profiles?.first_name ?? ""} ${b.profiles?.last_name ?? ""}`.trim().toLowerCase();
        const phone = String(b.customer_phone ?? b.profiles?.phone ?? "").replace(/\D/g, "");
        const email = (b.customer_email ?? b.profiles?.email ?? "").toLowerCase();
        const qDigits = q.replace(/\D/g, "");
        return (
          name.includes(q) ||
          profName.includes(q) ||
          (qDigits.length >= 3 && phone.includes(qDigits)) ||
          email.includes(q)
        );
      })
      .sort((a: any, b: any) =>
        (b.booking_date ?? "").localeCompare(a.booking_date ?? "") ||
        (b.booking_time ?? "").localeCompare(a.booking_time ?? "")
      )
      .slice(0, 30);
  }, [bookings, bookingSearch]);

  const failedBookings = useMemo(() => errorLogs.filter((e: any) => e.type === "booking_attempt"), [errorLogs]);
  const siteErrors    = useMemo(() => errorLogs.filter((e: any) => e.type !== "booking_attempt"), [errorLogs]);

  const nowMins = new Date().getHours() * 60 + new Date().getMinutes();

  const nextJob = useMemo(() => {
    return todayJobs.find((b: any) => {
      const bMins = timeToMins(b.booking_time ?? "");
      return bMins >= nowMins && b.status === "confirmed";
    }) ?? null;
  }, [todayJobs, nowMins]);

  // Closest upcoming booking on ANY future day — used when today is empty
  const nextUpcomingJob = useMemo(() => {
    if (!bookings) return null;
    return bookings
      .filter((b: any) =>
        b.status === "confirmed" &&
        b.service_name !== "Personal Block" &&
        b.booking_date > todayStr
      )
      .sort((a: any, b: any) =>
        (a.booking_date ?? "").localeCompare(b.booking_date ?? "") ||
        (a.booking_time ?? "").localeCompare(b.booking_time ?? "")
      )[0] ?? null;
  }, [bookings, todayStr]);

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
      if ("url" in r) { toast("Payment link emailed ✅"); refetch(); }
      else toast(r.error ?? "Failed", "error");
    } catch (e: any) { toast(e?.message ?? "Failed", "error"); }
    setSendingPaymentLink(false);
  }

  async function handleTextPay(b: any) {
    const phone = bPhone(b);
    if (!phone) { toast("No phone on file", "error"); return; }
    if (!Number(b.total_price) || Number(b.total_price) <= 0) { toast("Invalid price", "error"); return; }
    try {
      const url = await getPaymentLinkUrl(b.id);
      const firstName = bName(b).split(" ")[0] || "there";
      const total = Number(b.total_price).toFixed(2);
      const body =
        `Hi ${firstName}, thanks again from Arise & Shine VT! ` +
        `Here's your secure payment link for $${total}` +
        (b.service_name ? ` (${b.service_name})` : "") + `:\n\n${url}`;
      const cleanPhone = phone.replace(/\D/g, "");
      window.location.href = `sms:${cleanPhone}?&body=${encodeURIComponent(body)}`;
      markPaymentLinkSent(b.id).catch(() => undefined);
      refetch();
    } catch (e: any) { toast(e?.message ?? "Failed", "error"); }
  }

  async function handleMarkCash(b: any) {
    if (!confirm(`Mark this booking as PAID IN CASH for $${Number(b.total_price ?? 0).toFixed(0)}?`)) return;
    try {
      const r = await markBookingPaidCash(b.id);
      if (r.ok) { toast("Marked paid (cash) ✅"); refetch(); setActiveBooking(null); }
      else toast(r.error ?? "Failed", "error");
    } catch (e: any) { toast(e?.message ?? "Failed", "error"); }
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
    <div className="px-4 pt-4 pb-28 max-w-2xl mx-auto space-y-5">

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

      {/* ── Needs attention (auto-refreshes every 60s) ────────────────────── */}
      <NeedsAttentionWidget />

      {/* ── Unpaid leftovers from the past week ───────────────────────────── */}
      {unpaidLeftovers.length > 0 && (
        <UnpaidLeftoversBanner
          rows={unpaidLeftovers}
          onSendEmail={handleStripeLink}
          onSendText={handleTextPay}
          onMarkCash={handleMarkCash}
          onOpen={(b) => setActiveBooking(b)}
        />
      )}

      {/* ── Next job hero (enriched: weather, countdown, miles) ─────────── */}
      {nextJob ? (
        <UpNextHero
          job={nextJob}
          countdown={countdown}
          onOpen={() => setActiveBooking(nextJob)}
          onCall={() => window.open(`tel:${bPhone(nextJob)}`, "_self")}
          onText={() => window.open(`sms:${bPhone(nextJob)}`, "_self")}
          onNav={() => { const a = bAddress(nextJob); if (a) window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(a)}`, "_blank"); }}
          onOmw={() => handleSendOmw(nextJob)}
        />
      ) : todayJobs.length === 0 ? (
        <NextUpcomingHero
          job={nextUpcomingJob}
          onOpen={() => nextUpcomingJob && setActiveBooking(nextUpcomingJob)}
          onCall={() => nextUpcomingJob && window.open(`tel:${bPhone(nextUpcomingJob)}`, "_self")}
          onText={() => nextUpcomingJob && window.open(`sms:${bPhone(nextUpcomingJob)}`, "_self")}
          onNav={() => { if (!nextUpcomingJob) return; const a = bAddress(nextUpcomingJob); if (a) window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(a)}`, "_blank"); }}
          onAddBooking={() => router.push("/admin/schedule?new=1")}
        />
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
              <JobCard
                key={b.id}
                b={b}
                onClick={() => setActiveBooking(b)}
                onCall={() => window.open(`tel:${bPhone(b)}`, "_self")}
                onText={() => window.open(`sms:${bPhone(b)}`, "_self")}
                onNav={() => { const a = bAddress(b); if (a) window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(a)}`, "_blank"); }}
                onPayEmail={() => handleStripeLink(b)}
                onPayText={() => handleTextPay(b)}
                onMarkCash={() => handleMarkCash(b)}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Search any booking by name / phone / email ────────────────────── */}
      <div>
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
          <input
            value={bookingSearch}
            onChange={e => setBookingSearch(e.target.value)}
            placeholder="Search all bookings by name, phone, email…"
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-9 pr-9 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/50"
          />
          {bookingSearch && (
            <button
              onClick={() => setBookingSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-white"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {bookingSearch.trim().length >= 2 && (
          <div className="mt-2 space-y-1.5">
            {searchResults.length === 0 ? (
              <p className="text-[11px] text-zinc-600 italic text-center py-4">
                No bookings found for &ldquo;{bookingSearch}&rdquo;
              </p>
            ) : (
              <>
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600">
                  {searchResults.length} match{searchResults.length === 1 ? "" : "es"}
                </p>
                {searchResults.map((b: any) => {
                  const date = b.booking_date ? new Date(b.booking_date + "T12:00:00") : null;
                  return (
                    <button
                      key={b.id}
                      onClick={() => setActiveBooking(b)}
                      className="w-full text-left bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.05] rounded-xl px-3 py-2.5 flex items-center gap-3 transition-all active:scale-[0.98]"
                    >
                      {date && (
                        <div className="shrink-0 w-10 text-center">
                          <p className="text-[9px] font-black uppercase text-zinc-600">{format(date, "MMM")}</p>
                          <p className="text-lg font-black text-zinc-300 leading-tight">{format(date, "d")}</p>
                          <p className="text-[8px] text-zinc-700">{b.booking_time ? to12h(String(b.booking_time).slice(0, 5)) : ""}</p>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold truncate text-zinc-200">{b.customer_name ?? "Unknown"}</p>
                        <p className="text-[11px] text-zinc-600 truncate">
                          {b.service_name ?? "Detail"} · {dayLabel(b.booking_date)}
                        </p>
                      </div>
                      <div className="shrink-0 text-right space-y-0.5">
                        <p className="text-sm font-black text-zinc-300">${Number(b.total_price ?? 0).toFixed(0)}</p>
                        <div className="flex items-center justify-end gap-1">
                          <StatusBadge status={b.status} />
                        </div>
                      </div>
                      <ChevronRight size={12} className="text-zinc-700 shrink-0" />
                    </button>
                  );
                })}
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Recent Bookings (past 7 days, collapsible) ────────────────────── */}
      {recentBookings.length > 0 && (() => {
        const visible = recentExpanded ? recentBookings : recentBookings.slice(0, RECENT_PREVIEW_COUNT);
        const hiddenCount = recentBookings.length - RECENT_PREVIEW_COUNT;
        return (
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600">
                Booked This Week · {recentBookings.length}
              </p>
              {hiddenCount > 0 && (
                <button
                  onClick={() => setRecentExpanded(e => !e)}
                  className="text-[9px] font-black uppercase tracking-widest text-amber-400 hover:text-amber-300 active:scale-95"
                >
                  {recentExpanded ? "Show less" : `Show all ${recentBookings.length}`}
                </button>
              )}
            </div>
            <div className="space-y-1.5">
              {visible.map((b: any) => {
                const bookedAt = b.created_at ? new Date(b.created_at) : null;
                return (
                <button
                  key={b.id}
                  onClick={() => setActiveBooking(b)}
                  className="w-full text-left bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.05] rounded-xl px-4 py-3 flex items-center gap-3 transition-all active:scale-[0.98]"
                >
                  {bookedAt && (
                    <div className="shrink-0 w-10 text-center">
                      <p className="text-[9px] font-black uppercase text-zinc-600">{format(bookedAt, "MMM")}</p>
                      <p className="text-xl font-black text-zinc-300 leading-tight">{format(bookedAt, "d")}</p>
                      <p className="text-[8px] text-zinc-700">{format(bookedAt, "h:mma")}</p>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate text-zinc-200">{b.customer_name ?? "Unknown"}</p>
                    <p className="text-xs text-zinc-600 truncate">
                      {b.service_name ?? "Detail"} · appt {dayLabel(b.booking_date)}
                    </p>
                  </div>
                  <div className="shrink-0 text-right space-y-0.5">
                    <p className="text-sm font-black text-zinc-300">${Number(b.total_price).toFixed(0)}</p>
                    <PayBadge b={b} />
                  </div>
                  <ChevronRight size={13} className="text-zinc-700 shrink-0" />
                </button>
              )})}
            </div>
            {!recentExpanded && hiddenCount > 0 && (
              <button
                onClick={() => setRecentExpanded(true)}
                className="w-full mt-1.5 py-2 rounded-xl bg-white/[0.02] border border-white/[0.05] text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.04] active:scale-[0.98] transition-all"
              >
                + {hiddenCount} more
              </button>
            )}
          </div>
        );
      })()}

      {/* ── Failed booking attempts (collapsible) ─────────────────────────── */}
      {failedBookings.length > 0 && (() => {
        const visible = failedExpanded ? failedBookings : failedBookings.slice(0, ERROR_PREVIEW_COUNT);
        const hidden = failedBookings.length - ERROR_PREVIEW_COUNT;
        return (
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-amber-500/70">
                Failed Booking Attempts · {failedBookings.length}
              </p>
              {hidden > 0 && (
                <button onClick={() => setFailedExpanded(e => !e)} className="text-[9px] font-black uppercase tracking-widest text-amber-400 hover:text-amber-300 active:scale-95">
                  {failedExpanded ? "Show less" : `Show all ${failedBookings.length}`}
                </button>
              )}
            </div>
            <div className="space-y-1.5">
              {visible.map((e: any) => (
                <div key={e.id} className="bg-amber-500/[0.04] border border-amber-500/15 rounded-xl px-4 py-3 flex items-start gap-3">
                  <AlertTriangle size={13} className="text-amber-500 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-zinc-300 truncate">
                      {e.details?.email ?? "Unknown"} — {e.details?.service ?? ""}
                    </p>
                    <p className="text-[10px] text-zinc-600 mt-0.5">{e.message}</p>
                    {e.details?.date && (
                      <p className="text-[10px] text-zinc-700">Slot: {e.details.date} {e.details.time}</p>
                    )}
                  </div>
                  <p className="text-[9px] text-zinc-700 shrink-0">
                    {e.created_at ? format(new Date(e.created_at), "MMM d h:mma") : ""}
                  </p>
                </div>
              ))}
            </div>
            {!failedExpanded && hidden > 0 && (
              <button onClick={() => setFailedExpanded(true)} className="w-full mt-1.5 py-2 rounded-xl bg-white/[0.02] border border-white/[0.05] text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.04] active:scale-[0.98] transition-all">
                + {hidden} more
              </button>
            )}
          </div>
        );
      })()}

      {/* ── Site error log (collapsible) ──────────────────────────────────── */}
      {siteErrors.length > 0 && (() => {
        const visible = errorsExpanded ? siteErrors : siteErrors.slice(0, ERROR_PREVIEW_COUNT);
        const hidden = siteErrors.length - ERROR_PREVIEW_COUNT;
        return (
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-red-500/70">
                Site Errors · {siteErrors.length}
              </p>
              {hidden > 0 && (
                <button onClick={() => setErrorsExpanded(e => !e)} className="text-[9px] font-black uppercase tracking-widest text-red-400 hover:text-red-300 active:scale-95">
                  {errorsExpanded ? "Show less" : `Show all ${siteErrors.length}`}
                </button>
              )}
            </div>
            <div className="space-y-1.5">
              {visible.map((e: any) => (
                <div key={e.id} className="bg-red-500/[0.04] border border-red-500/15 rounded-xl px-4 py-3 flex items-start gap-3">
                  <AlertTriangle size={13} className="text-red-400 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[9px] font-black uppercase tracking-wider text-zinc-600 mb-0.5">{e.source ?? e.type}</p>
                    <p className="text-xs text-zinc-300 truncate">{e.message}</p>
                    {e.details?.email && <p className="text-[10px] text-zinc-600">{e.details.email}</p>}
                  </div>
                  <p className="text-[9px] text-zinc-700 shrink-0">
                    {e.created_at ? format(new Date(e.created_at), "MMM d h:mma") : ""}
                  </p>
                </div>
              ))}
            </div>
            {!errorsExpanded && hidden > 0 && (
              <button onClick={() => setErrorsExpanded(true)} className="w-full mt-1.5 py-2 rounded-xl bg-white/[0.02] border border-white/[0.05] text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.04] active:scale-[0.98] transition-all">
                + {hidden} more
              </button>
            )}
          </div>
        );
      })()}

      {/* ── Booking detail modal ─────────────────────────────────────────── */}
      <Modal open={!!activeBooking && !showReschedule} onClose={() => setActiveBooking(null)}>
        {activeBooking && (
          <div className="space-y-5">
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs text-zinc-500">{dayLabel(activeBooking.booking_date)} · {formatTime(activeBooking.booking_time)}</p>
                <h2 className="text-xl font-black mt-0.5">{bName(activeBooking)}</h2>
              </div>
              <div className="text-right">
                <p className="text-2xl font-black text-amber-500">${Number(activeBooking.total_price).toFixed(0)}</p>
                <StatusBadge status={activeBooking.status} />
              </div>
            </div>

            {/* Payment quick-actions */}
            {activeBooking.status !== "cancelled" && (() => {
              const paid     = !!activeBooking.paid_at;
              const linkSent = !!activeBooking.payment_link_sent_at;
              const src      = (activeBooking.payment_source as string | null) ?? "";
              if (paid) return (
                <div className="flex items-center justify-center gap-2 bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 font-black text-sm uppercase tracking-wider py-3 rounded-xl">
                  <CheckCircle2 size={16} /> Client Paid{src ? ` · ${src === "cash" ? "Cash" : "Stripe"}` : ""}
                </div>
              );
              return (
                <div className="grid grid-cols-3 gap-2">
                  <button onClick={() => handleStripeLink(activeBooking)} disabled={sendingPaymentLink}
                    className={cn(
                      "flex items-center justify-center gap-1 font-black text-[11px] uppercase tracking-wider py-3 rounded-xl border active:scale-95 transition-all disabled:opacity-50",
                      linkSent ? "bg-sky-500/[0.06] border-sky-500/25 text-sky-300" : "bg-sky-500/15 border-sky-500/35 text-sky-400"
                    )}>
                    {sendingPaymentLink ? <Loader2 size={12} className="animate-spin" /> : <><Mail size={12} /> Email {linkSent && "↻"}</>}
                  </button>
                  <button onClick={() => handleTextPay(activeBooking)}
                    className={cn(
                      "flex items-center justify-center gap-1 font-black text-[11px] uppercase tracking-wider py-3 rounded-xl border active:scale-95 transition-all",
                      linkSent ? "bg-amber-500/[0.06] border-amber-500/25 text-amber-300" : "bg-amber-500/15 border-amber-500/35 text-amber-400"
                    )}>
                    <MessageSquare size={12} /> Text {linkSent && "↻"}
                  </button>
                  <button onClick={() => handleMarkCash(activeBooking)}
                    className="flex items-center justify-center gap-1 bg-emerald-500/15 border border-emerald-500/35 text-emerald-400 font-black text-[11px] uppercase tracking-wider py-3 rounded-xl active:scale-95 transition-all">
                    <DollarSign size={12} /> Cash
                  </button>
                </div>
              );
            })()}

            {/* Vehicles + line items (editable) */}
            <BookingVehiclesPanel bookingId={activeBooking.id} onChange={() => refetch()} />

            {/* Contact + address */}
            <div className="space-y-2 text-sm">
              {bAddress(activeBooking) && (
                <DetailRow icon={<MapPin size={14} />} value={bAddress(activeBooking)!} />
              )}
              {bPhone(activeBooking) && (
                <DetailRow icon={<Phone size={14} />} value={fmtPhone(bPhone(activeBooking))} />
              )}
              {bEmail(activeBooking) && (
                <DetailRow icon={<MessageSquare size={14} />} value={bEmail(activeBooking)!} />
              )}
              {(() => {
                const promo = bPromo(activeBooking);
                if (!promo) return null;
                return (
                  <div className="flex items-center justify-between gap-2 rounded-xl bg-fuchsia-500/[0.08] border border-fuchsia-500/25 px-3 py-2.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-fuchsia-400 text-xs">🏷️</span>
                      <span className="text-[10px] font-black uppercase tracking-widest text-fuchsia-400">Promo</span>
                      {promo.code && (
                        <span className="font-mono text-xs font-bold text-fuchsia-200 px-2 py-0.5 rounded bg-fuchsia-500/10 border border-fuchsia-500/20 truncate">
                          {promo.code}
                        </span>
                      )}
                    </div>
                    <span className="text-sm font-black text-fuchsia-300 tabular-nums shrink-0">
                      −${promo.amount.toFixed(0)}
                    </span>
                  </div>
                );
              })()}
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
              <ActionBtn icon={<RotateCcw size={15} />} label="Reschedule" onClick={() => { setRescheduleDate(activeBooking.booking_date); setShowReschedule(true); }} />
              <button
                onClick={() => handleCancel(activeBooking)}
                className="flex items-center justify-center gap-2 bg-white/[0.05] hover:bg-red-500/20 text-red-400 font-black text-xs uppercase tracking-wider py-3 rounded-xl border border-red-500/20 transition-all active:scale-95"
              >
                <X size={15} /> Cancel
              </button>
            </div>
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

      {/* ── Sticky bottom progress banner ─────────────────────────────────── */}
      {todayJobs.length > 0 && (
        <div className="fixed bottom-4 left-0 right-0 z-30 pointer-events-none px-4 max-w-2xl mx-auto">
          <div className="pointer-events-auto rounded-2xl bg-zinc-950/90 backdrop-blur border border-white/[0.08] px-4 py-2.5 flex items-center justify-between gap-4 shadow-2xl">
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Today's Progress</p>
              <p className="text-sm font-black text-zinc-100">
                {todayJobs.filter((b: any) => b.status === "completed" || b.status === "complete").length}
                <span className="text-zinc-500"> / {todayJobs.length} done</span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Cash Today</p>
              <p className="text-sm font-black text-emerald-400">${pendingEarnings.toFixed(0)}</p>
            </div>
          </div>
        </div>
      )}

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

function JobCard({
  b, onClick, onCall, onText, onNav, onPayEmail, onPayText, onMarkCash,
}: {
  b: any;
  onClick: () => void;
  onCall: () => void;
  onText: () => void;
  onNav: () => void;
  onPayEmail: () => void;
  onPayText: () => void;
  onMarkCash: () => void;
}) {
  const stripe = isStripePaid(b);
  const paid   = !!b.paid_at;
  const linkSent = !!b.payment_link_sent_at;
  const extraVehicles: any[] = Array.isArray(b.additional_vehicles_json) ? b.additional_vehicles_json : [];
  const primaryAddons: any[] = Array.isArray(b.addons_json) ? b.addons_json : [];
  const extraAddons = extraVehicles.reduce((s: number, av: any) => s + (Array.isArray(av?.selectedAddons) ? av.selectedAddons.length : 0), 0);
  const totalAddons = primaryAddons.length + extraAddons;
  const totalVehicles = 1 + extraVehicles.length;
  const vehicleLabel = [b.vehicle_year, b.vehicle_make, b.vehicle_model].filter(Boolean).join(" ");
  const phone = b.customer_phone ?? b.profiles?.phone ?? null;
  const addr = b.service_address ?? null;
  const email = b.customer_email ?? b.profiles?.email ?? null;
  const statusColor: Record<string, string> = {
    confirmed: stripe ? "border-l-sky-500" : "border-l-emerald-500",
    completed: stripe ? "border-l-sky-400" : "border-l-emerald-400",
    "no-show": "border-l-red-500",
    cancelled: "border-l-zinc-700",
  };

  const stop = (fn: () => void) => (e: React.MouseEvent) => { e.stopPropagation(); fn(); };

  return (
    <div
      onClick={onClick}
      className={cn(
        "w-full text-left bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.06] rounded-xl px-3 py-3 transition-all active:scale-[0.98] border-l-2 cursor-pointer",
        statusColor[b.status] ?? "border-l-zinc-700"
      )}
    >
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-xs font-black text-amber-500">{to12h((b.booking_time ?? "00:00").slice(0, 5))}</span>
            <span className="text-sm font-bold truncate">{b.customer_name ?? "Unknown"}</span>
            {totalVehicles > 1 && (
              <span className="shrink-0 text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20">
                {totalVehicles} vehicles
              </span>
            )}
            {totalAddons > 0 && (
              <span className="shrink-0 text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20">
                +{totalAddons}
              </span>
            )}
            {paid && (
              <span className="shrink-0 text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-0.5">
                <CheckCircle2 size={8} /> Paid
              </span>
            )}
            {!paid && linkSent && (
              <span className="shrink-0 text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/25">
                Link sent
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-500 truncate">{b.service_name ?? "Detail"}{vehicleLabel ? ` · ${vehicleLabel}` : ""}</p>
        </div>
        <div className="text-right shrink-0 space-y-0.5">
          <p className="text-sm font-black">${Number(b.total_price).toFixed(0)}</p>
          <StatusBadge status={b.status} />
        </div>
      </div>

      {/* Inline action row — no card-open required */}
      <div className="flex gap-1 mt-2.5 pt-2 border-t border-white/[0.04]">
        {addr && (
          <button onClick={stop(onNav)} className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-400 text-[9px] font-black uppercase tracking-wider active:scale-95" aria-label="Navigate">
            <Navigation size={11} /> Nav
          </button>
        )}
        {phone && (
          <button onClick={stop(onCall)} className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-zinc-300 text-[9px] font-black uppercase tracking-wider active:scale-95" aria-label="Call">
            <Phone size={11} /> Call
          </button>
        )}
        {phone && (
          <button onClick={stop(onText)} className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-zinc-300 text-[9px] font-black uppercase tracking-wider active:scale-95" aria-label="Text">
            <MessageSquare size={11} /> Text
          </button>
        )}
        {!paid && email && (
          <button onClick={stop(onPayEmail)} className={cn(
            "flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg border text-[9px] font-black uppercase tracking-wider active:scale-95",
            linkSent ? "bg-sky-500/[0.06] border-sky-500/25 text-sky-300" : "bg-sky-500/15 border-sky-500/30 text-sky-400"
          )} aria-label="Email Pay Link">
            <Mail size={11} /> {linkSent ? "Resend" : "Pay"}
          </button>
        )}
        {!paid && phone && (
          <button onClick={stop(onPayText)} className={cn(
            "flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg border text-[9px] font-black uppercase tracking-wider active:scale-95",
            linkSent ? "bg-amber-500/[0.06] border-amber-500/25 text-amber-300" : "bg-amber-500/15 border-amber-500/30 text-amber-400"
          )} aria-label="Text Pay Link">
            <DollarSign size={11} /> {linkSent ? "Resend" : "Pay"}
          </button>
        )}
        {!paid && (
          <button onClick={stop(onMarkCash)} className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[9px] font-black uppercase tracking-wider active:scale-95" aria-label="Mark Cash">
            <Banknote size={11} /> Cash
          </button>
        )}
      </div>
    </div>
  );
}

/** Live, minute-precise countdown to a booking_date + booking_time pair. */
function useTimeUntilBooking(dateStr: string | null, timeStr: string | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);
  return useMemo(() => {
    if (!dateStr) return null;
    const t = (timeStr ?? "00:00").replace(/\s/g, "");
    let h = 0, m = 0;
    const match24 = t.match(/^(\d{1,2}):(\d{2})/);
    const matchAmPm = t.match(/^(\d{1,2}):(\d{2})\s*([AaPp][Mm])?/);
    if (match24) {
      h = parseInt(match24[1], 10);
      m = parseInt(match24[2], 10);
      if (matchAmPm?.[3]) {
        const isPm = matchAmPm[3].toLowerCase() === "pm";
        if (isPm && h !== 12) h += 12;
        if (!isPm && h === 12) h = 0;
      }
    }
    const target = new Date(dateStr + "T00:00:00");
    target.setHours(h, m, 0, 0);
    const diffMs = target.getTime() - now;
    const totalMin = Math.floor(diffMs / 60000);
    const past = totalMin < 0;
    const abs = Math.abs(totalMin);
    return {
      past,
      days:    Math.floor(abs / (60 * 24)),
      hours:   Math.floor((abs % (60 * 24)) / 60),
      minutes: abs % 60,
      totalMin,
    };
  }, [dateStr, timeStr, now]);
}

function formatCountdown(c: { days: number; hours: number; minutes: number; past: boolean } | null): string {
  if (!c) return "—";
  if (c.past) return "now";
  const parts: string[] = [];
  if (c.days > 0)  parts.push(`${c.days}d`);
  if (c.hours > 0) parts.push(`${c.hours}h`);
  if (c.minutes > 0 && c.days === 0) parts.push(`${c.minutes}m`);
  return parts.join(" ") || "<1m";
}

function NextUpcomingHero({
  job, onOpen, onCall, onText, onNav, onAddBooking,
}: {
  job: any | null;
  onOpen: () => void;
  onCall: () => void;
  onText: () => void;
  onNav: () => void;
  onAddBooking: () => void;
}) {
  const { data: weather } = useWeather();
  const today = new Date();
  const todayStr = format(today, "yyyy-MM-dd");
  const tomorrowStr = format(new Date(Date.now() + 86400000), "yyyy-MM-dd");

  // Empty case: no upcoming bookings at all — premium empty hero
  if (!job) {
    const tomorrowFc = forecastForDate(weather?.daily, tomorrowStr);
    return (
      <div className="relative overflow-hidden rounded-2xl border border-[#D4AF37]/15 bg-gradient-to-br from-[#D4AF37]/[0.05] via-zinc-900/40 to-black/40 p-5">
        {/* Subtle radial accent */}
        <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-[#D4AF37]/[0.08] blur-2xl pointer-events-none" />
        <div className="relative flex items-start justify-between gap-3 mb-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#D4AF37]/80">All clear</p>
            <h2 className="text-2xl font-black mt-1 leading-tight tracking-tight">No jobs on the books</h2>
            <p className="text-xs text-zinc-500 mt-1">Schedule's wide open — perfect time to chase a squeeze.</p>
          </div>
          {weather && (
            <div className="text-right shrink-0 bg-white/[0.04] border border-white/[0.06] rounded-xl px-3 py-2">
              <p className="text-2xl leading-none">{weather.emoji}</p>
              <p className="text-[10px] font-black text-zinc-300 mt-1 tabular-nums">{weather.temp}°F</p>
              <p className="text-[9px] uppercase tracking-widest text-zinc-600">now</p>
            </div>
          )}
        </div>

        {tomorrowFc && (
          <div className="relative flex items-center justify-between gap-2 bg-white/[0.03] border border-white/[0.05] rounded-xl px-3 py-2.5">
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Tomorrow</span>
              <span className="text-lg">{tomorrowFc.emoji}</span>
              <span className="text-xs font-black text-zinc-200 tabular-nums">
                {tomorrowFc.high}° <span className="text-zinc-600">/ {tomorrowFc.low}°</span>
              </span>
            </div>
            {tomorrowFc.precipProb > 0 && (
              <span className="text-[10px] font-black text-sky-400 tabular-nums">{tomorrowFc.precipProb}% ☔</span>
            )}
          </div>
        )}

        <button
          onClick={onAddBooking}
          className="relative mt-3 w-full py-3 rounded-xl bg-[#D4AF37] text-black text-xs font-black uppercase tracking-[0.18em] active:scale-95 transition-all shadow-lg shadow-[#D4AF37]/20"
        >
          + Add a booking
        </button>
      </div>
    );
  }

  // ── Premium "Next Upcoming" hero with live countdown + day forecast ──────
  const jobDate     = new Date(job.booking_date + "T12:00:00");
  const dateLabel   = job.booking_date === tomorrowStr ? "Tomorrow" : format(jobDate, "EEE · MMM d");
  const phone       = bPhone(job);
  const addr        = bAddress(job);
  const distance    = Number(job.distance_miles ?? 0);
  const jobFc       = forecastForDate(weather?.daily, job.booking_date);
  const countdown   = useTimeUntilBooking(job.booking_date, job.booking_time);
  const timeStr     = to12h((job.booking_time ?? "00:00").slice(0, 5));
  const stop        = (fn: () => void) => (e: React.MouseEvent) => { e.stopPropagation(); fn(); };

  return (
    <div
      onClick={onOpen}
      className="relative overflow-hidden rounded-2xl border border-[#D4AF37]/20 bg-gradient-to-br from-[#D4AF37]/[0.08] via-zinc-900/60 to-black/40 cursor-pointer active:scale-[0.99] transition-transform"
    >
      {/* Soft gold glow */}
      <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-[#D4AF37]/[0.10] blur-3xl pointer-events-none" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#D4AF37]/40 to-transparent pointer-events-none" />

      {/* Header band */}
      <div className="relative flex items-center justify-between gap-3 px-5 pt-4">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-[0.22em] text-[#D4AF37]">Next Up</span>
          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">· {dateLabel}</span>
        </div>
        {jobFc ? (
          <div className="flex items-center gap-1.5 bg-white/[0.04] border border-white/[0.06] rounded-full px-2 py-1">
            <span className="text-sm leading-none">{jobFc.emoji}</span>
            <span className="text-[10px] font-black text-zinc-200 tabular-nums">{jobFc.high}°/{jobFc.low}°</span>
            {jobFc.precipProb > 0 && (
              <span className="text-[10px] font-black text-sky-400 tabular-nums">{jobFc.precipProb}%</span>
            )}
          </div>
        ) : weather && (
          <div className="flex items-center gap-1.5 bg-white/[0.04] border border-white/[0.06] rounded-full px-2 py-1">
            <span className="text-sm leading-none">{weather.emoji}</span>
            <span className="text-[10px] font-black text-zinc-300 tabular-nums">{weather.temp}°</span>
          </div>
        )}
      </div>

      {/* Hero countdown */}
      <div className="relative px-5 pt-3 pb-1">
        <p className="text-[9px] font-black uppercase tracking-[0.22em] text-zinc-500">Starts in</p>
        <p className="text-4xl font-black text-white mt-0.5 tracking-tight tabular-nums">
          {formatCountdown(countdown)}
        </p>
      </div>

      {/* Client + time + price */}
      <div className="relative px-5 pt-3 flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-lg font-black text-zinc-100 truncate">{job.customer_name ?? "Unknown"}</p>
          <p className="text-xs text-zinc-500 font-medium truncate mt-0.5">{job.service_name ?? "Detail"}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-base font-black text-[#D4AF37] tabular-nums">{timeStr}</p>
          <p className="text-xs font-bold text-zinc-300 tabular-nums">${Number(job.total_price ?? 0).toFixed(0)}</p>
        </div>
      </div>

      {/* Address strip */}
      {addr && (
        <div className="relative mx-5 mt-3 flex items-center gap-2 bg-black/30 border border-white/[0.05] rounded-xl px-3 py-2">
          <MapPin size={12} className="text-zinc-500 shrink-0" />
          <span className="text-xs text-zinc-300 truncate flex-1">{addr}</span>
          {distance > 0 && (
            <span className="text-[10px] font-black text-zinc-500 tabular-nums shrink-0">{distance.toFixed(1)} mi</span>
          )}
        </div>
      )}

      {/* Quick actions */}
      <div className="relative grid grid-cols-4 gap-1.5 px-5 py-4">
        {addr && (
          <button onClick={stop(onNav)} className="flex flex-col items-center gap-1 py-2.5 rounded-xl bg-[#D4AF37] text-black text-[9px] font-black uppercase tracking-[0.12em] active:scale-95 transition-all">
            <Navigation size={14} /> Nav
          </button>
        )}
        {phone && (
          <button onClick={stop(onCall)} className="flex flex-col items-center gap-1 py-2.5 rounded-xl bg-white/[0.06] border border-white/[0.08] text-zinc-200 text-[9px] font-black uppercase tracking-[0.12em] active:scale-95 transition-all">
            <Phone size={14} /> Call
          </button>
        )}
        {phone && (
          <button onClick={stop(onText)} className="flex flex-col items-center gap-1 py-2.5 rounded-xl bg-white/[0.06] border border-white/[0.08] text-zinc-200 text-[9px] font-black uppercase tracking-[0.12em] active:scale-95 transition-all">
            <MessageSquare size={14} /> Text
          </button>
        )}
        <button onClick={stop(onAddBooking)} className="flex flex-col items-center gap-1 py-2.5 rounded-xl bg-white/[0.06] border border-white/[0.08] text-zinc-200 text-[9px] font-black uppercase tracking-[0.12em] active:scale-95 transition-all">
          <Zap size={14} /> Book
        </button>
      </div>
    </div>
  );
}

function UpNextHero({
  job, countdown, onOpen, onCall, onText, onNav, onOmw,
}: {
  job: any;
  countdown: number | null;
  onOpen: () => void;
  onCall: () => void;
  onText: () => void;
  onNav: () => void;
  onOmw: () => void;
}) {
  const { data: weather } = useWeather();
  const addr = job.service_address ?? null;
  const phone = job.customer_phone ?? job.profiles?.phone ?? null;
  const distance = Number(job.distance_miles ?? 0);
  const stop = (fn: () => void) => (e: React.MouseEvent) => { e.stopPropagation(); fn(); };

  // ETA at default 35 mph average for Vermont rural drive — close enough
  const etaMin = distance > 0 ? Math.round((distance / 35) * 60) : 0;

  return (
    <div
      className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500/10 to-amber-500/[0.03] border border-amber-500/20 p-5 cursor-pointer active:scale-[0.98] transition-transform"
      onClick={onOpen}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <Clock size={12} className="text-amber-500 shrink-0" />
          <span className="text-[10px] font-black uppercase tracking-widest text-amber-500">Up Next</span>
        </div>
        <div className="flex items-center gap-2">
          {weather && (
            <span className="text-[10px] font-black text-zinc-300 flex items-center gap-1">
              {weather.emoji} {weather.temp}°F
              {weather.wind > 0 && <span className="text-zinc-500 ml-0.5"><Wind size={9} className="inline" /> {weather.wind}</span>}
            </span>
          )}
          {countdown !== null && countdown > 0 && (
            <span className="text-[10px] font-black text-zinc-300">
              in {countdown >= 60 ? `${Math.floor(countdown / 60)}h ${countdown % 60}m` : `${countdown}m`}
            </span>
          )}
          {countdown !== null && countdown <= 0 && (
            <span className="text-[10px] font-black text-emerald-400">NOW</span>
          )}
        </div>
      </div>

      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xl font-black truncate">{job.customer_name ?? "Unknown"}</p>
          <p className="text-sm text-zinc-400 font-medium truncate">{job.service_name ?? "Detail"}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-2xl font-black text-amber-500">{to12h((job.booking_time ?? "00:00").slice(0, 5))}</p>
          <p className="text-sm font-bold text-zinc-300">${Number(job.total_price).toFixed(0)}</p>
        </div>
      </div>

      {addr && (
        <div className="flex items-center gap-1.5 mt-3 text-zinc-400 text-xs">
          <MapPin size={11} className="shrink-0" />
          <span className="truncate flex-1">{addr}</span>
          {distance > 0 && (
            <span className="text-zinc-500 text-[10px] font-bold shrink-0 ml-2">
              {distance.toFixed(1)} mi · ~{etaMin}m drive
            </span>
          )}
        </div>
      )}

      <div className="flex gap-2 mt-4">
        {addr && (
          <button onClick={stop(onNav)} className="flex-1 flex flex-col items-center gap-1 py-2 px-1 rounded-xl text-[9px] font-black uppercase tracking-wider bg-amber-500 text-black active:scale-95">
            <Navigation size={14} /> Directions
          </button>
        )}
        {phone && (
          <button onClick={stop(onCall)} className="flex-1 flex flex-col items-center gap-1 py-2 px-1 rounded-xl text-[9px] font-black uppercase tracking-wider bg-white/[0.06] text-zinc-300 active:scale-95">
            <Phone size={14} /> Call
          </button>
        )}
        {phone && (
          <button onClick={stop(onText)} className="flex-1 flex flex-col items-center gap-1 py-2 px-1 rounded-xl text-[9px] font-black uppercase tracking-wider bg-white/[0.06] text-zinc-300 active:scale-95">
            <MessageSquare size={14} /> Text
          </button>
        )}
        <button onClick={stop(onOmw)} className="flex-1 flex flex-col items-center gap-1 py-2 px-1 rounded-xl text-[9px] font-black uppercase tracking-wider bg-white/[0.06] text-zinc-300 active:scale-95">
          <Send size={14} /> OMW
        </button>
      </div>
    </div>
  );
}

function UnpaidLeftoversBanner({
  rows, onSendEmail, onSendText, onMarkCash, onOpen,
}: {
  rows: any[];
  onSendEmail: (b: any) => void;
  onSendText:  (b: any) => void;
  onMarkCash:  (b: any) => void;
  onOpen:      (b: any) => void;
}) {
  const totalOwed = rows.reduce((s, r) => s + Number(r.total_price ?? 0), 0);
  const [expanded, setExpanded] = useState(rows.length <= 2);

  return (
    <div className="rounded-2xl bg-orange-500/[0.06] border border-orange-500/25 p-3 space-y-2">
      <button onClick={() => setExpanded(e => !e)} className="w-full flex items-center justify-between gap-2 text-left">
        <div className="flex items-center gap-2">
          <AlertTriangle size={14} className="text-orange-400 shrink-0" />
          <span className="text-xs font-black uppercase tracking-wider text-orange-300">
            {rows.length} Unpaid Job{rows.length === 1 ? "" : "s"}
          </span>
        </div>
        <span className="text-sm font-black text-orange-400 tabular-nums">${totalOwed.toFixed(0)}</span>
      </button>

      {expanded && (
        <div className="space-y-2 pt-1">
          {rows.map(b => {
            const phone = b.customer_phone ?? b.profiles?.phone ?? null;
            const email = b.customer_email ?? b.profiles?.email ?? null;
            const linkSent = !!b.payment_link_sent_at;
            return (
              <div key={b.id} className="bg-white/[0.03] border border-white/[0.06] rounded-xl px-3 py-2">
                <button onClick={() => onOpen(b)} className="w-full text-left flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold truncate">{b.customer_name ?? "Unknown"}</p>
                    <p className="text-[10px] text-zinc-500">{format(parseISO(b.booking_date + "T12:00:00"), "MMM d")} · {b.service_name ?? "Detail"}</p>
                  </div>
                  <p className="text-sm font-black text-orange-400 tabular-nums shrink-0">${Number(b.total_price).toFixed(0)}</p>
                </button>
                <div className="flex gap-1 mt-1.5">
                  {email && (
                    <button onClick={() => onSendEmail(b)} className={cn(
                      "flex-1 flex items-center justify-center gap-1 py-1 rounded-md border text-[9px] font-black uppercase tracking-wider",
                      linkSent ? "bg-sky-500/[0.06] border-sky-500/25 text-sky-300" : "bg-sky-500/15 border-sky-500/30 text-sky-400"
                    )}>
                      <Mail size={10} /> {linkSent ? "Resend Email" : "Email Link"}
                    </button>
                  )}
                  {phone && (
                    <button onClick={() => onSendText(b)} className={cn(
                      "flex-1 flex items-center justify-center gap-1 py-1 rounded-md border text-[9px] font-black uppercase tracking-wider",
                      linkSent ? "bg-amber-500/[0.06] border-amber-500/25 text-amber-300" : "bg-amber-500/15 border-amber-500/30 text-amber-400"
                    )}>
                      <MessageSquare size={10} /> {linkSent ? "Resend SMS" : "Text Link"}
                    </button>
                  )}
                  <button onClick={() => onMarkCash(b)} className="flex-1 flex items-center justify-center gap-1 py-1 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[9px] font-black uppercase tracking-wider">
                    <Banknote size={10} /> Cash
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
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
