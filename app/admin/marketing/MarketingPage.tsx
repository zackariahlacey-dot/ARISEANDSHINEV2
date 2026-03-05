"use client";

import { useState } from "react";
import {
  Tag,
  Plus,
  ToggleLeft,
  ToggleRight,
  Loader2,
  Check,
  X,
  AlertCircle,
  Send,
  Mail,
  Percent,
  DollarSign,
  FlaskConical,
  Users,
} from "lucide-react";
import { createCoupon, type CouponRow } from "@/app/actions/createCoupon";
import { toggleCoupon } from "@/app/actions/toggleCoupon";
import { sendEmailBlast } from "@/app/actions/sendEmailBlast";

// ── Coupon Manager ────────────────────────────────────────────────────────────

function CouponManager({
  initialCoupons,
}: {
  initialCoupons: CouponRow[];
}) {
  const [coupons, setCoupons] = useState<CouponRow[]>(initialCoupons);

  // Form state
  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState<"amount" | "percentage">("amount");
  const [discountValue, setDiscountValue] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState(false);

  // Per-coupon toggle loading
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const handleCreate = async () => {
    const val = parseFloat(discountValue);
    if (!code.trim()) { setCreateError("Code is required."); return; }
    if (isNaN(val) || val <= 0) { setCreateError("Enter a valid discount value."); return; }

    setCreating(true);
    setCreateError(null);
    setCreateSuccess(false);

    const result = await createCoupon({
      code: code.trim().toUpperCase(),
      discountType,
      discountValue: val,
      isActive,
    });

    setCreating(false);
    if (result.success && result.coupon) {
      setCoupons((prev) => [result.coupon!, ...prev]);
      setCode("");
      setDiscountValue("");
      setIsActive(true);
      setCreateSuccess(true);
      setTimeout(() => setCreateSuccess(false), 3000);
    } else {
      setCreateError(result.error ?? "Failed to create coupon.");
    }
  };

  const handleToggle = async (coupon: CouponRow) => {
    setTogglingId(coupon.id);
    const newVal = !coupon.is_active;
    const result = await toggleCoupon(coupon.id, newVal);
    setTogglingId(null);
    if (result.success) {
      setCoupons((prev) =>
        prev.map((c) => (c.id === coupon.id ? { ...c, is_active: newVal } : c))
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* Create form */}
      <div className="rounded-2xl border border-white/[0.06] bg-zinc-900/60 p-5 md:p-6">
        <div className="flex items-center gap-2 mb-5">
          <Plus size={15} className="text-[#D4AF37]" />
          <h3 className="text-sm font-bold text-white">Create New Promo Code</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Code */}
          <div className="lg:col-span-1">
            <label className="block text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-500 mb-1.5">
              Code
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="LABORDAY25"
              className="w-full bg-zinc-950/60 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-700 font-mono tracking-wider focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/40 transition-all"
            />
          </div>

          {/* Discount type toggle */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-500 mb-1.5">
              Type
            </label>
            <div className="flex rounded-xl bg-zinc-950/60 border border-zinc-800 overflow-hidden">
              {(["amount", "percentage"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setDiscountType(t)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold transition-all ${
                    discountType === t
                      ? "bg-[#D4AF37]/15 text-[#D4AF37] border-[#D4AF37]/20"
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  {t === "amount" ? (
                    <DollarSign size={12} />
                  ) : (
                    <Percent size={12} />
                  )}
                  {t === "amount" ? "Flat $" : "Percent %"}
                </button>
              ))}
            </div>
          </div>

          {/* Value */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-500 mb-1.5">
              Value
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 text-sm font-bold">
                {discountType === "amount" ? "$" : "%"}
              </span>
              <input
                type="number"
                min={0}
                max={discountType === "percentage" ? 100 : undefined}
                step={discountType === "amount" ? 5 : 1}
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                placeholder={discountType === "amount" ? "25.00" : "10"}
                className="w-full bg-zinc-950/60 border border-zinc-800 rounded-xl pl-8 pr-4 py-2.5 text-sm text-white placeholder-zinc-700 focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/40 transition-all tabular-nums"
              />
            </div>
          </div>

          {/* Active + Submit */}
          <div className="flex flex-col gap-2">
            <label className="block text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-500 mb-1.5">
              Active on Create
            </label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsActive((v) => !v)}
                className={`transition-colors ${
                  isActive ? "text-emerald-400" : "text-zinc-600"
                }`}
              >
                {isActive ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
              </button>
              <span className="text-xs text-zinc-400">
                {isActive ? "Active" : "Inactive"}
              </span>
            </div>
          </div>
        </div>

        {/* Error / success */}
        {createError && (
          <div className="mt-4 flex items-center gap-2 bg-red-950/40 border border-red-800/40 rounded-xl px-4 py-2.5 text-xs text-red-300">
            <AlertCircle size={13} className="shrink-0 text-red-400" />
            {createError}
          </div>
        )}
        {createSuccess && (
          <div className="mt-4 flex items-center gap-2 bg-emerald-950/40 border border-emerald-800/40 rounded-xl px-4 py-2.5 text-xs text-emerald-300">
            <Check size={13} className="shrink-0" />
            Coupon created successfully!
          </div>
        )}

        <div className="mt-5 flex justify-end">
          <button
            onClick={handleCreate}
            disabled={creating}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
              creating
                ? "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                : "bg-[#D4AF37] hover:bg-[#c9a430] text-zinc-950"
            }`}
          >
            {creating ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Plus size={14} strokeWidth={2.5} />
            )}
            {creating ? "Creating…" : "Create Coupon"}
          </button>
        </div>
      </div>

      {/* Coupon table */}
      <div className="rounded-2xl border border-white/[0.06] bg-zinc-900/60 overflow-hidden">
        <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white">Active Codes</h3>
            <p className="text-[10px] text-zinc-500 mt-0.5">
              {coupons.length} code{coupons.length !== 1 ? "s" : ""} total
            </p>
          </div>
          <Tag size={15} className="text-zinc-600" />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[540px]">
            <thead>
              <tr className="border-b border-white/[0.04]">
                {["Code", "Discount", "Status", "Created", "Toggle"].map((h) => (
                  <th
                    key={h}
                    className="text-left px-5 py-3 text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-600"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {coupons.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-zinc-600 text-sm">
                    No coupons yet — create one above.
                  </td>
                </tr>
              ) : (
                coupons.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-white/[0.03] hover:bg-white/[0.015] transition-colors"
                  >
                    <td className="px-5 py-3.5">
                      <span className="font-mono text-xs font-bold text-zinc-200 bg-zinc-800/60 border border-zinc-700/50 px-2.5 py-1 rounded-lg">
                        {c.code}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      {c.discount_percentage != null ? (
                        <div className="flex items-center gap-1 text-xs font-bold text-emerald-400">
                          <Percent size={11} />
                          {c.discount_percentage}% off
                        </div>
                      ) : c.discount_amount != null ? (
                        <div className="flex items-center gap-1 text-xs font-bold text-emerald-400">
                          <DollarSign size={11} />
                          ${Number(c.discount_amount).toFixed(2)} off
                        </div>
                      ) : (
                        <span className="text-zinc-600 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold border ${
                          c.is_active
                            ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/20"
                            : "bg-zinc-800/60 text-zinc-500 border-zinc-700/40"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            c.is_active ? "bg-emerald-400" : "bg-zinc-600"
                          }`}
                        />
                        {c.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-[10px] text-zinc-600">
                      {c.created_at
                        ? new Date(c.created_at).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })
                        : "—"}
                    </td>
                    <td className="px-5 py-3.5">
                      <button
                        onClick={() => handleToggle(c)}
                        disabled={togglingId === c.id}
                        className={`transition-colors ${
                          togglingId === c.id
                            ? "text-zinc-700"
                            : c.is_active
                            ? "text-emerald-400 hover:text-zinc-500"
                            : "text-zinc-600 hover:text-emerald-400"
                        }`}
                        title={c.is_active ? "Deactivate" : "Activate"}
                      >
                        {togglingId === c.id ? (
                          <Loader2 size={22} className="animate-spin" />
                        ) : c.is_active ? (
                          <ToggleRight size={24} />
                        ) : (
                          <ToggleLeft size={24} />
                        )}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Email Blast Composer ──────────────────────────────────────────────────────

function EmailBlastComposer({ recipientCount }: { recipientCount: number }) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [testOnly, setTestOnly] = useState(true);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{
    type: "success" | "error";
    msg: string;
  } | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleSend = async () => {
    setConfirmOpen(false);
    setSending(true);
    setResult(null);

    const res = await sendEmailBlast({ subject, body, testOnly });
    setSending(false);

    if (res.success) {
      setResult({
        type: "success",
        msg: testOnly
          ? `Test email sent to admin inbox.`
          : `Sent to ${res.sent} customer${(res.sent ?? 0) !== 1 ? "s" : ""}${
              (res.skipped ?? 0) > 0 ? ` (${res.skipped} failed)` : ""
            }.`,
      });
      if (!testOnly) {
        setSubject("");
        setBody("");
      }
    } else {
      setResult({ type: "error", msg: res.error ?? "Send failed." });
    }
  };

  const canSend = subject.trim().length > 0 && body.trim().length > 0;

  return (
    <>
      {/* Confirm modal (full send only) */}
      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm"
            onClick={() => setConfirmOpen(false)}
          />
          <div className="relative z-10 w-full max-w-sm bg-zinc-900 border border-white/[0.08] rounded-2xl p-6 shadow-2xl">
            <h4 className="text-base font-bold text-white mb-2">
              Send to all customers?
            </h4>
            <p className="text-sm text-zinc-400 mb-5">
              This will send &ldquo;{subject}&rdquo; to{" "}
              <strong className="text-white">{recipientCount} customers</strong>{" "}
              with an email address. This cannot be undone.
            </p>
            <div className="flex gap-2.5 justify-end">
              <button
                onClick={() => setConfirmOpen(false)}
                className="px-4 py-2 rounded-xl text-sm text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.05] transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSend}
                className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold bg-[#D4AF37] hover:bg-[#c9a430] text-zinc-950 transition-all"
              >
                <Send size={13} />
                Confirm Send
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-white/[0.06] bg-zinc-900/60 p-5 md:p-6 space-y-5">
        <div className="flex items-center gap-2">
          <Mail size={15} className="text-[#D4AF37]" />
          <h3 className="text-sm font-bold text-white">Email Blast Composer</h3>
          <div className="ml-auto flex items-center gap-1.5 text-[10px] text-zinc-500">
            <Users size={11} />
            {recipientCount} email{recipientCount !== 1 ? "s" : ""} in list
          </div>
        </div>

        {/* Subject */}
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-500 mb-1.5">
            Subject Line
          </label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="e.g. Fall Special — 15% Off This Weekend Only!"
            className="w-full bg-zinc-950/60 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-700 focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/40 transition-all"
          />
        </div>

        {/* Body */}
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-500 mb-1.5">
            Email Body
          </label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={10}
            placeholder={`Hi there,\n\nWe're running a special this weekend — book any detail and save 15% with code FALL15 at checkout.\n\nSpots are limited, so grab yours before they're gone.\n\nThanks for being a valued Arise And Shine VT customer!\n\n— Zack`}
            className="w-full bg-zinc-950/60 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-700 focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/40 transition-all resize-none leading-relaxed"
          />
          <p className="text-[10px] text-zinc-600 mt-1.5">
            Plain text only — line breaks are preserved. A &ldquo;Book Your Detail&rdquo; button is appended automatically.
          </p>
        </div>

        {/* Test mode toggle */}
        <div className="flex items-center gap-3 p-4 rounded-xl bg-zinc-950/40 border border-zinc-800/60">
          <button
            type="button"
            onClick={() => setTestOnly((v) => !v)}
            className={`transition-colors shrink-0 ${
              testOnly ? "text-[#D4AF37]" : "text-zinc-600"
            }`}
          >
            {testOnly ? <ToggleRight size={26} /> : <ToggleLeft size={26} />}
          </button>
          <div>
            <div className="flex items-center gap-2">
              <FlaskConical size={13} className="text-zinc-500" />
              <span className="text-xs font-semibold text-zinc-200">
                Test Send to Admin Only
              </span>
            </div>
            <p className="text-[10px] text-zinc-500 mt-0.5">
              {testOnly
                ? "Email will go to your admin inbox only — safe to test formatting."
                : `Live blast to all ${recipientCount} customers. Use the test mode first!`}
            </p>
          </div>
          {!testOnly && (
            <span className="ml-auto shrink-0 px-2 py-1 rounded-lg bg-amber-500/15 border border-amber-500/25 text-[10px] font-bold text-amber-400">
              LIVE
            </span>
          )}
        </div>

        {/* Result feedback */}
        {result && (
          <div
            className={`flex items-center gap-2 rounded-xl px-4 py-3 text-xs ${
              result.type === "success"
                ? "bg-emerald-950/40 border border-emerald-800/40 text-emerald-300"
                : "bg-red-950/40 border border-red-800/40 text-red-300"
            }`}
          >
            {result.type === "success" ? (
              <Check size={13} className="shrink-0" />
            ) : (
              <AlertCircle size={13} className="shrink-0" />
            )}
            {result.msg}
            <button
              onClick={() => setResult(null)}
              className="ml-auto text-current opacity-50 hover:opacity-100"
            >
              <X size={12} />
            </button>
          </div>
        )}

        {/* Send button */}
        <div className="flex justify-end">
          <button
            onClick={() => {
              if (!canSend) return;
              if (testOnly) {
                handleSend();
              } else {
                setConfirmOpen(true);
              }
            }}
            disabled={!canSend || sending}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
              sending || !canSend
                ? "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                : testOnly
                ? "bg-zinc-700 hover:bg-zinc-600 text-white"
                : "bg-[#D4AF37] hover:bg-[#c9a430] text-zinc-950"
            }`}
          >
            {sending ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Sending…
              </>
            ) : testOnly ? (
              <>
                <FlaskConical size={14} />
                Send Test Email
              </>
            ) : (
              <>
                <Send size={14} />
                Send Blast ({recipientCount})
              </>
            )}
          </button>
        </div>
      </div>
    </>
  );
}

// ── Page shell ────────────────────────────────────────────────────────────────

interface MarketingPageProps {
  initialCoupons: CouponRow[];
  recipientCount: number;
}

export function MarketingPage({
  initialCoupons,
  recipientCount,
}: MarketingPageProps) {
  const [tab, setTab] = useState<"coupons" | "email">("coupons");

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Tab bar */}
      <div className="flex items-center gap-1 bg-zinc-900/60 border border-white/[0.06] rounded-xl p-1 w-fit">
        {(
          [
            { key: "coupons", label: "Promo Codes", icon: Tag },
            { key: "email", label: "Email Blast", icon: Mail },
          ] as const
        ).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              tab === key
                ? "bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/20"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "coupons" ? (
        <CouponManager initialCoupons={initialCoupons} />
      ) : (
        <EmailBlastComposer recipientCount={recipientCount} />
      )}
    </div>
  );
}
