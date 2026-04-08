"use client";

import { useState } from "react";
import { Crown, Calendar, Repeat, X, Loader2, ChevronRight } from "lucide-react";
import Link from "next/link";
import { cancelMySubscription } from "@/app/actions/monthlySubscriptions";
import { useRouter } from "next/navigation";

type Sub = {
  id: string;
  plan_name: string;
  plan_price: number;
  payment_method: string;
  status: string;
  signup_date: string | null;
  vehicle_make: string | null;
  vehicle_model: string | null;
};

type Props = { sub: Sub; userId: string };

function nextAnniversaryDate(signupDate: string | null): string {
  if (!signupDate) return "";
  const todayStr  = new Date().toISOString().slice(0, 10);  // "YYYY-MM-DD"
  const today     = new Date(todayStr);
  const day       = parseInt(signupDate.slice(8, 10), 10);
  let d = new Date(today.getFullYear(), today.getMonth(), day);
  // Compare as strings to avoid midnight vs. now ambiguity
  const dStr = d.toISOString().slice(0, 10);
  if (dStr <= todayStr) d = new Date(today.getFullYear(), today.getMonth() + 1, day);
  // Handle short months (e.g. signed up on 31st, February)
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  if (day > lastDay) d = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/**
 * The month to schedule: current month if we haven't passed the 20th yet,
 * otherwise next month (so the customer always has plenty of dates to pick).
 */
function scheduleTargetMonth(): string {
  const n   = new Date();
  const use = n.getDate() <= 20
    ? new Date(n.getFullYear(), n.getMonth(), 1)
    : new Date(n.getFullYear(), n.getMonth() + 1, 1);
  return `${use.getFullYear()}-${String(use.getMonth() + 1).padStart(2, "0")}`;
}

export function MonthlyPlanCard({ sub, userId }: Props) {
  const router    = useRouter();
  const [cancelling, setCancelling] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const nextEmail = nextAnniversaryDate(sub.signup_date);

  async function handleCancel() {
    setCancelling(true);
    await cancelMySubscription(sub.id, userId);
    router.refresh();
  }

  return (
    <div className="relative mt-5 rounded-2xl border border-[#D4AF37]/25 bg-zinc-900/60 backdrop-blur-sm overflow-hidden">
      {/* Top gold line */}
      <div className="h-0.5 bg-gradient-to-r from-transparent via-[#D4AF37]/50 to-transparent" />

      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="shrink-0 w-10 h-10 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/20 flex items-center justify-center">
              <Crown size={18} className="text-[#D4AF37]" />
            </div>
            <div>
              <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-[#D4AF37]">Monthly Plan</p>
              <p className="text-sm font-black text-zinc-100">{sub.plan_name}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xl font-black text-[#D4AF37]">${sub.plan_price}</p>
            <p className="text-[10px] text-zinc-600">/month</p>
          </div>
        </div>

        <div className="space-y-2 text-xs text-zinc-500 mb-4">
          {(sub.vehicle_make || sub.vehicle_model) && (
            <p>🚗 {[sub.vehicle_make, sub.vehicle_model].filter(Boolean).join(" ")}</p>
          )}
          <p>💳 {sub.payment_method === "cash" ? "Cash on arrival" : "Card — auto-billed monthly"}</p>
          {nextEmail && (
            <p className="flex items-center gap-1.5">
              <Repeat size={11} className="text-zinc-600" />
              Next scheduling email: <span className="text-zinc-400 font-medium">{nextEmail}</span>
            </p>
          )}
        </div>

        {/* Dashboard schedule picker link */}
        <Link
          href={`/schedule/monthly?month=${scheduleTargetMonth()}&sub=${sub.id}`}
          className="w-full flex items-center justify-center gap-2 bg-[#D4AF37]/10 border border-[#D4AF37]/25 text-[#D4AF37] text-xs font-black uppercase tracking-wider py-3 rounded-xl mb-3 transition-all hover:bg-[#D4AF37]/15"
        >
          <Calendar size={13} />
          Schedule This Month
          <ChevronRight size={13} />
        </Link>

        {/* Cancel */}
        {!showConfirm ? (
          <button
            onClick={() => setShowConfirm(true)}
            className="w-full text-[10px] text-zinc-700 hover:text-zinc-500 transition-colors py-1.5 uppercase tracking-wider font-bold"
          >
            Cancel plan
          </button>
        ) : (
          <div className="bg-zinc-900 border border-red-500/20 rounded-xl p-3 text-center space-y-2">
            <p className="text-xs text-zinc-400">Cancel your {sub.plan_name} plan?</p>
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
