"use client";

import { Section } from "@/components/ui/Section";
import { GlassCard } from "@/components/ui/GlassCard";
import { PrismButton } from "@/components/ui/PrismButton";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Calendar, Clock, Car, User, Mail, ShieldCheck, Zap, Layers, CreditCard, Wallet } from "lucide-react";

const serviceDurations: Record<string, number> = {
  "Interior Detail": 3,
  "Exterior Detail": 2.5,
  "Elite Detail": 4,
  "Monthly Interior": 2,
  "The Elite Monthly": 4,
};

const servicePrices: Record<string, number> = {
  "Interior Detail": 150,
  "Exterior Detail": 125,
  "Elite Detail": 250,
  "Monthly Interior": 99,
  "The Elite Monthly": 199,
};

const addons = [
  { id: "shampoo", name: "Carpet & Upholstery Shampoo", price: 40, icon: <Layers className="w-4 h-4" /> },
  { id: "pethair", name: "Heavy Pet Hair Removal", price: 30, icon: <Zap className="w-4 h-4" /> },
  { id: "thirdrow", name: "3rd-Row / Large SUV", price: 20, icon: <Car className="w-4 h-4" /> },
];

export default function BookingForm({ initialService }: { initialService?: string }) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    vehicle: "",
    service: initialService || "Interior Detail",
    date: "",
    time: "12:30",
    selectedAddons: [] as string[],
    paymentMethod: "stripe" as "stripe" | "after_service",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialService) {
      setFormData(prev => ({ ...prev, service: initialService }));
    }
  }, [initialService]);

  const isMonthly = formData.service.includes("Monthly");
  const startupFee = isMonthly ? 100 : 0;

  const calculateTotal = () => {
    const base = servicePrices[formData.service] || 0;
    const addonsTotal = formData.selectedAddons.reduce((sum, id) => {
      const addon = addons.find(a => a.id === id);
      return sum + (addon?.price || 0);
    }, 0);
    return base + addonsTotal + startupFee;
  };

  const toggleAddon = (id: string) => {
    setFormData(prev => ({
      ...prev,
      selectedAddons: prev.selectedAddons.includes(id)
        ? prev.selectedAddons.filter(a => a !== id)
        : [...prev.selectedAddons, id]
    }));
  };

  const validateDate = (dateStr: string) => {
    if (!dateStr) return null;
    const selectedDate = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const day = selectedDate.getUTCDay();
    if (day === 0 || day === 6) return "We prioritize our team's rest on weekends. Please select a weekday.";
    if (selectedDate < today) return "Time travel is not yet available. Please select a future date.";
    return null;
  };

  const getTimeSlots = () => {
    const slots = [];
    const duration = serviceDurations[formData.service] || 3;
    const startTime = 12.5; 
    const endTimeLimit = 18; 

    let current = startTime;
    while (current + duration <= endTimeLimit) {
      const hours = Math.floor(current);
      const minutes = (current - hours) * 60;
      const timeStr = `${hours > 12 ? hours - 12 : hours}:${minutes === 0 ? "00" : minutes} PM`;
      const value = `${hours}:${minutes === 0 ? "00" : minutes}`;
      slots.push({ label: timeStr, value });
      current += 0.5;
    }
    return slots;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const dateError = validateDate(formData.date);
    if (dateError) {
      setError(dateError);
      return;
    }
    setIsSubmitting(true);
    setError(null);

    try {
      const endpoint = formData.paymentMethod === 'stripe' ? '/api/checkout' : '/api/booking';
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          totalPrice: calculateTotal(),
          addons: addons.filter(a => formData.selectedAddons.includes(a.id)).map(a => a.name)
        }),
      });

      const data = await response.json();

      if (response.ok) {
        if (formData.paymentMethod === 'stripe' && data.url) {
          window.location.href = data.url;
          return;
        }
        
        setIsSuccess(true);
        setFormData({
          name: "",
          email: "",
          phone: "",
          vehicle: "",
          service: "Interior Detail",
          date: "",
          time: "12:30",
          selectedAddons: [],
          paymentMethod: "stripe",
        });
      } else {
        setError(data.error || "Something went wrong. Please try again.");
      }
    } catch (err) {
      setError("Transmission failed. Please check your connection.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputWrapperClasses = "relative group";
  const labelClasses = "block text-[10px] font-black uppercase tracking-[0.3em] text-white/30 mb-2 px-1 group-focus-within:text-[#fbbf24] transition-colors";
  const inputClasses = "w-full bg-white/[0.03] border border-white/10 rounded-xl px-11 py-4 text-white focus:outline-none focus:border-[#fbbf24]/50 focus:bg-white/[0.05] transition-all placeholder:text-white/10 disabled:opacity-50";
  const iconClasses = "absolute left-4 top-[38px] w-4 h-4 text-white/20 group-focus-within:text-[#fbbf24] transition-colors";

  return (
    <Section id="booking" spacing="large" className="bg-[#050505]">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16 px-4">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-3 px-3 py-1 rounded-full border border-[#fbbf24]/20 bg-[#fbbf24]/5 mb-6">
              <ShieldCheck className="w-3 h-3 text-[#fbbf24]" />
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-[#fbbf24]">Secure Reservation</span>
            </div>
            <h2 className="text-4xl md:text-7xl font-black text-white leading-none tracking-tighter">
              Secure Your <br />
              <span className="text-transparent bg-clip-text bg-linear-to-r from-[#fbbf24] to-white">Session</span>
            </h2>
          </div>
          <div className="hidden md:block text-right">
            <p className="text-white/20 text-[10px] font-black uppercase tracking-[0.5em] mb-2">Estimated Total</p>
            <p className="text-white text-5xl font-black tracking-tighter">${calculateTotal()}</p>
            {isMonthly && <p className="text-[#fbbf24] text-[10px] font-bold uppercase tracking-widest mt-2">Incl. $100 Deep Clean Startup Fee</p>}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start px-4">
          
          <div className="lg:col-span-8">
            <GlassCard className="p-8 md:p-12 border-white/5 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-[#fbbf24]/5 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
              
              <AnimatePresence mode="wait">
                {isSuccess ? (
                  <motion.div key="success" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-20">
                    <div className="w-24 h-24 bg-[#fbbf24]/10 border border-[#fbbf24]/20 rounded-full flex items-center justify-center mx-auto mb-8 relative">
                      <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.2, 0.5] }} transition={{ duration: 2, repeat: Infinity }} className="absolute inset-0 bg-[#fbbf24] rounded-full blur-xl" />
                      <Check className="w-10 h-10 text-[#fbbf24] relative z-10" />
                    </div>
                    <h3 className="text-4xl font-black text-white mb-4 tracking-tighter">Transmission Received</h3>
                    <p className="text-white/40 mb-12 max-w-sm mx-auto font-medium">Your request has been logged. Our concierge will contact you within 24 hours to finalize details.</p>
                    <PrismButton variant="outline" onClick={() => setIsSuccess(false)} className="px-12">New Booking</PrismButton>
                  </motion.div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-10 relative z-10">
                    
                    {error && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="bg-red-500/10 border border-red-500/20 text-red-500 px-6 py-4 rounded-xl text-sm font-bold tracking-tight">
                        {error}
                      </motion.div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className={inputWrapperClasses}>
                        <label className={labelClasses}>Your Name</label>
                        <User className={iconClasses} />
                        <input required disabled={isSubmitting} type="text" placeholder="Alex Sterling" className={inputClasses} value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                      </div>
                      <div className={inputWrapperClasses}>
                        <label className={labelClasses}>Email Address</label>
                        <Mail className={iconClasses} />
                        <input required disabled={isSubmitting} type="email" placeholder="alex@premium.com" className={inputClasses} value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                      </div>
                      <div className={inputWrapperClasses}>
                        <label className={labelClasses}>Vehicle Identity</label>
                        <Car className={iconClasses} />
                        <input required disabled={isSubmitting} type="text" placeholder="2024 Porsche 911" className={inputClasses} value={formData.vehicle} onChange={(e) => setFormData({ ...formData, vehicle: e.target.value })} />
                      </div>
                      <div className={inputWrapperClasses}>
                        <label className={labelClasses}>Primary Package</label>
                        <Layers className={iconClasses} />
                        <div className="relative">
                          <select disabled={isSubmitting} className={cn(inputClasses, "appearance-none cursor-pointer")} style={{ backgroundColor: "#0f0f0f" }} value={formData.service} onChange={(e) => setFormData({ ...formData, service: e.target.value })}>
                            {Object.keys(servicePrices).map(s => <option key={s} className="bg-[#0f0f0f] text-white" value={s}>{s}</option>)}
                          </select>
                          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[#fbbf24] font-black text-xs">
                            ${servicePrices[formData.service]}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <label className={labelClasses}>Elite Enhancements</label>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {addons.map(addon => (
                          <button key={addon.id} type="button" onClick={() => toggleAddon(addon.id)} className={cn("flex flex-col gap-4 p-6 rounded-2xl border transition-all text-left group relative overflow-hidden", formData.selectedAddons.includes(addon.id) ? "bg-[#fbbf24]/5 border-[#fbbf24]/40" : "bg-white/[0.02] border-white/5 hover:border-white/10")}>
                            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center transition-colors", formData.selectedAddons.includes(addon.id) ? "bg-[#fbbf24] text-black" : "bg-white/5 text-white/40")}>
                              {addon.icon}
                            </div>
                            <div>
                              <p className={cn("text-xs font-bold mb-1 transition-colors", formData.selectedAddons.includes(addon.id) ? "text-white" : "text-white/40")}>{addon.name}</p>
                              <p className="text-[#fbbf24] text-xs font-black">+${addon.price}</p>
                            </div>
                            {formData.selectedAddons.includes(addon.id) && (
                              <motion.div layoutId="addon-check" className="absolute top-4 right-4">
                                <Check className="w-4 h-4 text-[#fbbf24]" />
                              </motion.div>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-6">
                      <label className={labelClasses}>Payment Strategy</label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <button type="button" onClick={() => setFormData({ ...formData, paymentMethod: "stripe" })} className={cn("flex items-center gap-4 p-6 rounded-2xl border transition-all text-left", formData.paymentMethod === "stripe" ? "bg-[#fbbf24]/5 border-[#fbbf24]/40" : "bg-white/[0.02] border-white/5")}>
                          <CreditCard className={cn("w-6 h-6", formData.paymentMethod === "stripe" ? "text-[#fbbf24]" : "text-white/20")} />
                          <div>
                            <p className={cn("text-xs font-bold", formData.paymentMethod === "stripe" ? "text-white" : "text-white/40")}>Stripe Secure</p>
                            <p className="text-[10px] text-white/20 uppercase tracking-tighter">Pay Now & Secure XP</p>
                          </div>
                        </button>
                        <button type="button" onClick={() => setFormData({ ...formData, paymentMethod: "after_service" })} className={cn("flex items-center gap-4 p-6 rounded-2xl border transition-all text-left", formData.paymentMethod === "after_service" ? "bg-white/5 border-white/40" : "bg-white/[0.02] border-white/5")}>
                          <Wallet className={cn("w-6 h-6", formData.paymentMethod === "after_service" ? "text-white" : "text-white/20")} />
                          <div>
                            <p className={cn("text-xs font-bold", formData.paymentMethod === "after_service" ? "text-white" : "text-white/40")}>Pay After Service</p>
                            <p className="text-[10px] text-white/20 uppercase tracking-tighter">In-person Settlement</p>
                          </div>
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t border-white/5">
                      <div className={inputWrapperClasses}>
                        <label className={labelClasses}>Select Date</label>
                        <Calendar className={iconClasses} />
                        <input required type="date" min={new Date().toISOString().split('T')[0]} className={cn(inputClasses, "cursor-pointer")} style={{ backgroundColor: "#0f0f0f", colorScheme: "dark" }} value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} />
                      </div>
                      
                      <div className="space-y-2">
                        <label className={labelClasses}>Select Time</label>
                        <div className="relative">
                          <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                          {!formData.date ? (
                            <div className={cn(inputClasses, "flex items-center text-white/10 italic text-xs")}>Select date first...</div>
                          ) : validateDate(formData.date) ? (
                            <div className={cn(inputClasses, "flex items-center text-red-500/50 text-xs")}>Unavailable</div>
                          ) : (
                            <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                              {getTimeSlots().map(slot => (
                                <button key={slot.value} type="button" onClick={() => setFormData({ ...formData, time: slot.value })} className={cn("flex-shrink-0 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all", formData.time === slot.value ? "bg-[#fbbf24] border-[#fbbf24] text-black shadow-[0_0_15px_rgba(251,191,36,0.3)]" : "bg-white/5 border-white/10 text-white/40 hover:border-white/10")}>
                                  {slot.label}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="pt-6">
                      <PrismButton variant="luxury" disabled={isSubmitting || !!validateDate(formData.date) || !formData.date} className="w-full py-6 text-xl font-black uppercase tracking-[0.2em] group relative overflow-hidden">
                        <div className="flex items-center justify-center gap-4">
                          <span>{isSubmitting ? "Transmitting..." : formData.paymentMethod === 'stripe' ? "Pay & Confirm" : "Confirm Request"}</span>
                          <div className="h-8 w-px bg-black/20" />
                          <span className="text-black/60">${calculateTotal()}</span>
                        </div>
                      </PrismButton>
                    </div>
                  </form>
                )}
              </AnimatePresence>
            </GlassCard>
          </div>

          <div className="lg:col-span-4 space-y-6">
            <GlassCard glowColor="violet" className="p-8 border-white/5">
              <h4 className="text-white font-black uppercase tracking-widest text-xs mb-6">Booking Policy</h4>
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center flex-shrink-0">
                    <ShieldCheck className="w-5 h-5 text-violet-400" />
                  </div>
                  <div>
                    <p className="text-white text-xs font-bold mb-1">Mobile Service</p>
                    <p className="text-white/30 text-[10px] leading-relaxed uppercase tracking-tighter">We bring the studio to you. Ensure a safe, spacious workspace is available.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center flex-shrink-0">
                    <Clock className="w-5 h-5 text-violet-400" />
                  </div>
                  <div>
                    <p className="text-white text-xs font-bold mb-1">Session Timing</p>
                    <p className="text-white/30 text-[10px] leading-relaxed uppercase tracking-tighter">Sessions range from 2.5 to 4 hours. Completion time may vary based on vehicle condition.</p>
                  </div>
                </div>
              </div>
            </GlassCard>

            <div className="p-8 rounded-[32px] bg-linear-to-br from-[#fbbf24] to-[#8b5cf6] p-[1px] group cursor-pointer">
              <div className="bg-black rounded-[31px] p-8 h-full transition-colors group-hover:bg-white/[0.02]">
                <p className="text-[#fbbf24] text-[10px] font-black uppercase tracking-[0.4em] mb-4">Concierge Support</p>
                <p className="text-white text-2xl font-black tracking-tighter mb-6 leading-none text-balance">Need a custom quote or complex collection detail?</p>
                <a href="tel:802-585-5563" className="text-white/40 text-sm font-bold hover:text-white transition-colors underline decoration-[#fbbf24] underline-offset-8">802-585-5563</a>
              </div>
            </div>
          </div>

        </div>
      </div>
    </Section>
  );
}
