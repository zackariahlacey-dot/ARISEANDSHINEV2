"use client";

/**
 * Drop-in button + modal for enrolling a completed Light Detailing booking
 * into a monthly recurring plan. Renders only when the booking is a Light
 * Detailing service that isn't already part of a recurring plan.
 */

import { useState } from "react";
import { Repeat, Loader2 } from "lucide-react";
import { Modal } from "@/components/admin/Modal";
import { useToast } from "@/components/admin/Toast";
import { enrollBookingInRecurring } from "@/app/actions/recurringActions";

type BookingLike = {
  id: string;
  service_name?: string | null;
  status?: string | null;
  recurring_booking_id?: string | null;
  total_price?: number | null;
  booking_time?: string | null;
};

const DOW = [
  { v: 0, label: "Sun" }, { v: 1, label: "Mon" }, { v: 2, label: "Tue" },
  { v: 3, label: "Wed" }, { v: 4, label: "Thu" }, { v: 5, label: "Fri" },
  { v: 6, label: "Sat" },
];

const inputCls =
  "w-full bg-[#111] border border-[#2e2e2e] rounded-xl px-3 py-2.5 text-[12px] text-white focus:outline-none focus:border-amber-500/50 transition-colors";

export function EnrollRecurringButton({
  booking,
  onEnrolled,
}: {
  booking: BookingLike;
  onEnrolled?: () => void;
}) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [intervalDays, setIntervalDays] = useState(30);
  const [dow, setDow] = useState<number | "">("");
  const [time, setTime] = useState<string>((booking.booking_time ?? "").slice(0, 5));
  const [discountPct, setDiscountPct] = useState(10);

  const isLight = (booking.service_name ?? "").toLowerCase().includes("light detail");
  const alreadyEnrolled = !!booking.recurring_booking_id;
  const isCompleted = (booking.status ?? "").toLowerCase() === "completed";

  if (!isLight || alreadyEnrolled || !isCompleted) return null;

  const monthlyPrice = booking.total_price != null
    ? booking.total_price * (1 - discountPct / 100)
    : null;

  async function submit() {
    setBusy(true);
    try {
      const r = await enrollBookingInRecurring({
        bookingId: booking.id,
        intervalDays,
        preferredDayOfWeek: dow === "" ? undefined : dow,
        preferredTime: time ? `${time}:00` : undefined,
        discountPct,
      });
      if (r.success) {
        toast("Enrolled in monthly plan");
        setOpen(false);
        onEnrolled?.();
      } else {
        toast(r.error ?? "Enroll failed", "error");
      }
    } catch {
      toast("Enroll failed", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[11px] font-black uppercase tracking-wider text-amber-300 hover:bg-amber-500/15 transition-all"
      >
        <Repeat size={12} />
        Enroll in Monthly
        {monthlyPrice != null && (
          <span className="ml-1 opacity-80">
            (${monthlyPrice.toFixed(0)}/mo · {discountPct}% off)
          </span>
        )}
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Enroll in Monthly Plan">
        <div className="space-y-4">
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-500 mb-1.5">
              Repeat every (days)
            </label>
            <input
              type="number"
              min={1}
              value={intervalDays}
              onChange={e => setIntervalDays(parseInt(e.target.value, 10) || 30)}
              className={inputCls}
            />
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-500 mb-1.5">
              Preferred day of week (optional)
            </label>
            <div className="flex gap-1 flex-wrap">
              <button
                type="button"
                onClick={() => setDow("")}
                className={
                  "px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider border " +
                  (dow === "" ? "border-amber-500/50 bg-amber-500/15 text-amber-300" : "border-white/[0.06] bg-white/[0.02] text-zinc-500")
                }
              >
                Any
              </button>
              {DOW.map(d => (
                <button
                  key={d.v}
                  type="button"
                  onClick={() => setDow(d.v)}
                  className={
                    "px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider border " +
                    (dow === d.v ? "border-amber-500/50 bg-amber-500/15 text-amber-300" : "border-white/[0.06] bg-white/[0.02] text-zinc-500")
                  }
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-500 mb-1.5">
              Preferred time
            </label>
            <input
              type="time"
              value={time}
              onChange={e => setTime(e.target.value)}
              className={inputCls}
            />
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-500 mb-1.5">
              Discount %
            </label>
            <input
              type="number"
              min={0}
              max={100}
              value={discountPct}
              onChange={e => setDiscountPct(parseFloat(e.target.value) || 0)}
              className={inputCls}
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex-1 px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.06] text-[11px] font-black uppercase tracking-wider text-zinc-400 hover:text-white transition-all"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={busy}
              className="flex-1 px-4 py-3 rounded-xl bg-amber-500 text-black text-[11px] font-black uppercase tracking-wider hover:bg-amber-400 transition-all disabled:opacity-60 inline-flex items-center justify-center gap-1.5"
            >
              {busy && <Loader2 size={12} className="animate-spin" />}
              Enroll
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
