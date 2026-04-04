"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getCouponStats, createCouponAction, toggleCouponAction,
  deleteCouponAction,
} from "@/app/actions/adminActions";
import {
  useRevenueBreakdown, useAllTimeStats, useMonthlyGoal, useSetMonthlyGoal,
} from "@/hooks/use-admin-data";
import { sendStripePaymentLink } from "@/app/actions/sendStripePaymentLink";
import { useToast } from "@/components/admin/Toast";
import { Modal } from "@/components/admin/Modal";
import {
  DollarSign, CreditCard, Banknote, TrendingUp, Target, Ticket,
  ChevronLeft, ChevronRight, Plus, Trash2, Power, Loader2,
  Link, Check, CalendarClock, Receipt, Info,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { to12h } from "@/lib/availability";

type RevExtras = {
  monthUpcomingCount?: number;
  monthUpcomingTotal?: number;
  cancelledInMonthCount?: number;
  yearToDate?: {
    total: number;
    stripe: number;
    cash: number;
    jobCount: number;
    avgTicket: number;
    year: number;
  };
  viewYearSummary?: {
    year: number;
    total: number;
    stripe: number;
    cash: number;
    jobCount: number;
    avgTicket: number;
  };
  futurePipeline?: {
    total: number;
    count: number;
    jobs: Array<{
      id: string;
      customer_name: string | null;
      service_name: string | null;
      booking_date: string;
      booking_time: string | null;
      total_price: number;
      status: string;
    }>;
  };
  recentEarned?: Array<{
    id: string;
    customer_name: string | null;
    service_name: string | null;
    booking_date: string;
    status: string;
    total_price: number;
    is_stripe: boolean;
  }>;
  earnedLogic?: string;
};

export default function MoneyPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [monthOffset, setMonthOffset] = useState(0);
  const [tab, setTab] = useState<"overview" | "pipeline" | "unpaid" | "services" | "coupons">("overview");
  const [showGoalEdit, setShowGoalEdit] = useState(false);
  const [goalInput, setGoalInput] = useState("");
  const [showNewCoupon, setShowNewCoupon] = useState(false);
  const [newCoupon, setNewCoupon] = useState({ code: "", type: "percentage", value: "" });
  const [creating, setCreating] = useState(false);

  const { data: rev, isLoading: revLoading } = useRevenueBreakdown(monthOffset);
  const { data: allTime, isLoading: atLoading } = useAllTimeStats();
  const { data: goal } = useMonthlyGoal();
  const setGoal = useSetMonthlyGoal();

  const rx = rev as typeof rev & RevExtras | undefined;

  const { data: coupons, isLoading: cLoading } = useQuery({
    queryKey: ["admin", "coupons"],
    queryFn: async () => await getCouponStats(),
  });

  const toggleMut = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) => toggleCouponAction(id, is_active),
    onSuccess: () => {
      toast("Updated");
      queryClient.invalidateQueries({ queryKey: ["admin", "coupons"] });
    },
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteCouponAction(id),
    onSuccess: () => {
      toast("Deleted");
      queryClient.invalidateQueries({ queryKey: ["admin", "coupons"] });
    },
  });

  const goalPct = goal && rev ? Math.min(100, (rev.totalRevenue / goal) * 100) : 0;

  const monthLabel = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + monthOffset);
    return format(d, "MMMM yyyy");
  }, [monthOffset]);

  async function handleCreateCoupon() {
    if (!newCoupon.code || !newCoupon.value) {
      toast("Code and value required", "error");
      return;
    }
    setCreating(true);
    try {
      await createCouponAction({
        code: newCoupon.code.toUpperCase().trim(),
        discount_percentage: newCoupon.type === "percentage" ? Number(newCoupon.value) : undefined,
        discount_amount: newCoupon.type === "amount" ? Number(newCoupon.value) : undefined,
      });
      toast("Coupon created!");
      setShowNewCoupon(false);
      setNewCoupon({ code: "", type: "percentage", value: "" });
      queryClient.invalidateQueries({ queryKey: ["admin", "coupons"] });
    } catch {
      toast("Failed", "error");
    } finally {
      setCreating(false);
    }
  }

  async function handleResendStripeLink(b: any) {
    const email = b.customer_email;
    if (!email) {
      toast("No email on file", "error");
      return;
    }
    try {
      const r = await sendStripePaymentLink(b.id, {
        serviceName: b.service_name ?? "Detailing Service",
        totalPrice: Number(b.total_price),
        vehicleYear: b.vehicle_year ?? undefined,
        vehicleMake: b.vehicle_make ?? undefined,
        vehicleModel: b.vehicle_model ?? undefined,
        vehicleSize: b.vehicle_size ?? undefined,
        bookingDate: b.booking_date ?? "",
        bookingTime: b.booking_time ?? "",
        customerEmail: email,
      });
      if ("url" in r) toast("Stripe link sent!");
      else toast(r.error ?? "Failed", "error");
    } catch {
      toast("Failed", "error");
    }
  }

  const tabs = [
    { id: "overview" as const, label: "Overview" },
    { id: "pipeline" as const, label: `Pipeline${rx?.futurePipeline?.count ? ` (${rx.futurePipeline.count})` : ""}` },
    { id: "unpaid" as const, label: `Unpaid${rev?.unpaid?.length ? ` (${rev.unpaid.length})` : ""}` },
    { id: "services" as const, label: "By service" },
    { id: "coupons" as const, label: "Coupons" },
  ];

  return (
    <div className="px-4 pt-4 pb-10 max-w-2xl mx-auto space-y-5">

      <div className="flex items-start justify-between gap-3">
        <h1 className="text-xl font-black">Money</h1>
        {atLoading ? (
          <Loader2 className="animate-spin text-amber-500 shrink-0" size={20} />
        ) : allTime ? (
          <div className="text-right">
            <p className="text-[9px] font-black uppercase tracking-widest text-zinc-600">All-time earned</p>
            <p className="text-lg font-black text-amber-500">${allTime.totalRevenue.toFixed(0)}</p>
            <p className="text-[10px] text-zinc-600">{allTime.jobCount} jobs</p>
          </div>
        ) : null}
      </div>

      <div className="flex items-start gap-2 rounded-2xl border border-amber-500/20 bg-amber-500/5 px-3 py-2.5 text-[11px] leading-snug text-zinc-400">
        <Info size={14} className="text-amber-500 shrink-0 mt-0.5" />
        <span>
          <strong className="text-zinc-300">Paid</strong> = scheduled date is before today and the job is{" "}
          <strong className="text-zinc-300">not cancelled</strong>. <strong className="text-zinc-300">Upcoming</strong>{" "}
          = today or a future date on the calendar (not cancelled). Status like &quot;completed&quot; is ignored. Personal
          blocks excluded.
        </span>
      </div>

      {/* Year-to-date (always current calendar year) */}
      {!revLoading && rx?.yearToDate && (
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-3">
            <p className="text-[9px] font-black uppercase tracking-widest text-zinc-600">YTD {rx.yearToDate.year}</p>
            <p className="text-xl font-black text-white">${rx.yearToDate.total.toFixed(0)}</p>
            <p className="text-[10px] text-zinc-500">{rx.yearToDate.jobCount} jobs · avg ${rx.yearToDate.avgTicket.toFixed(0)}</p>
          </div>
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-3">
            <p className="text-[9px] font-black uppercase tracking-widest text-zinc-600">YTD split</p>
            <p className="text-sm font-bold text-sky-400">Stripe ${rx.yearToDate.stripe.toFixed(0)}</p>
            <p className="text-sm font-bold text-emerald-400">Cash ${rx.yearToDate.cash.toFixed(0)}</p>
          </div>
        </div>
      )}

      {/* Month navigation */}
      <div className="flex items-center justify-between rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
        <button
          type="button"
          onClick={() => setMonthOffset((o) => o - 1)}
          className="rounded-lg p-1.5 transition-all hover:bg-white/[0.06] active:scale-90"
        >
          <ChevronLeft size={16} />
        </button>
        <span className="text-sm font-black">{monthLabel}</span>
        <button
          type="button"
          onClick={() => setMonthOffset((o) => Math.min(0, o + 1))}
          disabled={monthOffset >= 0}
          className="rounded-lg p-1.5 transition-all hover:bg-white/[0.06] active:scale-90 disabled:opacity-30"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {revLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="animate-spin text-amber-500" size={28} />
        </div>
      ) : rev ? (
        <>
          <div className="grid grid-cols-2 gap-3">
            <RevenueCard
              icon={<DollarSign size={16} />}
              label="Month earned"
              value={`$${rev.totalRevenue.toFixed(0)}`}
              sub={`${rev.jobCount} job${rev.jobCount !== 1 ? "s" : ""}`}
              gold
            />
            <RevenueCard icon={<TrendingUp size={16} />} label="Avg ticket" value={`$${rev.avgTicket.toFixed(0)}`} />
            <RevenueCard
              icon={<CreditCard size={16} />}
              label="Stripe (month)"
              value={`$${rev.stripeRevenue.toFixed(0)}`}
              sub="Card / Pay now"
            />
            <RevenueCard
              icon={<Banknote size={16} />}
              label="Cash / at arrival"
              value={`$${rev.cashRevenue.toFixed(0)}`}
              sub="Counted from notes"
            />
          </div>

          {(rx?.monthUpcomingCount != null || rx?.cancelledInMonthCount != null) && (
            <div className="flex flex-col gap-2 sm:flex-row sm:text-center text-[10px] font-black uppercase tracking-wider text-zinc-500">
              <span className="flex-1 rounded-xl border border-white/[0.06] bg-white/[0.02] py-2">
                Upcoming this month <span className="text-sky-400">{rx?.monthUpcomingCount ?? 0}</span>
                {rx?.monthUpcomingTotal != null && rx.monthUpcomingTotal > 0 && (
                  <span className="block text-[9px] font-bold text-zinc-600 normal-case tracking-normal">
                    ${rx.monthUpcomingTotal.toFixed(0)} scheduled
                  </span>
                )}
              </span>
              <span className="flex-1 rounded-xl border border-white/[0.06] bg-white/[0.02] py-2">
                Cancelled this month <span className="text-zinc-600">{rx?.cancelledInMonthCount ?? 0}</span>
              </span>
            </div>
          )}

          {/* Full year of the month you're viewing */}
          {rx?.viewYearSummary && (
            <div className="space-y-2">
              <p className="text-[9px] font-black uppercase tracking-widest text-zinc-600">
                Calendar {rx.viewYearSummary.year} (earned, full year)
              </p>
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
                <div className="flex items-end justify-between gap-2">
                  <div>
                    <p className="text-2xl font-black text-amber-500">${rx.viewYearSummary.total.toFixed(0)}</p>
                    <p className="text-[11px] text-zinc-500">
                      {rx.viewYearSummary.jobCount} jobs · avg ${rx.viewYearSummary.avgTicket.toFixed(0)}
                    </p>
                  </div>
                  <div className="text-right text-[11px]">
                    <p className="text-sky-400">Stripe ${rx.viewYearSummary.stripe.toFixed(0)}</p>
                    <p className="text-emerald-400">Cash ${rx.viewYearSummary.cash.toFixed(0)}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Future pipeline */}
          {rx?.futurePipeline && (
            <div className="space-y-2">
              <p className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-zinc-600">
                <CalendarClock size={12} className="text-amber-500" /> Upcoming payments (on the calendar)
              </p>
              <div className="rounded-2xl border border-sky-500/20 bg-sky-500/5 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-black text-sky-400">${rx.futurePipeline.total.toFixed(0)}</p>
                    <p className="text-[11px] text-zinc-500">
                      {rx.futurePipeline.count} detail{rx.futurePipeline.count !== 1 ? "s" : ""} (today + future, not cancelled)
                    </p>
                  </div>
                  <Receipt className="text-sky-500/50" size={28} />
                </div>
              </div>
            </div>
          )}
        </>
      ) : null}

      {/* Goal */}
      {goal !== undefined && rev && (
        <div className="space-y-2 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target size={14} className="text-amber-500" />
              <span className="text-xs font-black uppercase tracking-widest">Monthly goal</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setGoalInput(String(goal));
                setShowGoalEdit(true);
              }}
              className="text-[9px] font-black uppercase tracking-widest text-zinc-600 hover:text-amber-500"
            >
              Edit
            </button>
          </div>
          <div className="flex items-baseline justify-between text-sm">
            <span className="font-black text-white">${rev.totalRevenue.toFixed(0)}</span>
            <span className="text-zinc-600">/ ${goal.toLocaleString()}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-700",
                goalPct >= 100 ? "bg-emerald-500" : "bg-amber-500"
              )}
              style={{ width: `${goalPct}%` }}
            />
          </div>
          <p className="text-[9px] font-bold text-zinc-600">
            {goalPct.toFixed(0)}% of goal
            {goalPct >= 100 ? " — CRUSHED IT!" : ` — $${Math.max(0, goal - rev.totalRevenue).toFixed(0)} to go`}
          </p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto rounded-xl bg-white/[0.03] p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "whitespace-nowrap rounded-lg px-2 py-2 text-[9px] font-black uppercase tracking-wider transition-all",
              tab === t.id ? "bg-amber-500 text-black" : "text-zinc-500"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && rev && (
        <div className="space-y-3">
          <p className="text-[9px] font-black uppercase tracking-widest text-zinc-600">Earned this month</p>
          {!rx?.recentEarned?.length ? (
            <p className="py-6 text-center text-sm text-zinc-600">No completed or cancelled jobs in this month yet.</p>
          ) : (
            <div className="space-y-2">
              {rx.recentEarned.map((j) => (
                <div
                  key={j.id}
                  className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold">{j.customer_name ?? "Customer"}</p>
                    <p className="truncate text-xs text-zinc-500">
                      {j.service_name ?? "Service"} · {format(new Date(j.booking_date + "T12:00:00"), "MMM d")}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-black text-amber-500">${j.total_price.toFixed(0)}</p>
                    <span className="text-[8px] font-black uppercase text-emerald-400">
                      Paid · {j.status ?? "—"}{" "}
                      {j.is_stripe ? "· Card" : "· Cash"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "pipeline" && rx?.futurePipeline && (
        <div className="space-y-2">
          {!rx.futurePipeline.jobs.length ? (
            <p className="py-8 text-center text-sm text-zinc-600">No upcoming appointments on the calendar.</p>
          ) : (
            rx.futurePipeline.jobs.map((j) => (
              <div key={j.id} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold">{j.customer_name ?? "Customer"}</p>
                    <p className="truncate text-xs text-zinc-500">{j.service_name}</p>
                    <p className="mt-1 text-[11px] text-zinc-600">
                      {format(new Date(j.booking_date + "T12:00:00"), "EEE MMM d")}
                      {j.booking_time ? ` · ${to12h(String(j.booking_time).slice(0, 5))}` : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-sky-400">${j.total_price.toFixed(0)}</p>
                    <span className="text-[8px] font-bold uppercase text-zinc-600">{j.status}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === "unpaid" && (
        <div className="space-y-2">
          {!rev?.unpaid?.length ? (
            <div className="py-8 text-center">
              <Check size={28} className="mx-auto mb-2 text-emerald-500" />
              <p className="text-sm text-zinc-500">No unpaid invoices — pending_payment queue is clear.</p>
            </div>
          ) : (
            rev.unpaid.map((b: any) => (
              <div key={b.id} className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{b.customer_name ?? "Unknown"}</p>
                  <p className="truncate text-xs text-zinc-500">
                    {b.service_name} · {b.booking_date}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-black text-amber-500">${Number(b.total_price).toFixed(0)}</p>
                  {b.is_stripe && <span className="text-[9px] font-bold text-sky-400">STRIPE</span>}
                </div>
                <button
                  type="button"
                  onClick={() => handleResendStripeLink(b)}
                  className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-2 text-amber-500 transition-all hover:bg-amber-500/20 active:scale-90"
                  title="Send Stripe link"
                >
                  <Link size={14} />
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {tab === "services" && rev && (
        <div className="space-y-2">
          {!rev.byService?.length ? (
            <p className="py-8 text-center text-sm text-zinc-600">No paid jobs (past dates) in this month.</p>
          ) : (
            rev.byService.map((s: any) => {
              const pct = rev.totalRevenue > 0 ? (s.revenue / rev.totalRevenue) * 100 : 0;
              return (
                <div key={s.name} className="space-y-2 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex-1 truncate pr-2 font-bold">{s.name}</span>
                    <span className="shrink-0 font-black text-amber-500">${s.revenue.toFixed(0)}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                      <div className="h-full rounded-full bg-amber-500/60" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="shrink-0 text-[10px] font-bold text-zinc-600">
                      {s.count} job{s.count !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {tab === "coupons" && (
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => setShowNewCoupon(true)}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-amber-500/30 py-3 text-xs font-black uppercase tracking-wider text-amber-500 transition-all hover:border-amber-500/60 active:scale-95"
          >
            <Plus size={14} /> New coupon
          </button>

          {cLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="animate-spin text-amber-500" size={20} />
            </div>
          ) : !coupons?.length ? (
            <p className="py-6 text-center text-sm text-zinc-600">No coupons yet.</p>
          ) : (
            coupons.map((c: any) => (
              <div key={c.id} className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className={cn("text-sm font-black", c.is_active ? "text-white" : "text-zinc-600 line-through")}>
                      {c.code}
                    </span>
                    {c.is_active ? (
                      <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider text-emerald-400">
                        Active
                      </span>
                    ) : (
                      <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider text-zinc-600">
                        Off
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    {c.discount_percentage ? `${c.discount_percentage}% off` : `$${c.discount_amount} off`}
                    {" · "}
                    {c.usage_count} use{c.usage_count !== 1 ? "s" : ""} · ${c.revenue_generated.toFixed(0)} rev
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => toggleMut.mutate({ id: c.id, is_active: !c.is_active })}
                  className={cn(
                    "rounded-lg border p-2 text-xs transition-all active:scale-90",
                    c.is_active
                      ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                      : "border-white/[0.08] bg-white/[0.03] text-zinc-600"
                  )}
                >
                  <Power size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm("Delete coupon?")) deleteMut.mutate(c.id);
                  }}
                  className="rounded-lg border border-red-500/20 bg-red-500/10 p-2 text-red-400 transition-all active:scale-90"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))
          )}
        </div>
      )}

      <Modal open={showGoalEdit} onClose={() => setShowGoalEdit(false)}>
        <div className="space-y-4">
          <h2 className="flex items-center gap-2 text-lg font-black">
            <Target size={16} className="text-amber-500" /> Monthly goal
          </h2>
          <div>
            <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-zinc-500">Goal amount ($)</p>
            <input
              type="number"
              value={goalInput}
              onChange={(e) => setGoalInput(e.target.value)}
              placeholder="5000"
              className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 text-sm text-white focus:border-amber-500/50 focus:outline-none"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowGoalEdit(false)}
              className="flex-1 rounded-xl border border-white/[0.08] py-3 text-sm font-black uppercase tracking-wider text-zinc-400"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={async () => {
                if (!goalInput) return;
                await setGoal.mutateAsync(Number(goalInput));
                toast("Goal updated!");
                setShowGoalEdit(false);
              }}
              disabled={setGoal.isPending}
              className="flex-1 rounded-xl bg-amber-500 py-3 text-sm font-black uppercase tracking-wider text-black active:scale-95"
            >
              Save
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={showNewCoupon} onClose={() => setShowNewCoupon(false)}>
        <div className="space-y-4">
          <h2 className="flex items-center gap-2 text-lg font-black">
            <Ticket size={16} className="text-amber-500" /> New coupon
          </h2>
          <div>
            <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-zinc-500">Code</p>
            <input
              value={newCoupon.code}
              onChange={(e) => setNewCoupon((p) => ({ ...p, code: e.target.value.toUpperCase() }))}
              placeholder="SUMMER25"
              className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 text-sm text-white focus:border-amber-500/50 focus:outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setNewCoupon((p) => ({ ...p, type: "percentage" }))}
              className={cn(
                "rounded-xl border py-2 text-xs font-black transition-all",
                newCoupon.type === "percentage" ? "border-amber-500 bg-amber-500 text-black" : "border-white/[0.08] text-zinc-400"
              )}
            >
              % off
            </button>
            <button
              type="button"
              onClick={() => setNewCoupon((p) => ({ ...p, type: "amount" }))}
              className={cn(
                "rounded-xl border py-2 text-xs font-black transition-all",
                newCoupon.type === "amount" ? "border-amber-500 bg-amber-500 text-black" : "border-white/[0.08] text-zinc-400"
              )}
            >
              $ off
            </button>
          </div>
          <div>
            <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-zinc-500">Value</p>
            <input
              type="number"
              value={newCoupon.value}
              onChange={(e) => setNewCoupon((p) => ({ ...p, value: e.target.value }))}
              placeholder={newCoupon.type === "percentage" ? "15" : "20"}
              className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 text-sm text-white focus:border-amber-500/50 focus:outline-none"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowNewCoupon(false)}
              className="flex-1 rounded-xl border border-white/[0.08] py-3 text-sm font-black uppercase tracking-wider text-zinc-400"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCreateCoupon}
              disabled={creating}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-amber-500 py-3 text-sm font-black uppercase tracking-wider text-black active:scale-95"
            >
              {creating ? <Loader2 className="animate-spin" size={16} /> : (
                <>
                  <Plus size={14} /> Create
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function RevenueCard({
  icon,
  label,
  value,
  sub,
  gold,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  gold?: boolean;
}) {
  return (
    <div
      className={cn(
        "space-y-1 rounded-2xl border p-4",
        gold ? "border-amber-500/20 bg-amber-500/[0.04]" : "border-white/[0.06]"
      )}
    >
      <div
        className={cn(
          "flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest",
          gold ? "text-amber-500" : "text-zinc-600"
        )}
      >
        {icon} {label}
      </div>
      <p className={cn("text-2xl font-black", gold ? "text-amber-500" : "text-white")}>{value}</p>
      {sub && <p className="text-[10px] font-medium text-zinc-600">{sub}</p>}
    </div>
  );
}
