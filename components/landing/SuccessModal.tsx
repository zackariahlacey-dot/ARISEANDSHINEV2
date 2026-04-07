"use client";

import { useEffect, useRef, useState } from "react";
import { X, Check, Calendar, Clock, MapPin, Smartphone, Mail, ChevronDown, ExternalLink, UserPlus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";

export interface SuccessModalData {
  confirmationId: string;
  date: string;
  time?: string;
  serviceName: string;
  pointsEarned: number;
  firstName: string;
  serviceAddress?: string;
  isGuest?: boolean;
  /** Optional: phone for modal to re-fetch latest points when user is guest */
  phone?: string;
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

/** Parse "9:00 AM", "2:30 PM", or "14:30" / "09:00" → { h, m } */
function parseTime(time: string): { h: number; m: number } | null {
  // 12-hour: "9:00 AM"
  const twelveHour = time.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (twelveHour) {
    let h = parseInt(twelveHour[1], 10);
    const m = parseInt(twelveHour[2], 10);
    const period = twelveHour[3].toUpperCase();
    if (period === "PM" && h !== 12) h += 12;
    if (period === "AM" && h === 12) h = 0;
    return { h, m };
  }
  // 24-hour: "14:30" or "09:00"
  const twentyFour = time.match(/^(\d{2}):(\d{2})$/);
  if (twentyFour) {
    return { h: parseInt(twentyFour[1], 10), m: parseInt(twentyFour[2], 10) };
  }
  return null;
}

/** Format a parsed time for display, e.g. { h:14, m:0 } → "2:00 PM" */
function formatTimeDisplay(time: string): string {
  const parsed = parseTime(time);
  if (!parsed) return time;
  // Already 12h format — return as-is
  if (/AM|PM/i.test(time)) return time;
  const { h, m } = parsed;
  const period = h >= 12 ? "PM" : "AM";
  const displayH = h % 12 || 12;
  return `${displayH}:${String(m).padStart(2, "0")} ${period}`;
}

/** Build a Google Calendar event URL. Uses floating (local) time. */
function buildGoogleCalendarUrl(data: SuccessModalData): string {
  const [year, month, day] = data.date.split("-").map(Number);
  let startH = 9, startM = 0;
  if (data.time) {
    const parsed = parseTime(data.time);
    if (parsed) { startH = parsed.h; startM = parsed.m; }
  }
  // End = start + 2 hours
  let endH = startH + 2;
  let endM = startM;
  if (endH >= 24) endH = 23;

  const pad = (n: number) => String(n).padStart(2, "0");
  const fmt = (y: number, mo: number, d: number, h: number, mi: number) =>
    `${y}${pad(mo)}${pad(d)}T${pad(h)}${pad(mi)}00`;

  const start = fmt(year, month, day, startH, startM);
  const end   = fmt(year, month, day, endH, endM);

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: `Auto Detailing — ${data.serviceName}`,
    dates: `${start}/${end}`,
    details: "Your Arise & Shine VT mobile detailing appointment.",
    ...(data.serviceAddress ? { location: data.serviceAddress } : {}),
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/** Generate and download an .ics file for Apple Calendar / Outlook. */
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

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && data && !hasFiredConfetti.current) {
      hasFiredConfetti.current = true;
      const t = setTimeout(fireGoldConfetti, 350);
      return () => clearTimeout(t);
    }
    if (!isOpen) {
      hasFiredConfetti.current = false;
      setShowCalendarOptions(false);
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
            className="fixed inset-0 bg-black/75 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Scroll container */}
          <div className="flex min-h-full items-end sm:items-center justify-center sm:p-4 sm:py-8">
            {/* Panel */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              transition={{ type: "spring", damping: 30, stiffness: 340 }}
              className="relative z-10 w-full sm:max-w-sm bg-zinc-900 border border-white/10 rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Top gold accent */}
              <div className="h-px w-full bg-gradient-to-r from-transparent via-[#d4af37]/70 to-transparent" />

              {/* Close */}
              <button
                onClick={onClose}
                className="absolute top-5 right-5 w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-zinc-500 hover:text-white transition-colors z-20"
              >
                <X size={16} />
              </button>

              <div className="px-6 pt-10 pb-8 flex flex-col items-center text-center">
                {/* Checkmark */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.08, type: "spring", damping: 18, stiffness: 280 }}
                  className="w-14 h-14 rounded-full bg-gradient-to-br from-[#d4af37] to-[#AA771C] p-px mb-5 shadow-[0_0_24px_rgba(212,175,55,0.3)]"
                >
                  <div className="w-full h-full rounded-full bg-zinc-900 flex items-center justify-center">
                    <Check size={24} className="text-[#d4af37]" strokeWidth={3} />
                  </div>
                </motion.div>

                {/* Heading */}
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.18, duration: 0.35 }}
                  className="mb-6"
                >
                  <h2 className="text-[22px] font-black text-white leading-tight mb-1">
                    You&apos;re all set{data?.firstName ? `, ${data.firstName}` : ""}.
                  </h2>
                  <p className="text-sm text-zinc-400">Confirmation details sent to your email.</p>
                </motion.div>

                {/* Details card */}
                {data && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.28, duration: 0.35 }}
                    className="w-full mb-4"
                  >
                    <div className="bg-zinc-950/70 border border-white/[0.07] rounded-2xl overflow-hidden divide-y divide-white/[0.05] text-left">
                      {/* Service */}
                      <div className="px-5 py-3.5">
                        <p className="text-[11px] text-zinc-500 mb-0.5 uppercase tracking-wide">Service</p>
                        <p className="text-sm font-semibold text-white">{data.serviceName}</p>
                      </div>

                      {/* Date + Time */}
                      <div className="px-5 py-3.5 flex gap-8">
                        <div>
                          <p className="text-[11px] text-zinc-500 mb-0.5 flex items-center gap-1 uppercase tracking-wide">
                            <Calendar size={9} />Date
                          </p>
                          <p className="text-sm font-semibold text-white">{data.date}</p>
                        </div>
                        {data.time && (
                          <div>
                            <p className="text-[11px] text-zinc-500 mb-0.5 flex items-center gap-1 uppercase tracking-wide">
                              <Clock size={9} />Time
                            </p>
                            <p className="text-sm font-semibold text-white">{formatTimeDisplay(data.time)}</p>
                          </div>
                        )}
                      </div>

                      {/* Address */}
                      {data.serviceAddress && (
                        <div className="px-5 py-3.5">
                          <p className="text-[11px] text-zinc-500 mb-0.5 flex items-center gap-1 uppercase tracking-wide">
                            <MapPin size={9} />Address
                          </p>
                          <p className="text-sm font-semibold text-white leading-snug">{data.serviceAddress}</p>
                        </div>
                      )}

                      {/* Confirmation ID */}
                      {data.confirmationId && (
                        <div className="px-5 py-3.5">
                          <p className="text-[11px] text-zinc-500 mb-0.5 uppercase tracking-wide">Confirmation</p>
                          <p className="text-sm font-mono font-semibold text-zinc-300">#{data.confirmationId}</p>
                        </div>
                      )}
                    </div>

                    {/* Points badge */}
                    {data.pointsEarned > 0 && (
                      <div className="mt-2.5 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#d4af37]/[0.07] border border-[#d4af37]/20">
                        <span className="text-[#d4af37] text-xs font-bold">+{data.pointsEarned.toLocaleString()} pts</span>
                        <span className="text-zinc-600 text-xs">credited after service</span>
                      </div>
                    )}

                    {/* Reminder notice */}
                    <div className="mt-2.5 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-800/50 border border-white/[0.05]">
                      <Mail size={11} className="text-zinc-500 shrink-0" />
                      <span className="text-zinc-500 text-xs">Reminder email coming the day before</span>
                    </div>

                    {/* Add to Calendar */}
                    <div className="mt-2.5">
                      <button
                        type="button"
                        onClick={() => setShowCalendarOptions((v) => !v)}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-800/50 border border-white/[0.05] hover:border-white/10 hover:bg-zinc-800/80 transition-colors"
                      >
                        <Calendar size={11} className="text-zinc-400 shrink-0" />
                        <span className="text-zinc-400 text-xs font-medium">Add to Calendar</span>
                        <ChevronDown
                          size={11}
                          className={`text-zinc-500 transition-transform duration-200 ${showCalendarOptions ? "rotate-180" : ""}`}
                        />
                      </button>

                      <AnimatePresence>
                        {showCalendarOptions && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2, ease: "easeInOut" }}
                            className="overflow-hidden"
                          >
                            <div className="pt-1.5 grid grid-cols-2 gap-1.5">
                              <a
                                href={buildGoogleCalendarUrl(data)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-zinc-800/60 border border-white/[0.05] hover:border-white/10 hover:bg-zinc-800 transition-colors"
                              >
                                <ExternalLink size={10} className="text-zinc-500" />
                                <span className="text-zinc-300 text-xs font-medium">Google</span>
                              </a>
                              <button
                                type="button"
                                onClick={() => downloadIcs(data)}
                                className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-zinc-800/60 border border-white/[0.05] hover:border-white/10 hover:bg-zinc-800 transition-colors"
                              >
                                <Calendar size={10} className="text-zinc-500" />
                                <span className="text-zinc-300 text-xs font-medium">Apple / iCal</span>
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                )}

                {/* Guest account nudge */}
                {data?.isGuest && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.36, duration: 0.35 }}
                    className="w-full mb-4"
                  >
                    <a
                      href="/auth/login?signup=true"
                      className="flex items-start gap-3 px-4 py-3.5 rounded-2xl bg-zinc-800/50 border border-white/[0.07] hover:border-[#d4af37]/30 hover:bg-zinc-800/80 transition-colors text-left group"
                    >
                      <div className="w-7 h-7 rounded-full bg-[#d4af37]/10 border border-[#d4af37]/20 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-[#d4af37]/20 transition-colors">
                        <UserPlus size={13} className="text-[#d4af37]" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-white mb-0.5">Save this booking to your account</p>
                        <p className="text-[11px] text-zinc-500 leading-snug">Create a free account to track your appointment and earn loyalty points.</p>
                      </div>
                    </a>
                  </motion.div>
                )}

                {/* CTA */}
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: data?.isGuest ? 0.44 : 0.38, duration: 0.35 }}
                  className="w-full space-y-3"
                >
                  <button
                    onClick={onClose}
                    className="w-full py-3.5 rounded-xl bg-[#d4af37] text-zinc-950 font-black text-sm tracking-wide hover:bg-amber-400 active:scale-[0.98] transition-all"
                  >
                    Done
                  </button>
                  <div className="flex items-center justify-center gap-1.5 text-[11px] text-zinc-600">
                    <Smartphone size={11} />
                    <span>Questions? Call <span className="text-zinc-400">802-585-5563</span></span>
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
