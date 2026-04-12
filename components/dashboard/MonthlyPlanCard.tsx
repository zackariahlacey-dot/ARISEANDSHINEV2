"use client";

import { useState } from "react";
import {
  Crown, Calendar, Repeat, X, Loader2, ChevronRight,
  Check, ChevronDown, Clock, Star,
} from "lucide-react";
import Link from "next/link";
import { cancelMySubscription, getMyMonthlyHistory } from "@/app/actions/monthlySubscriptions";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { MONTHLY_PLANS } from "@/lib/monthlyPlans";

type MonthPick = {
  chosen_date: string | null;
  chosen_time: string | null;
  status: string;
  month: string;
} | null;

type Sub = {
  id: string;
  plan_id: string;
  plan_name: string;
  plan_price: number;
  payment_method: string;
  status: string;
  signup_date: string | null;
  vehicle_make: string | null;
  vehicle_model: string | null;
  thisMonthPick: MonthPick;
  scheduleMonth: string;
};

type HistoryItem = {
  id: string;
  booking_date: string;
  booking_time: string | null;
  service_name: string | null;
  total_price: number;
  status: string;
};

type Props = { sub: Sub; userId: string };

function nextAnniversaryDate(signupDate: string | null): string {
  if (!signupDate) return "";
  const todayStr = new Date().toISOString().slice(0, 10);
  const today    = new Date(todayStr);
  const day      = parseInt(signupDate.slice(8, 10), 10);
  let d = new Date(today.getFullYear(), today.getMonth(), day);
  if (d.toISOString().slice(0, 10) <= todayStr) d = new Date(today.getFullYear(), today.getMonth() + 1, day);
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  if (day > lastDay) d = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function monthLabel(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function formatDate(d: string) {
  return new Date(d + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric",
  });
}

function formatTime(t: string | null): string {
  if (!t) return "";
  const [h, m] = t.slice(0, 5).split(":");
  const hr = parseInt(h, 10);
  return `${hr % 12 || 12}:${m} ${hr >= 12 ? "PM" : "AM"}`;
}

export function MonthlyPlanCard({ sub, userId }: Props) {
  const router = useRouter();
  const [cancelling, setCancelling]     = useState(false);
  const [showConfirm, setShowConfirm]   = useState(false);
  const [showFeatures, setShowFeatures] = useState(false);
  const [showHistory, setShowHistory]   = useState(false);
  const [history, setHistory]           = useState<HistoryItem[] | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const nextEmail   = nextAnniversaryDate(sub.signup_date);
  const scheduleUrl = `/schedule/monthly?month=${sub.scheduleMonth}&sub=${sub.id}`;
  const isScheduled = !!sub.thisMonthPick?.chosen_date;
  const plan        = MONTHLY_PLANS.find(p => p.id === sub.plan_id);

  async function handleCancel() {
    setCancelling(true);
    await cancelMySubscription(sub.id, userId);
    router.refresh();
  }

  async function toggleHistory() {
    const next = !showHistory;
    setShowHistory(next);
    if (next && !history && !loadingHistory) {
      setLoadingHistory(true);
      const h = await getMyMonthlyHistory(userId);
      setHistory(h);
      setLoadingHistory(false);
    }
  }

  return (
    <div className="relative mt-5 rounded-2xl border border-[#D4AF37]/25 bg-zinc-900/60 backdrop-blur-sm overflow-hidden">
      {/* Top gold line */}
      <div className="h-0.5 bg-gradient-to-r from-transparent via-[#D4AF37]/50 to-transparent" />

      <div className="p-5">

        {/* ── Plan header ─────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <div className="shrink-0 w-10 h-10 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/20 flex items-center justify-center">
              <Crown size={18} className="text-[#D4AF37]" />
            </div>
            <div>
              <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-[#D4AF37]">Monthly Plan</p>
              <p className="text-sm font-black text-zinc-100">{sub.plan_name}</p>
              {plan?.tagline && (
                <p className="text-[10px] text-zinc-600 mt-0.5">{plan.tagline}</p>
              )}
            </div>
          </div>
          <div className="text-right">
            <p className="text-xl font-black text-[#D4AF37]">${sub.plan_price}</p>
            <p className="text-[10px] text-zinc-600">/month</p>
          </div>
        </div>

        {/* Vehicle + payment */}
        <div className="space-y-1 text-xs text-zinc-500 mb-4">
          {(sub.vehicle_make || sub.vehicle_model) && (
            <p>🚗 {[sub.vehicle_make, sub.vehicle_model].filter(Boolean).join(" ")}</p>
          )}
          <p>{sub.payment_method === "cash" ? "💵 Cash on arrival" : "💳 Card — auto-billed monthly"}</p>
        </div>

        {/* ── This month's appointment ─────────────────────────── */}
        {isScheduled ? (
          <div className="mb-4 rounded-xl bg-emerald-500/8 border border-emerald-500/20 p-3.5">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[9px] font-black uppercase tracking-widest text-emerald-500/70">
                {monthLabel(sub.scheduleMonth)}
              </p>
              <div className="flex items-center gap-1 text-[9px] font-bold text-emerald-400">
                <Check size={10} strokeWidth={3} /> Scheduled
              </div>
            </div>
            <p className="text-sm font-black text-zinc-100">
              {formatDate(sub.thisMonthPick!.chosen_date!)}
            </p>
            <p className="flex items-center gap-1 text-xs text-zinc-400 mt-0.5">
              <Clock size={10} className="text-zinc-600" />
              {sub.thisMonthPick!.chosen_time}
            </p>
            <Link
              href={scheduleUrl}
              className="mt-2 inline-block text-[10px] font-bold text-zinc-600 hover:text-emerald-400 transition-colors"
            >
              Reschedule →
            </Link>
          </div>
        ) : (
          <div className="mb-4 rounded-xl bg-[#D4AF37]/5 border border-[#D4AF37]/15 p-3.5">
            <p className="text-[9px] font-black uppercase tracking-widest text-[#D4AF37]/60 mb-1">
              {monthLabel(sub.scheduleMonth)}
            </p>
            <p className="text-xs text-zinc-500 mb-3">
              You haven&apos;t picked your date yet this month.
            </p>
            <Link
              href={scheduleUrl}
              className="w-full flex items-center justify-center gap-2 bg-[#D4AF37] text-black text-xs font-black uppercase tracking-wider py-2.5 rounded-xl transition-all hover:bg-[#D4AF37]/90 active:scale-[0.98]"
            >
              <Calendar size={12} />
              Schedule Now
              <ChevronRight size={12} />
            </Link>
          </div>
        )}

        {/* Next scheduling email */}
        {nextEmail && (
          <p className="flex items-center gap-1.5 text-[10px] text-zinc-700 mb-4">
            <Repeat size={10} />
            Next reminder: <span className="text-zinc-500">{nextEmail}</span>
          </p>
        )}

        {/* ── What's included ──────────────────────────────────── */}
        {plan && (
          <div className="border-t border-white/[0.05] pt-3 mb-3">
            <button
              onClick={() => setShowFeatures(v => !v)}
              className="w-full flex items-center justify-between text-xs text-zinc-600 hover:text-zinc-400 transition-colors py-1"
            >
              <span className="font-bold">What&apos;s included</span>
              <ChevronDown size={11} className={cn("transition-transform", showFeatures && "rotate-180")} />
            </button>
            {showFeatures && (
              <ul className="mt-2 space-y-1.5">
                {plan.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-[11px] text-zinc-400">
                    <Star size={9} className="text-[#D4AF37] shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* ── Past visits ──────────────────────────────────────── */}
        <div className="border-t border-white/[0.05] pt-3 mb-3">
          <button
            onClick={toggleHistory}
            className="w-full flex items-center justify-between text-xs text-zinc-600 hover:text-zinc-400 transition-colors py-1"
          >
            <span className="font-bold">Past visits</span>
            {loadingHistory
              ? <Loader2 size={11} className="animate-spin" />
              : <ChevronDown size={11} className={cn("transition-transform", showHistory && "rotate-180")} />
            }
          </button>

          {showHistory && (
            <div className="mt-2">
              {history === null || loadingHistory ? (
                <div className="flex justify-center py-3">
                  <Loader2 size={14} className="animate-spin text-zinc-700" />
                </div>
              ) : history.length === 0 ? (
                <p className="text-[10px] text-zinc-700 text-center py-2">No past visits yet.</p>
              ) : (
                <div className="space-y-0.5">
                  {history.slice(0, 6).map(h => (
                    <div key={h.id} className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0 text-xs">
                      <div>
                        <p className="text-zinc-400 font-medium">
                          {new Date(h.booking_date + "T12:00:00").toLocaleDateString("en-US", {
                            month: "short", day: "numeric", year: "numeric",
                          })}
                        </p>
                        {h.booking_time && (
                          <p className="text-[10px] text-zinc-600 mt-0.5">{formatTime(h.booking_time)}</p>
                        )}
                      </div>
                      <span className={cn(
                        "text-[9px] font-bold px-1.5 py-0.5 rounded-full border",
                        h.status === "confirmed" || h.status === "completed"
                          ? "text-emerald-400 border-emerald-500/20 bg-emerald-500/8"
                          : h.status === "cancelled"
                          ? "text-zinc-600 border-zinc-700 bg-zinc-800"
                          : "text-zinc-500 border-zinc-700"
                      )}>
                        {h.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Cancel plan ──────────────────────────────────────── */}
        {!showConfirm ? (
          <button
            onClick={() => setShowConfirm(true)}
            className="w-full text-[10px] text-zinc-700 hover:text-zinc-500 transition-colors py-1.5 uppercase tracking-wider font-bold"
          >
            Cancel plan
          </button>
        ) : (
          <div className="bg-zinc-900 border border-red-500/20 rounded-xl p-3 space-y-2">
            <p className="text-xs text-zinc-400 text-center font-bold">Cancel your {sub.plan_name} plan?</p>
            <p className="text-[10px] text-zinc-600 text-center">
              {sub.payment_method === "cash"
                ? "Your plan will end immediately."
                : "Your plan stays active through the end of the current billing period."}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-2 rounded-lg border border-white/[0.08] text-xs text-zinc-500 font-bold"
              >
                Keep it
              </button>
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="flex-1 py-2 rounded-lg bg-red-500/15 border border-red-500/30 text-xs text-red-400 font-black flex items-center justify-center gap-1"
              >
                {cancelling ? <Loader2 size={12} className="animate-spin" /> : <><X size={12} /> Yes, cancel</>}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
