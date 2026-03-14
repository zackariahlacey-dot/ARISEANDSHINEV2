"use client";

import { Section } from "@/components/ui/Section";
import { GlassCard } from "@/components/ui/GlassCard";
import { PrismButton } from "@/components/ui/PrismButton";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Clock, Car, User, Mail, ShieldCheck, Zap, Layers, CreditCard, Wallet, Star, Plus, X, Trophy, MapPin, Phone, Truck, LogIn, UserPlus } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { CustomCalendar } from "@/components/ui/CustomCalendar";
import Autocomplete from "react-google-autocomplete";
import { useSearchParams } from "next/navigation";

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

const USER_STORAGE_KEY = "arise_shine_user_profile";
const DRAFT_STORAGE_KEY = "arise_shine_booking_draft";

export default function BookingForm({ initialService }: { initialService?: string }) {
  const searchParams = useSearchParams();
  const [vehicles, setVehicles] = useState<string[]>([""]);
  const [travelInfo, setTravelInfo] = useState({ fee: 0, distance: 0, isLocal: true });
  const [redeemXp, setRedeemXp] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    service: initialService || "Interior Detail",
    date: "",
    time: "",
    selectedAddons: [] as string[],
  });

  const [isSubmitting, setIsSubmitting] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bookedTimes, setBookedTimes] = useState<string[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [user, setUser] = useState<any>(null);

  const supabase = createClient();

  const fetchProfile = async (userId: string) => {
    const { data: profile } = await supabase.from("profiles").select("*").eq("id", userId).single();
    if (profile) setUserProfile(profile);
  };

  useEffect(() => {
    const shouldRedeem = searchParams.get('redeem') === 'true';
    if (shouldRedeem) setRedeemXp(true);
  }, [searchParams]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) fetchProfile(currentUser.id);
      else {
        setUserProfile(null);
        setRedeemXp(false);
      }
    });

    const init = async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (currentUser) {
        setUser(currentUser);
        await fetchProfile(currentUser.id);
      }
    };
    init();

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const savedUser = localStorage.getItem(USER_STORAGE_KEY);
    const savedDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (savedUser) {
      try {
        const { name, email, phone, address, vehicles: v } = JSON.parse(savedUser);
        setFormData(prev => ({ ...prev, name, email, phone, address }));
        setVehicles(v || [""]);
      } catch (e) {}
    }
    if (savedDraft) {
      try {
        const draft = JSON.parse(savedDraft);
        setFormData(prev => ({ ...prev, ...draft }));
      } catch (e) {}
    }
  }, []);

  useEffect(() => {
    const userData = { name: formData.name, email: formData.email, phone: formData.phone, address: formData.address, vehicles };
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userData));
    const draftData = { service: formData.service, selectedAddons: formData.selectedAddons };
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draftData));
  }, [formData, vehicles]);

  useEffect(() => {
    if (formData.address) {
      const fetchTravel = async () => {
        try {
          const response = await fetch(`/api/travel-fee?address=${encodeURIComponent(formData.address)}`);
          const data = await response.json();
          if (data.fee !== undefined) setTravelInfo(data);
        } catch (e) {}
      };
      fetchTravel();
    }
  }, [formData.address]);

  useEffect(() => {
    if (formData.date) {
      const fetchAvailability = async () => {
        const response = await fetch(`/api/availability?date=${formData.date}`);
        const data = await response.json();
        if (data.bookedTimes) setBookedTimes(data.bookedTimes);
      };
      fetchAvailability();
    }
  }, [formData.date]);

  useEffect(() => {
    if (initialService) {
      setFormData(prev => ({ ...prev, service: initialService }));
    }
  }, [initialService]);

  const getTier = (xp: number) => {
    if (xp >= 2000) return { name: "Diamond", discount: 20, color: "#e2e8f0" };
    if (xp >= 1500) return { name: "Gold", discount: 15, color: "#fbbf24" };
    if (xp >= 1000) return { name: "Silver", discount: 10, color: "#94a3b8" };
    if (xp >= 500) return { name: "Bronze", discount: 5, color: "#cd7f32" };
    return { name: "Member", discount: 0, color: "#ffffff" };
  };

  const isMonthly = formData.service.includes("Monthly");
  const startupFee = isMonthly ? 100 : 0;

  const calculateFleetDiscount = () => {
    if (vehicles.length <= 1) return 0;
    const discountPerVehicle = Math.min(30, (vehicles.length - 1) * 15);
    return vehicles.length * discountPerVehicle;
  };

  const getSubtotal = () => {
    const base = (servicePrices[formData.service] || 0) * vehicles.length;
    const addonsTotal = formData.selectedAddons.reduce((sum, id) => {
      const addon = addons.find(a => a.id === id);
      return sum + (addon?.price || 0);
    }, 0) * vehicles.length;
    return base + addonsTotal + startupFee + (travelInfo.fee || 0);
  };

  const calculateStatusDiscountValue = () => {
    if (!userProfile) return 0;
    const tier = getTier(userProfile.xp || 0);
    return Math.floor(getSubtotal() * (tier.discount / 100));
  };

  const calculateXpDiscountValue = () => {
    if (!redeemXp || !userProfile) return 0;
    return Math.floor(userProfile.xp / 10);
  };

  const calculateTotal = () => {
    const subtotal = getSubtotal();
    const fleet = calculateFleetDiscount();
    const status = calculateStatusDiscountValue();
    const xpDiscount = calculateXpDiscountValue();
    return Math.max(0, subtotal - fleet - status - xpDiscount);
  };

  const addVehicle = () => setVehicles([...vehicles, ""]);
  const removeVehicle = (index: number) => setVehicles(vehicles.filter((_, i) => i !== index));
  const updateVehicle = (index: number, val: string) => {
    const newVehicles = [...vehicles];
    newVehicles[index] = val;
    setVehicles(newVehicles);
  };

  const toggleAddon = (id: string) => {
    setFormData(prev => ({
      ...prev,
      selectedAddons: prev.selectedAddons.includes(id) ? prev.selectedAddons.filter(a => a !== id) : [...prev.selectedAddons, id]
    }));
  };

  const getTimeSlots = () => {
    const slots = [];
    const duration = serviceDurations[formData.service] || 3;
    const startTime = 12.5; 
    const endTimeLimit = 18; 
    const isToday = formData.date === new Date().toISOString().split('T')[0];
    const currentHour = new Date().getHours() + (new Date().getMinutes() / 60);
    let current = startTime;
    while (current + duration <= endTimeLimit) {
      if (!isToday || current > currentHour) {
        const hours = Math.floor(current);
        const minutes = (current - hours) * 60;
        const timeStr = `${hours > 12 ? hours - 12 : hours}:${minutes === 0 ? "00" : minutes} PM`;
        const value = `${hours}:${minutes === 0 ? "00" : minutes}`;
        slots.push({ label: timeStr, value });
      }
      current += 0.5;
    }
    return slots;
  };

  const handleSubmit = async (method: "stripe" | "after_service") => {
    if (!formData.date || !formData.time || !formData.address || !formData.phone) {
      setError("Please fill out all required fields.");
      return;
    }
    setIsSubmitting(method);
    setError(null);

    try {
      const endpoint = method === 'stripe' ? '/api/checkout' : '/api/booking';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          paymentMethod: method,
          vehicles,
          totalPrice: calculateTotal(),
          amountSaved: calculateFleetDiscount() + calculateStatusDiscountValue() + calculateXpDiscountValue(),
          addons: addons.filter(a => formData.selectedAddons.includes(a.id)).map(a => a.name),
          travelFee: travelInfo.fee,
          xpRedeemed: redeemXp ? userProfile?.xp : 0
        }),
      });

      const data = await response.json();
      if (response.ok) {
        if (method === 'stripe' && data.url) {
          window.location.href = data.url;
          return;
        }
        localStorage.removeItem(DRAFT_STORAGE_KEY);
        if (user) await fetchProfile(user.id);
        setIsSuccess(true);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError("Transmission failed.");
    } finally {
      setIsSubmitting(null);
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
          <div>
            <div className="inline-flex items-center gap-3 px-3 py-1 rounded-full border border-[#fbbf24]/20 bg-[#fbbf24]/5 mb-6">
              <ShieldCheck className="w-3 h-3 text-[#fbbf24]" />
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-[#fbbf24]">Secure Reservation</span>
            </div>
            <h2 className="text-4xl md:text-7xl font-black text-white leading-none tracking-tighter">
              Secure Your <br />
              <span className="text-transparent bg-clip-text bg-linear-to-r from-[#fbbf24] to-white">Session</span>
            </h2>
          </div>
          <div className="hidden md:flex flex-col items-end">
            <p className="text-white/20 text-[10px] font-black uppercase tracking-[0.5em] mb-2">Estimated Total</p>
            <div className="flex items-center gap-4">
              {(calculateFleetDiscount() > 0 || calculateStatusDiscountValue() > 0 || travelInfo.fee > 0 || calculateXpDiscountValue() > 0) && (
                <div className="text-right">
                  <p className="text-white/20 text-[10px] font-black line-through tracking-tighter leading-none">
                    ${getSubtotal() + calculateFleetDiscount()}
                  </p>
                  <p className="text-green-500 text-[10px] font-black uppercase tracking-widest mt-1">Savings Applied</p>
                </div>
              )}
              <p className="text-white text-5xl font-black tracking-tighter">${calculateTotal()}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start px-4">
          
          <div className="lg:col-span-8">
            <GlassCard className="p-8 md:p-12 border-white/5 relative overflow-hidden min-h-[600px] flex items-center justify-center">
              <AnimatePresence mode="wait">
                {isSuccess ? (
                  <motion.div key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-10 w-full max-w-lg">
                    {user ? (
                      <div className="space-y-8">
                        <div className="w-24 h-24 rounded-full bg-linear-to-br from-[#fbbf24] to-[#8b5cf6] p-1 mx-auto relative">
                          <div className="w-full h-full rounded-full bg-black flex items-center justify-center">
                            <Trophy className="w-10 h-10" style={{ color: userProfile ? getTier(userProfile.xp).color : '#fff' }} />
                          </div>
                          <motion.div animate={{ rotate: 360 }} transition={{ duration: 10, repeat: Infinity, ease: "linear" }} className="absolute -inset-2 border border-dashed border-[#fbbf24]/20 rounded-full" />
                        </div>
                        <div>
                          <h3 className="text-4xl font-black text-white mb-2 tracking-tighter uppercase">Prestige Updated</h3>
                          <p className="text-[#fbbf24] text-[10px] font-black uppercase tracking-[0.4em]">Current Status: {userProfile ? getTier(userProfile.xp).name : 'Member'}</p>
                        </div>
                        <div className="bg-white/5 border border-white/10 rounded-[32px] p-8 space-y-4 text-left">
                          <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-white/40">
                            <span>Points Awarded</span>
                            <span className="text-[#fbbf24]">+{calculateTotal()} XP</span>
                          </div>
                          <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                            <motion.div initial={{ width: 0 }} animate={{ width: "100%" }} transition={{ duration: 1.5 }} className="h-full bg-[#fbbf24]" />
                          </div>
                          <p className="text-[9px] text-white/30 uppercase font-bold tracking-widest text-center">
                            Session locked for {formData.date} @ {formData.time} PM
                          </p>
                        </div>
                        <Link href="/dashboard" className="block">
                          <PrismButton variant="luxury" className="w-full py-5 text-sm font-black uppercase tracking-widest">
                            Return to Dashboard
                          </PrismButton>
                        </Link>
                      </div>
                    ) : (
                      <div className="space-y-10">
                        <div className="w-24 h-24 bg-[#fbbf24]/10 border border-[#fbbf24]/20 rounded-full flex items-center justify-center mx-auto relative">
                          <ShieldCheck className="w-10 h-10 text-[#fbbf24]" />
                        </div>
                        <div>
                          <h3 className="text-4xl font-black text-white mb-2 tracking-tighter uppercase">Session Secured</h3>
                          <p className="text-white/40 font-medium">Your request has been logged. Join our elite circle to track your rewards.</p>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <Link href="/auth" className="block">
                            <PrismButton variant="gold" className="w-full py-5 text-[10px] flex flex-col gap-1">
                              <span className="flex items-center gap-2"><UserPlus className="w-4 h-4" /> Join Now</span>
                              <span className="opacity-50 text-[8px]">Claim {calculateTotal()} Points</span>
                            </PrismButton>
                          </Link>
                          <Link href="/auth" className="block">
                            <PrismButton variant="outline" className="w-full py-5 text-[10px] flex flex-col gap-1 border-white/10">
                              <span className="flex items-center gap-2"><LogIn className="w-4 h-4" /> Existing Member</span>
                              <span className="opacity-50 text-[8px]">Sync to Account</span>
                            </PrismButton>
                          </Link>
                        </div>

                        <div className="pt-8 border-t border-white/5">
                          <button onClick={() => setIsSuccess(false)} className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 hover:text-white transition-colors">
                            Book Another Session
                          </button>
                        </div>
                      </div>
                    )}
                  </motion.div>
                ) : (
                  <div className="space-y-10 relative z-10 w-full">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className={inputWrapperClasses}>
                        <label className={labelClasses}>Full Name</label>
                        <User className={iconClasses} />
                        <input required type="text" name="name" autoComplete="name" className={inputClasses} value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                      </div>
                      <div className={inputWrapperClasses}>
                        <label className={labelClasses}>Email Address</label>
                        <Mail className={iconClasses} />
                        <input required type="email" name="email" autoComplete="email" className={inputClasses} value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                      </div>
                      <div className={inputWrapperClasses}>
                        <label className={labelClasses}>Phone Number</label>
                        <Phone className={iconClasses} />
                        <input required type="tel" name="tel" autoComplete="tel" placeholder="(802) 555-0123" className={inputClasses} value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                      </div>
                      <div className={cn(inputWrapperClasses, "md:col-span-1")}>
                        <label className={labelClasses}>Service Address</label>
                        <MapPin className={iconClasses} />
                        <Autocomplete
                          apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}
                          onPlaceSelected={(place) => {
                            const addr = place.formatted_address || "";
                            setFormData({ ...formData, address: addr });
                          }}
                          options={{ types: ["address"], componentRestrictions: { country: "us" } }}
                          onChange={(e: any) => setFormData({ ...formData, address: e.target.value })}
                          value={formData.address}
                          className={inputClasses}
                          placeholder="Search Address..."
                        />
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="flex items-center justify-between px-1">
                        <label className={labelClasses}>Vehicle Collection</label>
                        <button type="button" onClick={addVehicle} className="text-[#fbbf24] flex items-center gap-2 text-[10px] font-black uppercase tracking-widest hover:opacity-70 transition-opacity">
                          <Plus className="w-3 h-3" /> Add Vehicle
                        </button>
                      </div>
                      <div className="space-y-4">
                        {vehicles.map((v, i) => (
                          <div key={i} className="relative group/v">
                            <Car className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within/v:text-[#fbbf24]" />
                            <input required placeholder={`Vehicle ${i + 1} (Year, Make, Model)`} className={cn(inputClasses, "py-4 pr-12")} value={v} onChange={(e) => updateVehicle(i, e.target.value)} />
                            {vehicles.length > 1 && (
                              <button type="button" onClick={() => removeVehicle(i)} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/10 hover:text-red-500 transition-colors">
                                <X className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className={inputWrapperClasses}>
                      <label className={labelClasses}>Session Type</label>
                      <Layers className={iconClasses} />
                      <select className={cn(inputClasses, "appearance-none")} style={{ backgroundColor: "#0f0f0f" }} value={formData.service} onChange={(e) => setFormData({ ...formData, service: e.target.value })}>
                        {Object.keys(servicePrices).map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>

                    <div className="space-y-6">
                      <label className={labelClasses}>Elite Enhancements (Per Vehicle)</label>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {addons.map(addon => (
                          <button key={addon.id} type="button" onClick={() => toggleAddon(addon.id)} className={cn("flex flex-col gap-4 p-6 rounded-2xl border transition-all text-left", formData.selectedAddons.includes(addon.id) ? "bg-[#fbbf24]/5 border-[#fbbf24]/40" : "bg-white/[0.02] border-white/5 hover:border-white/10")}>
                            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", formData.selectedAddons.includes(addon.id) ? "bg-[#fbbf24] text-black" : "bg-white/5")}>{addon.icon}</div>
                            <div>
                              <p className="text-xs font-bold text-white/70">{addon.name}</p>
                              <p className="text-[#fbbf24] text-xs font-black">+${addon.price}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t border-white/5">
                      <div className="space-y-6">
                        <label className={labelClasses}>Select Session Date</label>
                        <CustomCalendar selectedDate={formData.date} onSelect={(date) => setFormData({ ...formData, date })} />
                      </div>
                      <div className="space-y-2">
                        <label className={labelClasses}>Select Time</label>
                        {!formData.date ? (
                          <div className={cn(inputClasses, "flex items-center text-white/10 italic text-xs")}>Select date first...</div>
                        ) : (
                          <div className="grid grid-cols-2 gap-2">
                            {getTimeSlots().filter(slot => !bookedTimes.includes(slot.value)).map(slot => (
                              <button key={slot.value} type="button" onClick={() => setFormData({ ...formData, time: slot.value })} className={cn("px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all", formData.time === slot.value ? "bg-[#fbbf24] border-[#fbbf24] text-black shadow-[0_0_15px_rgba(251,191,36,0.3)]" : "bg-white/5 border-white/5 text-white/40 hover:border-white/10")}>
                                {slot.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-6 border-t border-white/5">
                      <PrismButton variant="gold" disabled={!!isSubmitting} onClick={() => handleSubmit('stripe')} className="w-full py-7 text-xs md:text-sm flex flex-col items-center gap-1 shadow-[0_0_30px_rgba(251,191,36,0.15)]">
                        {isSubmitting === 'stripe' ? "Transmitting..." : (
                          <><span className="flex items-center gap-3"><CreditCard className="w-4 h-4" /> Secure Stripe Payment</span><span className="text-[9px] opacity-60 tracking-[0.1em]">Instant Confirmation • XP Priority</span></>
                        )}
                      </PrismButton>
                      <PrismButton variant="violet" disabled={!!isSubmitting} onClick={() => handleSubmit('after_service')} className="w-full py-7 text-xs md:text-sm flex flex-col items-center gap-1">
                        {isSubmitting === 'after_service' ? "Sending..." : (
                          <><span className="flex items-center gap-3"><Wallet className="w-5 h-5" /> Pay After Detail</span><span className="text-[9px] opacity-60 tracking-[0.1em]">In-Person Settlement • Save Draft</span></>
                        )}
                      </PrismButton>
                    </div>
                  </div>
                )}
              </AnimatePresence>
            </GlassCard>
          </div>

          <div className="lg:col-span-4 space-y-6">
            {/* XP Redemption Widget */}
            {userProfile && userProfile.xp >= 10 && (
              <GlassCard glowColor="gold" className={cn("p-8 border-[#fbbf24]/20 transition-all", redeemXp ? "bg-[#fbbf24]/10" : "bg-[#fbbf24]/5")}>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <Trophy className="w-5 h-5 text-[#fbbf24]" />
                    <h4 className="text-white font-black uppercase tracking-widest text-[10px]">Prestige Balance</h4>
                  </div>
                  <button 
                    onClick={() => setRedeemXp(!redeemXp)}
                    className={cn(
                      "w-12 h-6 rounded-full relative transition-colors duration-300",
                      redeemXp ? "bg-[#fbbf24]" : "bg-white/10"
                    )}
                  >
                    <div className={cn(
                      "absolute top-1 w-4 h-4 rounded-full bg-black transition-all duration-300",
                      redeemXp ? "left-7" : "left-1"
                    )} />
                  </button>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                    <span className="text-white/40">Points</span>
                    <span className="text-white">{userProfile.xp} XP</span>
                  </div>
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                    <span className="text-white/40">Value</span>
                    <span className="text-green-500">${Math.floor(userProfile.xp / 10)} Off</span>
                  </div>
                  {redeemXp && (
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[9px] text-[#fbbf24] font-bold uppercase tracking-widest border-t border-[#fbbf24]/20 pt-4">
                      Redemption Active: Total Balanced
                    </motion.p>
                  )}
                </div>
              </GlassCard>
            )}

            <GlassCard glowColor="amber" className={cn("p-8 border-white/5 transition-all duration-500", travelInfo.fee > 0 ? "bg-[#fbbf24]/5 border-[#fbbf24]/20" : "bg-white/[0.02]")}>
              <div className="flex items-center gap-4 mb-6">
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center transition-colors", travelInfo.fee > 0 ? "bg-[#fbbf24]/20" : "bg-white/5")}>
                  <Truck className={cn("w-5 h-5", travelInfo.fee > 0 ? "text-[#fbbf24]" : "text-white/20")} />
                </div>
                <div>
                  <p className="text-white text-xs font-bold uppercase tracking-widest leading-none">Travel Logic</p>
                  <p className="text-[10px] text-white/30 uppercase font-black mt-1">Waterbury Base</p>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                  <span className="text-white/40">Distance</span>
                  <span className="text-white">{travelInfo.distance} Miles</span>
                </div>
                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                  <span className="text-white/40">Travel Fee</span>
                  <span className={cn(travelInfo.fee > 0 ? "text-[#fbbf24]" : "text-green-500")}>
                    {travelInfo.fee > 0 ? `+$${travelInfo.fee}` : "Complimentary"}
                  </span>
                </div>
              </div>
            </GlassCard>

            {userProfile && (
              <GlassCard glowColor="amber" className="p-8 border-white/5 bg-[#fbbf24]/5">
                <div className="flex items-center gap-4 mb-6">
                  <Star className="w-5 h-5 text-[#fbbf24] fill-[#fbbf24]" />
                  <div>
                    <p className="text-white text-xs font-bold">{getTier(userProfile.xp).name} Status</p>
                    <p className="text-[#fbbf24] text-[10px] font-black uppercase tracking-tighter">{getTier(userProfile.xp).discount}% Status Discount Active</p>
                  </div>
                </div>
                {(calculateStatusDiscountValue() > 0 || calculateXpDiscountValue() > 0) && (
                  <div className="space-y-2 border-t border-white/5 pt-4">
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-green-500">
                      <span>Total Savings</span>
                      <span>-${calculateStatusDiscountValue() + calculateXpDiscountValue()}</span>
                    </div>
                  </div>
                )}
              </GlassCard>
            )}
            
            <div className="p-8 rounded-[32px] bg-linear-to-br from-[#fbbf24] to-[#8b5cf6] p-[1px]">
              <div className="bg-black rounded-[31px] p-8 h-full transition-colors hover:bg-white/[0.02]">
                <p className="text-[#fbbf24] text-[10px] font-black uppercase tracking-[0.4em] mb-4">Support</p>
                <p className="text-white text-2xl font-black tracking-tighter mb-6 leading-none">Custom Quote?</p>
                <a href="tel:802-585-5563" className="text-white/40 text-sm font-bold hover:text-white transition-colors underline decoration-[#fbbf24] underline-offset-8">802-585-5563</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}
