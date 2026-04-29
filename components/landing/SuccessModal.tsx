"use client";

import { useEffect, useRef, useState } from "react";
import { X, Check, Calendar, Clock, MapPin, Smartphone, ChevronDown, ExternalLink, UserPlus, Sparkles, Trophy, Zap, ShieldCheck, Star } from "lucide-react";
import { LOYALTY_TIERS, getTier, detailsToNextTier } from "@/lib/loyalty";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";

export interface SuccessModalData {
  confirmationId: string;
  date: string;
  time?: string;
  serviceName: string;
  firstName: string;
  serviceAddress?: string;
  isGuest?: boolean;
  email?: string;
  phone?: string;
  /** New completed detail count after this booking */
  loyaltyNewCount?: number;
  /** New discount % after this booking */
  loyaltyNewDiscountPct?: number;
  /** Tier name just unlocked, if any ("Member" | "Silver" | "Gold" | "VIP") */
  loyaltyTierJustUnlocked?: string;
}

interface SuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: SuccessModalData | null;
}

const GOLD = "#d4af37";
const CHAMPAGNE = "#f7e7ce";

function fireGoldConfetti() {
  const defaults = {
    origin: { y: 0.55 },
    zIndex: 9999,
    colors: [GOLD, CHAMPAGNE, "#c9a227", "#e8d5a3", "#ffffff"],
    disableForReducedMotion: true,
  };
  confetti({ ...defaults, particleCount: 60, spread: 65, origin: { x: 0.25, y: 0.6 }, startVelocity: 42 });
  confetti({ ...defaults, particleCount: 60, spread: 65, origin: { x: 0.75, y: 0.6 }, startVelocity: 42 });
  setTimeout(() => {
    confetti({ ...defaults, particleCount: 70, spread: 100, startVelocity: 30, gravity: 0.9 });
  }, 200);
}

function parseTime(time: string): { h: number; m: number } | null {
  const twelveHour = time.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (twelveHour) {
    let h = parseInt(twelveHour[1], 10);
    const m = parseInt(twelveHour[2], 10);
    const period = twelveHour[3].toUpperCase();
    if (period === "PM" && h !== 12) h += 12;
    if (period === "AM" && h === 12) h = 0;
    return { h, m };
  }
  const twentyFour = time.match(/^(\d{2}):(\d{2})$/);
  if (twentyFour) {
    return { h: parseInt(twentyFour[1], 10), m: parseInt(twentyFour[2], 10) };
  }
  return null;
}

function formatTimeDisplay(time: string): string {
  const parsed = parseTime(time);
  if (!parsed) return time;
  if (/AM|PM/i.test(time)) return time;
  const { h, m } = parsed;
  const period = h >= 12 ? "PM" : "AM";
  const displayH = h % 12 || 12;
  return `${displayH}:${String(m).padStart(2, "0")} ${period}`;
}

