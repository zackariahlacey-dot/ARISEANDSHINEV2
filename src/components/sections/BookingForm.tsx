"use client";

import { Section } from "@/components/ui/Section";
import { GlassCard } from "@/components/ui/GlassCard";
import { PrismButton } from "@/components/ui/PrismButton";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Clock, Car, User, Mail, ShieldCheck, Zap, Layers, CreditCard, Wallet, Star, Plus, X, Trophy, MapPin, Phone, Truck, LogIn, UserPlus, ChevronRight, ChevronLeft } from "lucide-react";
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
  const [step, setStep] = useState(1);
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
    if (savedUser) {
      try {
        const { name, email, phone, address, vehicles: v } = JSON.parse(savedUser);
        setFormData(prev => ({ ...prev, name, email, phone, address }));
        setVehicles(v || [""]);
      } catch (e) {}
    }
  }, []);

  useEffect(() => {
    const userData = { name: formData.name, email: formData.email, phone: formData.phone, address: formData.address, vehicles };
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userData));
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
    return base + addonsTotal + (formData.service.includes("Monthly") ? 100 : 0) + (travelInfo.fee || 0);
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

  const inputWrapperClasses = "relative group text-left";
  const labelClasses = "block text-[10px] font-black uppercase tracking-[0.3em] text-white/30 mb-2 px-1 group-focus-within:text-[#fbbf24] transition-colors";
  const inputClasses = "w-full bg-white/[0.03] border border-white/10 rounded-xl px-11 py-4 text-white focus:outline-none focus:border-[#fbbf24]/50 focus:bg-white/[0.05] transition-all placeholder:text-white/10 disabled:opacity-50";
  const iconClasses = "absolute left-4 top-[38px] w-4 h-4 text-white/20 group-focus-within:text-[#fbbf24] transition-colors";

  const nextStep = () => {
    if (step === 1 && (!formData.name || !formData.email || !formData.phone || !formData.address)) {
      setError("Please complete all identity fields.");
      return;
    }
    setError(null);
    setStep(step + 1);
  };

  const prevStep = () => setStep(step - 1);

  return (
    <Section id="booking" spacing="large" className="bg-[#050505]">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col items-center text-center justify-between gap-8 mb-16 px-4">
          <div className="flex flex-col items-center">
            <div className="inline-flex items-center gap-3 px-3 py-1 rounded-full border border-[#fbbf24]/20 bg-[#fbbf24]/5 mb-6">
              <ShieldCheck className="w-3 h-3 text-[#fbbf24]" />
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-[#fbbf24]">Step {step} of 3</span>
            </div>
            <h2 className="text-4xl md:text-7xl font-black text-white leading-none tracking-tighter">
              {step === 1 ? "Your Identity" : step === 2 ? "The Collection" : "Secure Session"}
            </h2>
          </div>
          <div className="flex flex-col items-center">
            <p className="text-white/20 text-[10px] font-black uppercase tracking-[0.5em] mb-2">Estimated Total</p>
            <p className="text-white text-5xl md:text-7xl font-black tracking-tighter">${calculateTotal()}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start px-4">
          
          <div className="lg:col-span-8 w-full max-w-2xl mx-auto">
            <GlassCard className="p-6 md:p-12 border-white/5 relative overflow-hidden min-h-[500px] flex items-center justify-center">
              <AnimatePresence mode="wait">
                {isSuccess ? (
                  <motion.div key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-10 w-full max-w-lg mx-auto">
                    {user ? (
                      <div className="space-y-8">
                        <div className="w-24 h-24 rounded-full bg-linear-to-br from-[#fbbf24] to-[#8b5cf6] p-1 mx-auto relative">
                          <div className="w-full h-full rounded-full bg-black flex items-center justify-center">
                            <Trophy className="w-10 h-10" style={{ color: userProfile ? getTier(userProfile.xp).color : '#fff' }} />
                          </div>
                        </div>
                        <h3 className="text-4xl font-black text-white mb-2 uppercase">Prestige Updated</h3>
                        <Link href="/dashboard" className="block w-full">
                          <PrismButton variant="gold" className="w-full py-5">Return to Dashboard</PrismButton>
                        </Link>
                      </div>
                    ) : (
                      <div className="space-y-10">
                        <ShieldCheck className="w-20 h-20 text-[#fbbf24] mx-auto" />
                        <h3 className="text-4xl font-black text-white mb-2 uppercase tracking-tighter">Session Secured</h3>
                        <div className="grid grid-cols-1 gap-4">
                          <Link href="/auth" className="block w-full"><PrismButton variant="gold" className="w-full py-5 text-[10px]">Claim Points & Join</PrismButton></Link>
                          <Link href="/auth" className="block w-full"><PrismButton variant="outline" className="w-full py-5 text-[10px]">Existing Member Login</PrismButton></Link>
                        </div>
                      </div>
                    )}
                  </motion.div>
                ) : (
                  <div className="space-y-8 relative z-10 w-full">
                    {error && (
                      <div className="bg-red-500/10 border border-red-500/20 text-red-500 px-6 py-4 rounded-xl text-xs font-bold">{error}</div>
                    )}

                    {step === 1 && (
                      <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className={inputWrapperClasses}>
                            <label className={labelClasses}>Full Name</label>
                            <User className={iconClasses} />
                            <input required type="text" autoComplete="name" className={inputClasses} value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                          </div>
                          <div className={inputWrapperClasses}>
                            <label className={labelClasses}>Email Address</label>
                            <Mail className={iconClasses} />
                            <input required type="email" autoComplete="email" className={inputClasses} value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                          </div>
                          <div className={inputWrapperClasses}>
                            <label className={labelClasses}>Phone Number</label>
                            <Phone className={iconClasses} />
                            <input required type="tel" autoComplete="tel" className={inputClasses} value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                          </div>
                          <div className={inputWrapperClasses}>
                            <label className={labelClasses}>Service Address</label>
                            <MapPin className={iconClasses} />
                            <Autocomplete
                              apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}
                              onPlaceSelected={(place) => setFormData({ ...formData, address: place.formatted_address || "" })}
                              options={{ types: ["address"], componentRestrictions: { country: "us" } }}
                              onChange={(e: any) => setFormData({ ...formData, address: e.target.value })}
                              value={formData.address}
                              className={inputClasses}
                              placeholder="Search..."
                            />
                          </div>
                        </div>
                        <PrismButton variant="gold" onClick={nextStep} className="w-full py-6 group">
                          Next Stage <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </PrismButton>
                      </motion.div>
                    )}

                    {step === 2 && (
                      <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
                        <div className="space-y-6">
                          <div className="flex items-center justify-between">
                            <label className={labelClasses}>Vehicles</label>
                            <button onClick={addVehicle} className="text-[#fbbf24] text-[10px] font-black uppercase tracking-widest flex items-center gap-2"><Plus className="w-3 h-3" /> Add Car</button>
                          </div>
                          {vehicles.map((v, i) => (
                            <div key={i} className="relative group/v">
                              <Car className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                              <input placeholder={`Vehicle ${i+1}`} className={cn(inputClasses, "pr-12")} value={v} onChange={(e) => updateVehicle(i, e.target.value)} />
                              {vehicles.length > 1 && <button onClick={() => removeVehicle(i)} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/10 hover:text-red-500"><X className="w-4 h-4" /></button>}
                            </div>
                          ))}
                        </div>
                        <div className={inputWrapperClasses}>
                          <label className={labelClasses}>Package</label>
                          <Layers className={iconClasses} />
                          <select className={cn(inputClasses, "appearance-none")} style={{ backgroundColor: "#0f0f0f" }} value={formData.service} onChange={(e) => setFormData({ ...formData, service: e.target.value })}>
                            {Object.keys(servicePrices).map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-4">
                          <button onClick={prevStep} className="flex-1 py-6 rounded-xl border border-white/5 text-white/40 font-black uppercase text-[10px] tracking-widest">Back</button>
                          <PrismButton variant="gold" onClick={nextStep} className="flex-[2] py-6 group">Next Stage <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" /></PrismButton>
                        </div>
                      </motion.div>
                    )}

                    {step === 3 && (
                      <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
                        <CustomCalendar selectedDate={formData.date} onSelect={(date) => setFormData({ ...formData, date })} />
                        <div className="grid grid-cols-2 gap-2">
                          {getTimeSlots().filter(slot => !bookedTimes.includes(slot.value)).map(slot => (
                            <button key={slot.value} onClick={() => setFormData({ ...formData, time: slot.value })} className={cn("px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all", formData.time === slot.value ? "bg-[#fbbf24] text-black" : "bg-white/5 border-white/5 text-white/40")}>{slot.label}</button>
                          ))}
                        </div>
                        <div className="flex flex-col sm:flex-row gap-4">
                          <button onClick={prevStep} className="flex-1 py-6 rounded-xl border border-white/5 text-white/40 font-black uppercase text-[10px] tracking-widest">Back</button>
                          <div className="flex-[2] flex flex-col gap-2">
                            <PrismButton variant="gold" onClick={() => handleSubmit('stripe')} className="py-6 text-[10px] font-black uppercase tracking-widest flex flex-col items-center gap-1">
                              {isSubmitting === 'stripe' ? "Transmitting..." : "Pay with Stripe Secure"}
                            </PrismButton>
                            <button onClick={() => handleSubmit('after_service')} className="py-4 text-[8px] font-black text-white/30 uppercase tracking-[0.2em] hover:text-white transition-colors">Or Pay After Service</button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </div>
                )}
              </AnimatePresence>
            </GlassCard>
          </div>

          <div className="lg:col-span-4 space-y-6 w-full max-w-2xl mx-auto text-center">
            <GlassCard glowColor="amber" className={cn("p-8 border-white/5", travelInfo.fee > 0 ? "bg-[#fbbf24]/5" : "bg-white/[0.02]")}>
              <div className="flex flex-col items-center gap-4 mb-4"><Truck className="w-6 h-6 text-[#fbbf24]" /><p className="text-white text-xs font-bold uppercase tracking-widest">Travel Fee Logic</p></div>
              <div className="flex justify-between text-[10px] font-black uppercase tracking-widest"><span className="text-white/40">Distance</span><span className="text-white">{travelInfo.distance} Miles</span></div>
              <div className="flex justify-between text-[10px] font-black uppercase tracking-widest mt-2"><span className="text-white/40">Overage Fee</span><span className={cn(travelInfo.fee > 0 ? "text-[#fbbf24]" : "text-green-500")}>{travelInfo.fee > 0 ? `+$${travelInfo.fee}` : "Complimentary"}</span></div>
            </GlassCard>
            {userProfile && userProfile.xp >= 10 && (
              <GlassCard glowColor="amber" className="p-8 border-[#fbbf24]/20 bg-[#fbbf24]/5">
                <div className="flex flex-col items-center gap-4 mb-4">
                  <Trophy className="w-6 h-6 text-[#fbbf24]" />
                  <h4 className="text-white font-black uppercase tracking-widest text-[10px]">Prestige Redemption</h4>
                  <button onClick={() => setRedeemXp(!redeemXp)} className={cn("w-14 h-7 rounded-full relative transition-colors duration-300", redeemXp ? "bg-[#fbbf24]" : "bg-white/10")}><div className={cn("absolute top-1 w-5 h-5 rounded-full bg-black transition-all duration-300", redeemXp ? "left-8" : "left-1")} /></button>
                </div>
                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-green-500"><span>Available Credit</span><span>-${calculateXpDiscountValue()}</span></div>
              </GlassCard>
            )}
          </div>
        </div>
      </div>
    </Section>
  );
}
