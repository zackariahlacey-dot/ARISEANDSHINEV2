"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Crown, CreditCard, Banknote, Check, ChevronRight, Loader2, AlertCircle } from "lucide-react";
import { MONTHLY_PLANS, type MonthlyPlanId } from "@/lib/monthlyPlans";
import { createStripeMonthlyCheckout, createCashMonthlySubscription, type OnboardPrefill } from "@/app/actions/monthlySubscriptions";
import { cn } from "@/lib/utils";

type Props = {
  email: string;
  prefill: OnboardPrefill;
};

export function MonthlyOnboardForm({ email, prefill }: Props) {
  const router  = useRouter();
  const [selectedPlan, setSelectedPlan]         = useState<MonthlyPlanId | null>(null);
  const [paymentMethod, setPaymentMethod]        = useState<"stripe" | "cash">("stripe");
  const [name, setName]                          = useState(prefill.name);
  const [phone, setPhone]                        = useState(prefill.phone);
  const [vehicleMake, setVehicleMake]            = useState(prefill.vehicleMake);
  const [vehicleModel, setVehicleModel]          = useState(prefill.vehicleModel);
  const [vehicleYear, setVehicleYear]            = useState(prefill.vehicleYear);
  const [vehicleSize, setVehicleSize]            = useState(prefill.vehicleSize || "medium");
  const [serviceAddress, setServiceAddress]      = useState(prefill.serviceAddress);
  const [submitting, setSubmitting]              = useState(false);
  const [error, setError]                        = useState<string | null>(null);
  const [cashSuccess, setCashSuccess]            = useState(false);

  const activePlan = MONTHLY_PLANS.find(p => p.id === selectedPlan);
  const price = activePlan
    ? (paymentMethod === "cash" ? activePlan.cashPrice : activePlan.price)
    : null;

  async function handleSubmit() {
    if (!selectedPlan) return;

    // Phone validation
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 10) {
      setError("Please enter a valid 10-digit phone number.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const params = {
      planId: selectedPlan,
      email,
      name: name.trim(),
      phone: phone.trim(),
      vehicleMake: vehicleMake.trim(),
      vehicleModel: vehicleModel.trim(),
      vehicleYear: vehicleYear.trim(),
      vehicleSize,
      serviceAddress: serviceAddress.trim(),
    };

    if (paymentMethod === "stripe") {
      const result = await createStripeMonthlyCheckout(params);
      if (!result.success) { setError(result.error); setSubmitting(false); return; }
      if (result.checkoutUrl) window.location.href = result.checkoutUrl;
    } else {
      const result = await createCashMonthlySubscription(params);
      if (!result.success) { setError(result.error); setSubmitting(false); return; }
      setCashSuccess(true);
      setSubmitting(false);
    }
  }

  if (cashSuccess) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-zinc-900/60 border border-white/10 rounded-3xl p-10 text-center"
        >
          <div className="w-20 h-20 bg-gradient-to-br from-[#D4AF37] to-[#AA771C] rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_40px_rgba(212,175,55,0.3)]">
            <Check size={36} className="text-black" strokeWidth={3} />
          </div>
          <h1 className="text-3xl font-black text-white mb-3">
            You&apos;re <span className="text-[#D4AF37]">in!</span>
          </h1>
          <p className="text-zinc-400 text-sm leading-relaxed mb-2">
            Your <strong className="text-white">{activePlan?.name}</strong> monthly plan is confirmed at{" "}
            <strong className="text-[#D4AF37]">${price}/mo</strong> cash.
          </p>
          <p className="text-zinc-500 text-xs leading-relaxed">
            You&apos;ll receive a confirmation email shortly, and each month you&apos;ll get a link to pick your preferred date.
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#D4AF37]/10 via-zinc-950 to-zinc-950">
      <div className="max-w-lg mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-[#D4AF37]/10 border border-[#D4AF37]/30 rounded-full px-4 py-1.5 mb-5">
            <Crown size={13} className="text-[#D4AF37]" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#D4AF37]">Monthly Detail Club</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight mb-3">
            Choose your plan
          </h1>
          <p className="text-zinc-400 text-sm">
            Locked in for{" "}
            <span className="text-zinc-200 font-medium">{email}</span>
          </p>
        </div>

        {/* Plan selection */}
        <div className="space-y-2 mb-8">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-3">Select a plan</p>
          {MONTHLY_PLANS.map(plan => {
            const selected = selectedPlan === plan.id;
            const displayPrice = paymentMethod === "cash" ? plan.cashPrice : plan.price;
            return (
              <button
                key={plan.id}
                onClick={() => setSelectedPlan(plan.id)}
                className={cn(
                  "w-full text-left rounded-2xl border p-4 transition-all active:scale-[0.99]",
                  selected
                    ? "border-[#D4AF37]/60 bg-[#D4AF37]/8 shadow-[0_0_20px_rgba(212,175,55,0.12)]"
                    : "border-white/[0.07] bg-zinc-900/40 hover:border-white/[0.12]"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <div className={cn(
                        "w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0",
                        selected ? "border-[#D4AF37] bg-[#D4AF37]" : "border-zinc-600"
                      )}>
                        {selected && <Check size={9} className="text-black" strokeWidth={3.5} />}
                      </div>
                      <span className={cn("font-black text-sm", selected ? "text-white" : "text-zinc-200")}>
                        {plan.name}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500 leading-relaxed ml-6">{plan.description}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={cn("text-xl font-black", selected ? "text-[#D4AF37]" : "text-zinc-300")}>
                      ${displayPrice}
                    </p>
                    <p className="text-[10px] text-zinc-600">/month</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Payment method */}
        <div className="mb-8">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-3">Payment method</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setPaymentMethod("stripe")}
              className={cn(
                "flex items-center gap-2.5 rounded-2xl border p-4 transition-all",
                paymentMethod === "stripe"
                  ? "border-[#D4AF37]/60 bg-[#D4AF37]/8"
                  : "border-white/[0.07] bg-zinc-900/40"
              )}
            >
              <CreditCard size={18} className={paymentMethod === "stripe" ? "text-[#D4AF37]" : "text-zinc-500"} />
              <div className="text-left">
                <p className="text-xs font-black text-white">Card</p>
                <p className="text-[10px] text-zinc-500">Billed monthly</p>
              </div>
            </button>
            <button
              onClick={() => setPaymentMethod("cash")}
              className={cn(
                "flex items-center gap-2.5 rounded-2xl border p-4 transition-all",
                paymentMethod === "cash"
                  ? "border-[#D4AF37]/60 bg-[#D4AF37]/8"
                  : "border-white/[0.07] bg-zinc-900/40"
              )}
            >
              <Banknote size={18} className={paymentMethod === "cash" ? "text-[#D4AF37]" : "text-zinc-500"} />
              <div className="text-left">
                <p className="text-xs font-black text-white">Cash <span className="text-[#D4AF37]">−$10</span></p>
                <p className="text-[10px] text-zinc-500">Pay at arrival</p>
              </div>
            </button>
          </div>
        </div>

        {/* Pre-filled info */}
        <div className="mb-8">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-3">Confirm your details</p>
          <div className="bg-zinc-900/60 border border-white/[0.07] rounded-2xl p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-600 block mb-1">Name</label>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#D4AF37]/50"
                  autoComplete="name"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-600 block mb-1">Phone</label>
                <input
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  inputMode="tel"
                  autoComplete="tel"
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#D4AF37]/50"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-600 block mb-1">Year</label>
                <input
                  value={vehicleYear}
                  onChange={e => setVehicleYear(e.target.value)}
                  inputMode="numeric"
                  maxLength={4}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#D4AF37]/50"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-600 block mb-1">Make</label>
                <input
                  value={vehicleMake}
                  onChange={e => setVehicleMake(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#D4AF37]/50"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-600 block mb-1">Model</label>
                <input
                  value={vehicleModel}
                  onChange={e => setVehicleModel(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#D4AF37]/50"
                />
              </div>
            </div>
            {/* Vehicle size */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-600 block mb-1">Vehicle Size</label>
              <select
                value={vehicleSize}
                onChange={e => setVehicleSize(e.target.value)}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#D4AF37]/50"
              >
                <option value="compact">Compact (Mini / Small Car)</option>
                <option value="sedan">Sedan / Coupe</option>
                <option value="medium">Mid-size SUV / Crossover</option>
                <option value="large_suv">Large SUV / Minivan</option>
                <option value="xl_truck">XL Truck / Full-size Van</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-600 block mb-1">Service address</label>
              <input
                value={serviceAddress}
                onChange={e => setServiceAddress(e.target.value)}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#D4AF37]/50"
                autoComplete="street-address"
              />
            </div>
          </div>
        </div>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-xl p-3 mb-4 text-sm text-red-400"
            >
              <AlertCircle size={15} className="shrink-0" />
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={!selectedPlan || submitting || !name.trim()}
          className="w-full bg-[#D4AF37] text-black font-black text-sm uppercase tracking-wider py-4 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-40 shadow-[0_8px_32px_rgba(212,175,55,0.25)]"
        >
          {submitting
            ? <Loader2 className="animate-spin" size={18} />
            : <>
                {paymentMethod === "stripe" ? "Subscribe — Pay Securely" : "Confirm Cash Plan"}
                {price && <span className="font-medium opacity-70">· ${price}/mo</span>}
                <ChevronRight size={16} strokeWidth={2.5} />
              </>
          }
        </button>

        <p className="text-center text-[10px] text-zinc-700 mt-4">
          Cancel anytime &middot; No contracts &middot; Mobile service comes to you
        </p>
      </div>
    </div>
  );
}