function formatModalDate(dateStr: string): string {
  if (!dateStr) return dateStr;
  if (/[a-zA-Z]{3,}/.test(dateStr)) return dateStr;
  try {
    const [year, month, day] = dateStr.split("-").map(Number);
    return new Date(year, month - 1, day).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function buildGoogleCalendarUrl(data: SuccessModalData): string {
  const [year, month, day] = data.date.split("-").map(Number);
  let startH = 9, startM = 0;
  if (data.time) {
    const parsed = parseTime(data.time);
    if (parsed) { startH = parsed.h; startM = parsed.m; }
  }
  let endH = startH + 2;
  let endM = startM;
  if (endH >= 24) endH = 23;

  const pad = (n: number) => String(n).padStart(2, "0");
  const fmt = (y: number, mo: number, d: number, h: number, mi: number) =>
    `${y}${pad(mo)}${pad(d)}T${pad(h)}${pad(mi)}00`;

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: `Auto Detailing — ${data.serviceName}`,
    dates: `${fmt(year, month, day, startH, startM)}/${fmt(year, month, day, endH, endM)}`,
    details: "Your Arise & Shine VT mobile detailing appointment.",
    ...(data.serviceAddress ? { location: data.serviceAddress } : {}),
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function downloadIcs(data: SuccessModalData) {
  const [year, month, day] = data.date.split("-").map(Number);
  let startH = 9, startM = 0;
  if (data.time) {
    const parsed = parseTime(data.time);
    if (parsed) { startH = parsed.h; startM = parsed.m; }
  }
  let endH = startH + 2;
  const endM = startM;
  if (endH >= 24) endH = 23;

  const pad = (n: number) => String(n).padStart(2, "0");
  const fmt = (y: number, mo: number, d: number, h: number, mi: number) =>
    `${y}${pad(mo)}${pad(d)}T${pad(h)}${pad(mi)}00`;

  const uid = `${data.confirmationId || Date.now()}@ariseandshinevt.com`;
  const now = fmt(new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate(), new Date().getHours(), new Date().getMinutes());

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Arise & Shine VT//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${now}`,
    `DTSTART:${fmt(year, month, day, startH, startM)}`,
    `DTEND:${fmt(year, month, day, endH, endM)}`,
    `SUMMARY:Auto Detailing — ${data.serviceName}`,
    "DESCRIPTION:Your Arise & Shine VT mobile detailing appointment.",
    ...(data.serviceAddress ? [`LOCATION:${data.serviceAddress}`] : []),
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "arise-and-shine-vt-appointment.ics";
  a.click();
  URL.revokeObjectURL(url);
}

export function SuccessModal({ isOpen, onClose, data }: SuccessModalProps) {
  const hasFiredConfetti = useRef(false);
  const [showCalendarOptions, setShowCalendarOptions] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  // NOTE: body scroll intentionally NOT locked — background remains scrollable
  useEffect(() => {
    if (!isOpen) {
      hasFiredConfetti.current = false;
      setShowCalendarOptions(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && data && !hasFiredConfetti.current) {
      hasFiredConfetti.current = true;
      const t = setTimeout(fireGoldConfetti, 350);
      return () => clearTimeout(t);
    }
  }, [isOpen, data]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] overflow-y-auto">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-md"
            onClick={onClose}
          />

          {/* Scroll container */}
          <div className="flex min-h-full items-end sm:items-center justify-center sm:p-4 sm:py-8 pointer-events-none">
            {/* Panel */}
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 40, scale: 0.97 }}
              transition={{ type: "spring", damping: 28, stiffness: 320 }}
              className="pointer-events-auto relative z-10 w-full sm:max-w-md bg-zinc-900 rounded-t-[28px] sm:rounded-[24px] overflow-hidden shadow-[0_32px_64px_rgba(0,0,0,0.6)]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Gradient header band */}
              <div className="relative bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800 pt-10 pb-8 px-7 text-center overflow-hidden border-b border-white/[0.06]">
                {/* Gold shimmer lines */}
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#d4af37]/50 to-transparent" />
                  <div
                    className="absolute -top-20 left-1/2 -translate-x-1/2 w-64 h-40 rounded-full"
                    style={{ background: "radial-gradient(circle, rgba(212,175,55,0.12) 0%, transparent 70%)" }}
                  />
                </div>

                {/* Close */}
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-zinc-500 hover:text-white transition-colors"
                >
                  <X size={15} />
                </button>

                {/* Animated checkmark */}
                <motion.div
                  initial={{ scale: 0, rotate: -20 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.1, type: "spring", damping: 16, stiffness: 260 }}
                  className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4"
                  style={{
                    background: "linear-gradient(135deg, #d4af37 0%, #f0d060 50%, #AA771C 100%)",
                    boxShadow: "0 0 32px rgba(212,175,55,0.4), 0 0 64px rgba(212,175,55,0.15)",
                  }}
                >
                  <Check size={28} className="text-zinc-900" strokeWidth={3} />
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.3 }}
                >
                  <h2 className="text-2xl font-black text-white tracking-tight mb-1">
                    You&apos;re all set{data?.firstName ? `, ${data.firstName}` : ""}!
                  </h2>
                  <p className="text-sm text-zinc-400">
                    Confirmation sent to your email.
                  </p>
                </motion.div>
              </div>

              <div className="px-6 pt-5 pb-7 flex flex-col gap-3">
                {/* Details card */}
                {data && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25, duration: 0.3 }}
                  >
                    <div className="rounded-2xl border border-white/[0.08] bg-zinc-950/60 overflow-hidden divide-y divide-white/[0.05]">
                      {/* Service name */}
                      <div className="px-5 py-3.5 flex items-center gap-3">
                        <div className="w-7 h-7 rounded-lg bg-[#d4af37]/10 border border-[#d4af37]/20 flex items-center justify-center shrink-0">
                          <Sparkles size={13} className="text-[#d4af37]" />
                        </div>
                        <div>
                          <p className="text-[10px] text-zinc-600 uppercase tracking-widest mb-0.5">Service</p>
                          <p className="text-sm font-bold text-white">{data.serviceName}</p>
                        </div>
                      </div>

                      {/* Date + Time */}
                      <div className="px-5 py-3.5 grid grid-cols-2 gap-4">
                        <div className="flex items-center gap-2.5">
                          <Calendar size={13} className="text-zinc-500 shrink-0" />
                          <div>
                            <p className="text-[10px] text-zinc-600 uppercase tracking-widest mb-0.5">Date</p>
                            <p className="text-sm font-semibold text-white leading-tight">{formatModalDate(data.date)}</p>
                          </div>
                        </div>
                        {data.time && (
                          <div className="flex items-center gap-2.5">
                            <Clock size={13} className="text-zinc-500 shrink-0" />
                            <div>
                              <p className="text-[10px] text-zinc-600 uppercase tracking-widest mb-0.5">Time</p>
                              <p className="text-sm font-semibold text-white">{formatTimeDisplay(data.time)}</p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Address */}
                      {data.serviceAddress && (
                        <div className="px-5 py-3.5 flex items-start gap-2.5">
                          <MapPin size={13} className="text-zinc-500 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-[10px] text-zinc-600 uppercase tracking-widest mb-0.5">Location</p>
                            <p className="text-sm font-semibold text-white leading-snug">{data.serviceAddress}</p>
                          </div>
                        </div>
                      )}

                      {/* Confirmation ID */}
                      {data.confirmationId && (
                        <div className="px-5 py-3 bg-zinc-950/40">
                          <p className="text-[10px] text-zinc-600 uppercase tracking-widest mb-0.5">Confirmation #</p>
                          <p className="text-xs font-mono text-zinc-400">#{data.confirmationId.slice(0, 8).toUpperCase()}</p>
                        </div>
                      )}
                    </div>


                    {/* Add to Calendar */}
                    <div className="mt-3">
                      <button
                        type="button"
                        onClick={() => setShowCalendarOptions((v) => !v)}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-800/60 border border-white/[0.06] hover:bg-zinc-800 hover:border-white/[0.1] transition-colors"
                      >
                        <Calendar size={12} className="text-zinc-400" />
                        <span className="text-xs font-medium text-zinc-400">Add to Calendar</span>
                        <ChevronDown
                          size={12}
                          className={`text-zinc-600 transition-transform duration-200 ${showCalendarOptions ? "rotate-180" : ""}`}
                        />
                      </button>

                      <AnimatePresence>
                        {showCalendarOptions && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.18 }}
                            className="overflow-hidden"
                          >
                            <div className="pt-2 grid grid-cols-2 gap-2">
                              <a
                                href={buildGoogleCalendarUrl(data)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-zinc-800/60 border border-white/[0.06] hover:bg-zinc-800 hover:border-white/[0.1] transition-colors"
                              >
                                <ExternalLink size={11} className="text-zinc-500" />
                                <span className="text-xs font-medium text-zinc-300">Google</span>
                              </a>
                              <button
                                type="button"
                                onClick={() => downloadIcs(data)}
                                className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-zinc-800/60 border border-white/[0.06] hover:bg-zinc-800 hover:border-white/[0.1] transition-colors"
                              >
                                <Calendar size={11} className="text-zinc-500" />
                                <span className="text-xs font-medium text-zinc-300">Apple / iCal</span>
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                )}

                {/* Loyalty tier progress */}
                {data && !data.isGuest && data.loyaltyNewCount !== undefined && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.35, duration: 0.3 }}
                  >
                    {data.loyaltyTierJustUnlocked ? (
                      // Tier just unlocked — celebrate
                      <div className="rounded-2xl border border-[#d4af37]/30 bg-gradient-to-br from-[#d4af37]/10 to-[#d4af37]/[0.03] p-4 text-center">
                        <div className="text-2xl mb-1">🎉</div>
                        <p className="text-sm font-black text-[#d4af37] mb-0.5">
                          {data.loyaltyTierJustUnlocked} Tier Unlocked!
                        </p>
                        <p className="text-xs text-zinc-400">
                          You now get <span className="text-white font-bold">{data.loyaltyNewDiscountPct}% off</span> every vehicle detail — automatically applied at checkout.
                        </p>
                        <div className="mt-3 flex items-center justify-center gap-1">
                          {LOYALTY_TIERS.slice().reverse().map((t) => {
                            const unlocked = (data.loyaltyNewCount ?? 0) >= t.minDetails;
                            return (
                              <div key={t.label} className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border ${unlocked ? "bg-[#d4af37]/15 border-[#d4af37]/40 text-[#d4af37]" : "bg-white/[0.03] border-white/[0.06] text-zinc-700"}`}>
                                {t.label}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      // Show progress toward next tier
                      (() => {
                        const count  = data.loyaltyNewCount ?? 0;
                        const toNext = detailsToNextTier(count);
                        const tier   = getTier(count);
                        return (
                          <div className="rounded-2xl border border-white/[0.07] bg-zinc-950/60 px-4 py-3 flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-[#d4af37]/10 border border-[#d4af37]/20 flex items-center justify-center shrink-0">
                              {tier?.label === "VIP"    ? <Trophy size={15} className="text-[#d4af37]" /> :
                               tier?.label === "Gold"   ? <Zap    size={15} className="text-[#d4af37]" /> :
                               tier?.label === "Silver" ? <ShieldCheck size={15} className="text-zinc-300" /> :
                               tier                     ? <Star   size={15} className="text-zinc-400" /> :
                               <Sparkles size={15} className="text-zinc-600" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              {tier ? (
                                <>
                                  <p className="text-xs font-bold text-white">{tier.label} member — {data.loyaltyNewDiscountPct}% off vehicle details</p>
                                  <p className="text-[10px] text-zinc-600 mt-0.5">
                                    {toNext ? `${toNext} more detail${toNext === 1 ? "" : "s"} to unlock the next tier` : "Max tier — 20% off forever 🎉"}
                                  </p>
                                </>
                              ) : (
                                <>
                                  <p className="text-xs font-bold text-white">Loyalty progress: {count} detail{count !== 1 ? "s" : ""}</p>
                                  <p className="text-[10px] text-zinc-600 mt-0.5">{toNext} more to unlock 5% off (Member tier)</p>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })()
                    )}
                  </motion.div>
                )}

                {/* Guest sign-up nudge */}
                {data?.isGuest && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.42, duration: 0.3 }}
                  >
                    <a
                      href={`/auth/login?signup=true${data?.email ? `&email=${encodeURIComponent(data.email)}` : ""}`}
                      className="flex items-start gap-3 px-4 py-3.5 rounded-xl border border-[#d4af37]/20 bg-[#d4af37]/[0.04] hover:bg-[#d4af37]/[0.08] hover:border-[#d4af37]/35 transition-all text-left group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-[#d4af37]/10 border border-[#d4af37]/20 flex items-center justify-center shrink-0 mt-0.5">
                        <UserPlus size={14} className="text-[#d4af37]" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white mb-0.5">Save booking + track your loyalty tier</p>
                        <p className="text-[11px] text-zinc-500 leading-snug">Create a free account to track appointments and unlock loyalty discounts.</p>
                      </div>
                    </a>
                  </motion.div>
                )}

                {/* Done CTA */}
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: data?.isGuest ? 0.5 : 0.42, duration: 0.3 }}
                  className="space-y-2.5"
                >
                  <button
                    onClick={onClose}
                    className="w-full py-4 rounded-xl font-black text-sm tracking-wide text-zinc-950 transition-all active:scale-[0.98]"
                    style={{
                      background: "linear-gradient(135deg, #d4af37 0%, #f0d060 50%, #d4af37 100%)",
                      boxShadow: "0 4px 20px rgba(212,175,55,0.3)",
                    }}
                  >
                    Done
                  </button>

                  <div className="flex items-center justify-center gap-1.5 text-[11px] text-zinc-600">
                    <Smartphone size={10} />
                    <span>Questions? Call or text <span className="text-zinc-400 font-medium">802-585-5563</span></span>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}
