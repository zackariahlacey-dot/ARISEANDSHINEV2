"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin,
  Shield,
  ShieldCheck,
  Leaf,
  BadgeCheck,
  Star,
  ChevronDown,
  Sparkles,
  Car,
  Brush,
  Anchor,
  Truck,
  LayoutDashboard,
  CalendarClock,
  CalendarRange,
  CircleSlash,
  Crown,
  Menu,
  X,
  CheckCircle,
  Phone,
  Gem,
  AlertTriangle,
} from "lucide-react";
import { createClient as createBrowserSupabaseClient } from "@/lib/supabase/client";
import type { Service } from "@/app/page";
import type { SuccessModalData } from "./SuccessModal";
import type { DraftBooking } from "./BookingModal";
import { LoyaltyHeaderButton } from "./LoyaltyHeaderButton";
import { BookingFlowSelector } from "./BookingFlowSelector";
import { recoverStripeBooking } from "@/app/actions/recoverStripeBooking";

const BookingSection = dynamic(
  () => import("./BookingModal").then((m) => ({ default: m.BookingSection })),
  {
    ssr: true,
    loading: () => (
      <section className="min-h-[420px] rounded-xl bg-zinc-900/30 animate-pulse" aria-hidden />
    ),
  }
);

const SuccessModal = dynamic(
  () => import("./SuccessModal").then((m) => ({ default: m.SuccessModal })),
  { ssr: false }
);
import { RecentActivityToast } from "./RecentActivityToast";
import { Button } from "@/components/ui/button";
import { getAuthProfile } from "@/app/actions/getAuthProfile";
import { LegalModal, LegalSection, LegalList } from "./LegalModal";
import { BeforeAfterSlider } from "./BeforeAfterSlider";

const sectionViewport = { once: true, margin: "-100px" };
const sectionVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
};
const staggerContainer = {
  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.05 } },
  hidden: {},
};
const staggerItem = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
};

const HERO_SCROLL_THRESHOLD = 0.8; // Show sticky CTA after 80% of viewport scrolled

const SERVICE_LINKS = [
  { href: "/detailing", label: "Vehicle Detailing", icon: Car, desc: "Interior, Exterior & Full Detail" },
  { href: "/boat-detailing", label: "Boat Detailing", icon: Anchor, desc: "Marine interior, exterior & full detail" },
  { href: "/rv-detailing", label: "RV Detailing", icon: Truck, desc: "Per-foot pricing for motorhomes & trailers" },
];

const REVIEWS = [
  {
    review:
      "I was blown away by how easy it was. They came right to my driveway in Williston while I worked from home. My SUV looked better than the day I bought it. The whole thing took maybe two hours and I didn't have to move a muscle.",
    name: "Sarah M.",
    location: "Williston, VT",
    service: "Full Detail",
  },
  {
    review:
      "My kids had completely destroyed the interior — crumbs, juice stains, the works. Arise & Shine did an interior reset that honestly looked like a miracle. The seats are spotless and it smells incredible. Worth every penny and then some.",
    name: "Jason R.",
    location: "Burlington, VT",
    service: "Interior Detail",
  },
  {
    review:
      "The paint on my truck hadn't shined like this since it was new. They were on time, professional, and clearly used premium products. The exterior detail removed swirl marks I'd had for years. I've already booked them for next month.",
    name: "Melissa T.",
    location: "South Burlington, VT",
    service: "Exterior Detail",
  },
  {
    review:
      "After a brutal Vermont winter, the salt and grime on my car was embarrassing. Arise & Shine came to my office and did a full exterior wash and detail. The wheel wells and undercarriage looked like new. No more rust worries.",
    name: "David K.",
    location: "Essex Junction, VT",
    service: "Exterior Detail",
  },
  {
    review:
      "We have three kids and a dog — our minivan was a disaster. Sticky cup holders, crushed goldfish in the seats, you name it. They did a deep interior clean and it's like we got a new vehicle. The headliner and carpets are spotless.",
    name: "Jennifer L.",
    location: "Colchester, VT",
    service: "Interior Detail",
  },
  {
    review:
      "I spilled an entire latte on my passenger seat and thought the stain was permanent. Arise & Shine got it out completely and the leather looks and smells like new. Fast, professional, and they came to my home. Highly recommend.",
    name: "Mike P.",
    location: "Winooski, VT",
    service: "Interior Detail",
  },
] as const;

type ExpandedBookingId = "hero" | "services" | "ultimate" | "boat" | "rv" | null;

export function LandingPage({ services }: { services: Service[] }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [expandedBookingId, setExpandedBookingId] = useState<ExpandedBookingId>(null);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [initialDraft, setInitialDraft] = useState<DraftBooking | null>(null);
  const [showRestoreToast, setShowRestoreToast] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isPastHero, setIsPastHero] = useState(false);
  const [authRewardPoints, setAuthRewardPoints] = useState<number | null>(null);
  const [legalModal, setLegalModal] = useState<"privacy" | "terms" | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successModalData, setSuccessModalData] = useState<SuccessModalData | null>(null);
  const [stripeVerifying, setStripeVerifying] = useState(false);
  const [stripeRecoveryError, setStripeRecoveryError] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [servicesDropdownOpen, setServicesDropdownOpen] = useState(false);
  const [flowSelectorOpen, setFlowSelectorOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [authEmail, setAuthEmail] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setAuthUserId(user?.id ?? null);
      setAuthEmail(user?.email ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthUserId(session?.user?.id ?? null);
      setAuthEmail(session?.user?.email ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const isAdmin = authEmail?.toLowerCase() === "zackariahlacey@gmail.com";
  const [currentReviewIndex, setCurrentReviewIndex] = useState(0);
  const reviewIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const bottomCtaRef = useRef<HTMLDivElement>(null);
  const carouselRef = useRef<HTMLDivElement>(null);
  const [isBottomCtaVisible, setIsBottomCtaVisible] = useState(false);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setServicesDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Intersection Observer to hide sticky CTA when reaching the bottom one
  useEffect(() => {
    if (!mounted) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsBottomCtaVisible(entry.isIntersecting);
      },
      { threshold: 0.1 }
    );

    if (bottomCtaRef.current) {
      observer.observe(bottomCtaRef.current);
    }

    return () => observer.disconnect();
  }, [mounted]);

  // Restore booking draft when returning from cancelled Stripe, success, or sign-up flow
  useEffect(() => {
    if (!mounted || typeof window === "undefined") return;
    const stripeParam = searchParams.get("stripe");
    const stripeCancelled = stripeParam === "cancelled";
    const stripeSuccess = stripeParam === "success";
    const restoreBooking = searchParams.get("restore_booking") === "1";
    if (!stripeCancelled && !stripeSuccess && !restoreBooking) return;
    const raw = sessionStorage.getItem("draftBooking");
    const path = window.location.pathname + (window.location.hash || "");
    window.history.replaceState(null, "", path || "/");
    if (!raw) return;
    try {
      const draft = JSON.parse(raw) as DraftBooking;
      sessionStorage.removeItem("draftBooking");
      if (stripeSuccess) {
        // Verify payment and recover booking if webhook hasn't fired yet
        const sessionId = searchParams.get("session_id");
        const service = services.find((s) => s.id === draft.serviceId);
        const firstName = draft.name?.trim().split(/\s+/)[0] ?? "there";

        if (sessionId) {
          setStripeVerifying(true);
          recoverStripeBooking(sessionId)
            .then((result) => {
              setStripeVerifying(false);
              if (result.status === "error") {
                setStripeRecoveryError(
                  "Your payment was received but we had trouble confirming your booking. Please contact us and we'll sort it out right away."
                );
                return;
              }
              if (result.status === "overbooked") {
                setStripeRecoveryError(
                  "Your payment went through but the time slot was just taken by someone else. We'll contact you to reschedule or issue a full refund."
                );
                return;
              }
              // "already_fulfilled" | "recovered" | "gift_card" | "not_paid" — all good
              const bookingDate =
                "bookingDate" in result ? result.bookingDate : (draft.selectedDate ?? "");
              const bookingTime =
                "bookingTime" in result ? result.bookingTime : (draft.selectedTime ?? "");
              const svcName =
                "serviceName" in result ? result.serviceName : (service?.name ?? "Detailing Service");
              setSuccessModalData({
                confirmationId: "",
                date: bookingDate,
                time: bookingTime || undefined,
                serviceName: svcName,
                pointsEarned: 0,
                firstName,
                serviceAddress: draft.serviceAddress || undefined,
                phone: draft.phone,
              });
              setShowSuccessModal(true);
            })
            .catch(() => {
              setStripeVerifying(false);
              // Fallback: show success anyway (webhook may have handled it)
              setSuccessModalData({
                confirmationId: "",
                date: draft.selectedDate ?? "",
                time: draft.selectedTime || undefined,
                serviceName: service?.name ?? "Detailing Service",
                pointsEarned: 0,
                firstName,
                serviceAddress: draft.serviceAddress || undefined,
                phone: draft.phone,
              });
              setShowSuccessModal(true);
            });
        } else {
          // No session_id in URL (old links) — show success modal from draft
          setSuccessModalData({
            confirmationId: "",
            date: draft.selectedDate ?? "",
            time: draft.selectedTime || undefined,
            serviceName: service?.name ?? "Detailing Service",
            pointsEarned: 0,
            firstName,
            serviceAddress: draft.serviceAddress || undefined,
            phone: draft.phone,
          });
          setShowSuccessModal(true);
        }
      } else {
        // Cancelled or rebook — restore the booking form
        setInitialDraft(draft);
        setSelectedService(services.find((s) => s.id === draft.serviceId) ?? null);
        setExpandedBookingId("hero");
        setShowRestoreToast(true);
      }
    } catch {
      // invalid draft
    }
  }, [mounted, searchParams, services]);

  useEffect(() => {
    if (!showRestoreToast) return;
    const t = setTimeout(() => setShowRestoreToast(false), 5000);
    return () => clearTimeout(t);
  }, [showRestoreToast]);

  useEffect(() => {
    getAuthProfile().then((p) => {
      setAuthRewardPoints(p?.rewardPoints ?? null);
    });
  }, [expandedBookingId]);

  useEffect(() => {
    const onScroll = () => {
      setIsScrolled(window.scrollY > 60);
      const threshold = typeof window !== "undefined" ? window.innerHeight * HERO_SCROLL_THRESHOLD : 0;
      setIsPastHero(window.scrollY >= threshold);
    };
    onScroll(); // run once for SSR/hydration
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const openBooking = (service?: Service) => {
    setSelectedService(service ?? null);
    if (!service) {
      setExpandedBookingId("hero");
    } else {
      setExpandedBookingId("services");
    }
  };

  const scrollToServices = useCallback(() => {
    setMobileMenuOpen(false);
    document.getElementById("services")?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const closeMobileMenu = useCallback(() => setMobileMenuOpen(false), []);

  const handleBookingSuccess = useCallback((data: SuccessModalData) => {
    setExpandedBookingId(null);
    setSuccessModalData(data);
    setShowSuccessModal(true);
    router.refresh();
  }, [router]);

  const handleCloseSuccessModal = useCallback(() => {
    setShowSuccessModal(false);
    setSuccessModalData(null);
    setSelectedService(null);
  }, []);

  const openUltimateBooking = useCallback((serviceName: string) => {
    const match = services.find(s => s.name === serviceName) ?? null;
    setSelectedService(match);
    setExpandedBookingId("ultimate");
  }, [services]);

  // Ultimate Series carousel
  const ultimateCarouselRef = useRef<HTMLDivElement>(null);
  const [ultimateCarouselActiveIdx, setUltimateCarouselActiveIdx] = useState(0);
  const scrollToUltimateCard = useCallback((idx: number) => {
    const el = ultimateCarouselRef.current;
    if (!el) return;
    el.scrollTo({ left: idx * el.clientWidth, behavior: "smooth" });
    setUltimateCarouselActiveIdx(idx);
  }, []);
  const handleUltimateCarouselScroll = useCallback(() => {
    const el = ultimateCarouselRef.current;
    if (!el) return;
    const idx = Math.round(el.scrollLeft / el.clientWidth);
    setUltimateCarouselActiveIdx(Math.min(Math.max(0, idx), 1));
  }, []);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileMenuOpen]);

  // Close mobile menu if viewport widens to desktop
  useEffect(() => {
    const onResize = () => { if (window.innerWidth >= 768) setMobileMenuOpen(false); };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Scroll service carousel to Full Detail on first mount (no animation so it's instant)
  useEffect(() => {
    if (!mounted || !carouselRef.current) return;
    const idx = carouselServices.findIndex((s) => s.name === "Full Detail");
    if (idx > 0) {
      carouselRef.current.scrollLeft = idx * carouselRef.current.clientWidth;
      setCarouselActiveIdx(idx);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted]);

  // Review carousel: native scroll auto-advance every 5s, clear on unmount
  useEffect(() => {
    const CARD_GAP = 24;
    reviewIntervalRef.current = setInterval(() => {
      const el = scrollRef.current;
      if (!el) return;
      const cardWidth = (cardRefs.current[0]?.offsetWidth ?? el.offsetWidth) + CARD_GAP;
      const isEnd = el.scrollLeft + el.offsetWidth >= el.scrollWidth - 10;
      if (isEnd) {
        el.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        el.scrollBy({ left: cardWidth, behavior: "smooth" });
      }
    }, 5000);
    return () => {
      if (reviewIntervalRef.current) clearInterval(reviewIntervalRef.current);
    };
  }, []);

  const mainGridServices = services.filter((s) => !s.is_subscription);

  // Fixed display order: Interior | Full Detail | Exterior — home page shows only these 3
  const CAROUSEL_ORDER = ["Interior Detail", "Full Detail", "Exterior Detail"];
  const carouselServices = useMemo(
    () => [...mainGridServices]
      .filter((s) => CAROUSEL_ORDER.includes(s.name))
      .sort((a, b) => {
        const ai = CAROUSEL_ORDER.indexOf(a.name);
        const bi = CAROUSEL_ORDER.indexOf(b.name);
        return ai - bi;
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mainGridServices]
  );

  const fullDetailIdx = carouselServices.findIndex((s) => s.name === "Full Detail");
  const [carouselActiveIdx, setCarouselActiveIdx] = useState(fullDetailIdx >= 0 ? fullDetailIdx : 1);

  const [activeServiceId, setActiveServiceId] = useState<string | null>(() => {
    const full = mainGridServices.find((s) => s.name === "Full Detail");
    return full?.id ?? mainGridServices[0]?.id ?? null;
  });
  const scrollToCard = useCallback((idx: number) => {
    const el = carouselRef.current;
    if (!el) return;
    el.scrollTo({ left: idx * el.clientWidth, behavior: "smooth" });
    setCarouselActiveIdx(idx);
    const svc = carouselServices[idx];
    if (svc) setActiveServiceId(svc.id);
  }, [carouselServices]);

  const handleCarouselScroll = useCallback(() => {
    const el = carouselRef.current;
    if (!el) return;
    const idx = Math.round(el.scrollLeft / el.clientWidth);
    const clamped = Math.min(Math.max(0, idx), carouselServices.length - 1);
    setCarouselActiveIdx(clamped);
    const svc = carouselServices[clamped];
    if (svc) setActiveServiceId(svc.id);
  }, [carouselServices]);


  return (
    <div className="min-h-screen bg-zinc-950 text-white overflow-x-hidden">
      {/* Toast: checkout cancelled, draft restored */}
      {showRestoreToast && (
        <div
          className="fixed top-4 left-1/2 z-[100] w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 rounded-2xl border border-yellow-500/30 bg-black/80 px-4 py-3 shadow-[0_0_20px_rgba(234,179,8,0.15)] backdrop-blur-md flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300"
          role="status"
          aria-live="polite"
        >
          <CheckCircle className="h-5 w-5 shrink-0 text-amber-400" aria-hidden />
          <p className="text-sm text-gray-300">
            Checkout cancelled. Your booking details have been saved—you can still choose to Pay at Arrival!
          </p>
        </div>
      )}

      {/* ─── Noise / grain texture overlay ─────────────────────── */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-[25]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          backgroundRepeat: "repeat",
          backgroundSize: "256px 256px",
          opacity: 0.035,
          mixBlendMode: "overlay",
        }}
      />
      {/* ─── Sticky Header ─────────────────────────────────────── */}
      <header
        className={`fixed top-0 inset-x-0 z-50 w-full py-3 md:h-16 transition-all duration-300 ${
          isScrolled || mobileMenuOpen
            ? "bg-black/95 backdrop-blur-md border-b border-white/[0.06] shadow-2xl"
            : "bg-transparent"
        }`}
      >
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <Image
            src="/e.png"
            alt="Arise And Shine VT Logo"
            width={40}
            height={40}
            className="object-contain drop-shadow-md shrink-0"
            priority
          />
          <span className="font-semibold tracking-tight text-sm hidden sm:block">
            Arise And Shine VT
          </span>
        </div>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-7 text-sm text-zinc-400">
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setServicesDropdownOpen(!servicesDropdownOpen)}
              className={`flex items-center gap-1 hover:text-white transition-colors py-2 ${
                servicesDropdownOpen ? "text-white" : ""
              }`}
            >
              Services
              <ChevronDown
                size={14}
                className={`transition-transform duration-300 ${
                  servicesDropdownOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            <AnimatePresence>
              {servicesDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="absolute top-full left-0 mt-2 w-80 bg-zinc-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden z-[60]"
                >
                  <div className="p-2">
                    {SERVICE_LINKS.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setServicesDropdownOpen(false)}
                        className="flex items-start gap-3 p-3 rounded-xl hover:bg-white/5 transition-all group"
                      >
                        <div className="mt-1 w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center border border-white/5 group-hover:border-[#D4AF37]/30 transition-colors">
                          <item.icon size={16} className="text-[#D4AF37]" />
                        </div>
                        <div>
                          <div className="text-sm font-bold text-white group-hover:text-[#D4AF37] transition-colors">
                            {item.label}
                          </div>
                          <div className="text-[11px] text-zinc-500 line-clamp-1">
                            {item.desc}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                  <div className="p-3 bg-white/[0.02] border-t border-white/5">
                    <button
                      onClick={() => {
                        setServicesDropdownOpen(false);
                        scrollToServices();
                      }}
                      className="text-[11px] font-bold uppercase tracking-widest text-[#D4AF37] hover:text-[#F3E5AB] transition-colors flex items-center gap-2"
                    >
                      Compare Packages
                      <ChevronDown size={12} className="-rotate-90" />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <a href="#why-us" className="hover:text-white transition-colors">Why Us</a>
          <a href="#contact" className="hover:text-white transition-colors">Contact</a>
          {isAdmin && (
            <Link
              href="/admin"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 hover:text-amber-300 transition-all text-xs font-bold uppercase tracking-wider"
            >
              <LayoutDashboard size={13} />
              Admin
            </Link>
          )}
        </nav>

        {/* Right: desktop (call + loyalty + book) and mobile (call + hamburger) */}
        <div className="flex items-center gap-2 md:gap-4">
          {/* Desktop: call link, loyalty, book now */}
          <a
            href="tel:8025855563"
            className="hidden md:flex items-center gap-2 text-zinc-400 hover:text-[#D4AF37] text-sm font-medium transition-colors duration-200"
          >
            <Phone className="w-4 h-4" />
            802-585-5563
          </a>
          <LoyaltyHeaderButton />
          <button
            type="button"
            onClick={() => {
              window.scrollTo({ top: 0, behavior: "smooth" });
              openBooking();
            }}
            className="btn-primary-gold-shimmer hidden md:flex items-center justify-center h-10 px-6 rounded-xl font-semibold tracking-wide text-sm bg-zinc-900/80 backdrop-blur-sm border border-[#D4AF37]/50 text-[#D4AF37] hover:text-black hover:shadow-[0_0_20px_rgba(212,175,55,0.3)] hover:scale-[1.03] active:scale-[0.98] transition-all duration-500 ease-in-out overflow-hidden"
          >
            <span className="relative z-[1]">Book Now</span>
          </button>

          {/* Mobile: quick-call + hamburger (matching circular buttons) */}
          <a
            href="tel:8025855563"
            className="flex md:hidden items-center justify-center w-10 h-10 rounded-full bg-zinc-900/80 backdrop-blur-md border border-[#D4AF37]/50 text-[#D4AF37] hover:bg-[#D4AF37] hover:text-zinc-950 active:bg-[#D4AF37] active:text-zinc-950 transition-colors duration-300"
            aria-label="Call 802-585-5563"
          >
            <Phone className="w-4 h-4" />
          </a>
          <button
            onClick={() => setMobileMenuOpen((o) => !o)}
            className="flex md:hidden items-center justify-center w-10 h-10 rounded-full bg-zinc-900/80 backdrop-blur-md border border-[#D4AF37]/50 text-[#D4AF37] hover:bg-[#D4AF37] hover:text-zinc-950 active:bg-[#D4AF37] active:text-zinc-950 transition-colors duration-300"
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
          >
            {mobileMenuOpen ? <X className="w-4 h-4" /> :             <Menu className="w-4 h-4" />}
          </button>
        </div>
        </div>
      </header>

      {/* ─── Mobile Menu Overlay ─────────────────────────────────── */}
      <div
        className={`md:hidden fixed inset-0 z-[45] flex flex-col transition-all duration-300 ease-in-out ${
          mobileMenuOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
        style={{ background: "rgba(9,9,11,0.97)", backdropFilter: "blur(16px)" }}
        aria-hidden={!mobileMenuOpen}
      >
        {/* Content: vertically centered links */}
        <div className="flex flex-col items-center justify-center flex-1 gap-2 px-8 overflow-y-auto">
          <nav className="flex flex-col items-center gap-1 w-full">
            {/* Services Dropdown (Mobile) */}
            <div className="w-full flex flex-col items-center">
              <button
                onClick={() => setServicesDropdownOpen(!servicesDropdownOpen)}
                className={`w-full text-center text-3xl font-black tracking-tight py-4 transition-all duration-200 flex items-center justify-center gap-3 ${
                  mobileMenuOpen ? "text-zinc-100 hover:text-[#D4AF37]" : "text-transparent"
                }`}
              >
                Services
                <ChevronDown
                  size={24}
                  className={`transition-transform duration-300 ${
                    servicesDropdownOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              <AnimatePresence>
                {servicesDropdownOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="w-full overflow-hidden"
                  >
                    <div className="grid grid-cols-1 gap-2 py-4">
                      {SERVICE_LINKS.map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={closeMobileMenu}
                          className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/5"
                        >
                          <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center border border-white/5">
                            <item.icon size={20} className="text-[#D4AF37]" />
                          </div>
                          <div className="text-left">
                            <div className="text-sm font-bold text-white">
                              {item.label}
                            </div>
                            <div className="text-[10px] text-zinc-500 uppercase tracking-widest mt-0.5">
                              {item.desc}
                            </div>
                          </div>
                        </Link>
                      ))}
                      <button
                        onClick={() => {
                          closeMobileMenu();
                          scrollToServices();
                        }}
                        className="w-full p-4 rounded-xl border border-dashed border-[#D4AF37]/30 text-[#D4AF37] text-sm font-bold uppercase tracking-widest"
                      >
                        Compare All Packages
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {[
              {
                label: "Why Us",
                action: () => {
                  closeMobileMenu();
                  document.getElementById("why-us")?.scrollIntoView({ behavior: "smooth" });
                },
              },
              {
                label: "Contact",
                action: () => {
                  closeMobileMenu();
                  document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" });
                },
              },
            ].map(({ label, action }) => (
              <button
                key={label}
                onClick={action}
                className={`w-full text-center text-3xl font-black tracking-tight py-4 transition-all duration-200 ${
                  mobileMenuOpen
                    ? "text-zinc-100 hover:text-[#D4AF37]"
                    : "text-transparent"
                }`}
              >
                {label}
              </button>
            ))}
          </nav>

          {/* Admin shortcut — only shown to the admin account */}
          {isAdmin && (
            <Link
              href="/admin"
              onClick={closeMobileMenu}
              className="flex items-center justify-center gap-2 w-full max-w-xs px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 font-bold text-sm uppercase tracking-wider hover:bg-amber-500/20 transition-all"
            >
              <LayoutDashboard size={15} />
              Admin Dashboard
            </Link>
          )}

          {/* Divider */}
          <div className="w-16 h-px bg-white/10 my-4" />

          {/* Loyalty button inside menu */}
          <div className="mb-4">
            <LoyaltyHeaderButton />
          </div>

          {/* Full-width Book Now CTA */}
          <button
            onClick={() => { closeMobileMenu(); openBooking(); }}
            className="btn-primary-gold-shimmer w-full max-w-xs bg-zinc-900/80 backdrop-blur-sm border border-[#D4AF37]/50 text-[#D4AF37] font-bold py-4 rounded-xl text-base hover:text-black hover:shadow-[0_0_20px_rgba(212,175,55,0.3)] hover:scale-[1.03] active:scale-[0.98] transition-all duration-500 ease-in-out"
          >
            <span className="relative z-[1]">Book Your Detail</span>
          </button>

          {/* Call us link */}
          <a
            href="tel:8025855563"
            onClick={closeMobileMenu}
            className="flex items-center justify-center gap-2 text-zinc-400 hover:text-[#D4AF37] text-sm font-medium transition-colors duration-200 mt-1"
          >
            <Phone className="w-4 h-4" />
            Call 802-585-5563
          </a>

          {/* Legal links */}
          <div className="flex items-center gap-5 mt-6">
            <button
              onClick={() => { closeMobileMenu(); setLegalModal("privacy"); }}
              className="text-xs text-zinc-600 hover:text-[#D4AF37] transition-colors"
            >
              Privacy Policy
            </button>
            <span className="text-zinc-800 text-xs">·</span>
            <button
              onClick={() => { closeMobileMenu(); setLegalModal("terms"); }}
              className="text-xs text-zinc-600 hover:text-[#D4AF37] transition-colors"
            >
              Terms of Service
            </button>
          </div>
        </div>

        {/* Subtle gold glow at bottom */}
        <div
          className="pointer-events-none absolute bottom-0 inset-x-0 h-48"
          style={{
            background: "radial-gradient(ellipse 60% 100% at 50% 100%, rgba(212,175,55,0.08) 0%, transparent 70%)",
          }}
        />
      </div>

      {/* ─── Hero ───────────────────────────────────────────────── */}
      <motion.section
        id="hero"
        initial="hidden"
        whileInView="visible"
        viewport={sectionViewport}
        variants={sectionVariants}
        className="relative min-h-screen flex flex-col items-center justify-center text-center px-4 sm:px-6 lg:px-8 pt-28 md:pt-32"
        style={{ background: "#09090b" }}
      >
        {/* Moody automotive background image — barely visible texture layer (above fold, priority) */}
        <Image
          src="https://images.unsplash.com/photo-1601362840469-51e4d8d58785?q=80&w=2000"
          alt=""
          aria-hidden
          fill
          priority
          sizes="100vw"
          className="object-cover pointer-events-none select-none opacity-[0.07] mix-blend-luminosity"
        />

        {/* Bottom fade — blends image into the page background */}
        <div
          className="absolute inset-x-0 bottom-0 h-2/3 pointer-events-none"
          style={{
            background:
              "linear-gradient(to bottom, transparent 0%, #09090b 100%)",
          }}
        />

        {/* Cinematic spotlight — faint gold radial at top-center */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 80% 50% at 50% -5%, rgba(212,175,55,0.13) 0%, rgba(212,175,55,0.04) 40%, transparent 70%)",
          }}
        />

        <div className="relative z-10 flex flex-col items-center gap-4 md:gap-6 w-full max-w-3xl mx-auto text-center">
          {/* Eyebrow pill */}
          <div className="inline-flex items-center gap-2 text-[11px] font-semibold tracking-[0.18em] uppercase text-[#D4AF37] border border-[#D4AF37]/30 rounded-full px-4 py-2 mb-10">
            <MapPin size={10} className="shrink-0" />
            Proudly Serving All of Vermont
          </div>

          {/* Headline */}
          <h1
            className="text-4xl md:text-6xl font-black tracking-tight leading-tight md:leading-tight mb-6 md:mb-7 bg-gradient-to-r from-[#D4AF37] via-[#F3E5AB] to-[#D4AF37] bg-clip-text text-transparent"
            style={{ filter: "drop-shadow(0 2px 24px rgba(212,175,55,0.25))" }}
          >
            The Detail Your
            <br />
            Vehicle Deserves.
          </h1>

          {/* Subheadline */}
          <p className="text-base md:text-xl text-zinc-400 mb-10 md:mb-12 leading-relaxed">
            Vermont&apos;s premier mobile auto detailing service — we come to
            you. Professional results with premium products, wherever you are in
            the state.
          </p>

          {/* CTAs — content-fit width, centered, side-by-side on desktop */}
          <div className="flex flex-col md:flex-row items-center justify-center gap-4 mb-6">
            <button
              onClick={() => openBooking()}
              className="btn-primary-gold-shimmer h-12 px-8 rounded-xl font-semibold tracking-wide w-fit min-w-[180px] bg-zinc-900/80 backdrop-blur-sm border border-[#D4AF37]/50 text-[#D4AF37] hover:text-black hover:shadow-[0_0_20px_rgba(212,175,55,0.3)] hover:scale-[1.03] active:scale-[0.98] transition-all duration-500 ease-in-out"
            >
              <span className="relative z-[1]">Book Your Detail</span>
            </button>
            <Button
              variant="secondary"
              onClick={scrollToServices}
              className="w-fit min-w-[180px] flex items-center justify-center gap-2"
            >
              View Services
              <ChevronDown size={16} />
            </Button>
          </div>

          {/* Inline booking dropdown (Hero) — client-only to avoid hydration mismatch */}
          {mounted && (
            <div className="w-full max-w-3xl mx-auto mt-2">
              <BookingSection
                isVisible={expandedBookingId === "hero"}
                onClose={() => setExpandedBookingId(null)}
                selectedService={expandedBookingId === "hero" ? selectedService : null}
                services={services}
                onSelectService={setSelectedService}
                onClearService={() => setSelectedService(null)}
                onBookingSuccess={handleBookingSuccess}
                initialRewardPoints={authRewardPoints}
                initialDraft={initialDraft}
                onDraftRestored={() => setInitialDraft(null)}
              />
            </div>
          )}

          <p className="mt-10 md:mt-12 mb-8 md:mb-12 text-zinc-500 text-sm text-center w-full">
            Prefer to speak with us?{" "}
            <a
              href="tel:8025855563"
              className="text-[#D4AF37] hover:underline font-medium inline-flex items-center gap-1.5"
            >
              <Phone className="w-3 h-3" />
              Call 802-585-5563
            </a>
          </p>

          {/* Front Porch Forum badge */}
          <div className="flex justify-center mb-12 md:mb-20">
            <div className="inline-flex items-center gap-3 border border-zinc-800 rounded-full px-6 py-2 bg-zinc-900/50 backdrop-blur-sm">
              <span className="text-[10px] font-semibold tracking-[0.22em] uppercase text-zinc-500">
                As Seen On
              </span>
              <span className="w-px h-3 bg-zinc-700" />
              <span
                className="text-sm font-semibold bg-gradient-to-r from-[#D4AF37] via-[#F3E5AB] to-[#D4AF37] bg-clip-text text-transparent"
                style={{ filter: "drop-shadow(0 1px 8px rgba(212,175,55,0.2))" }}
              >
                Front Porch Forum
              </span>
            </div>
          </div>

          {/* Stats row — added bottom padding for spacing */}
          <div className="flex flex-row items-start justify-center gap-4 md:gap-12 w-full pb-12 md:pb-20">
            {[
              { value: "500+", label: "Vehicles Detailed" },
              { value: "5★", label: "Average Rating" },
              { value: "100%", label: "Mobile Service" },
            ].map((stat) => (
              <div key={stat.label} className="flex flex-col items-center text-center flex-1">
                <div className="text-2xl md:text-4xl font-bold text-white">
                  {stat.value}
                </div>
                <div className="text-[10px] md:text-sm text-zinc-400 mt-1 leading-tight tracking-wide">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Trust Bar — Premium Infinite Scroll Marquee — reduced vertical padding */}
        <section className="relative py-8 md:py-12 overflow-hidden border-y border-white/[0.03] bg-zinc-950/40">
          {/* Subtle background glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-full bg-[radial-gradient(50%_50%_at_50%_50%,rgba(212,175,55,0.03)_0%,transparent_100%)] pointer-events-none" />
          
          <div className="relative">
            {/* Edge Fading Masks */}
            <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-zinc-950 to-transparent z-10 pointer-events-none" />
            <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-zinc-950 to-transparent z-10 pointer-events-none" />

            <div className="flex overflow-hidden">
              <div className="flex animate-marquee whitespace-nowrap gap-12 md:gap-24 items-center py-2">
                {[...Array(3)].map((_, groupIdx) => (
                  <div key={groupIdx} className="flex gap-12 md:gap-24 items-center">
                    {[
                      { icon: ShieldCheck, label: "Fully Insured" },
                      { icon: Leaf, label: "Eco-Friendly Products" },
                      { icon: BadgeCheck, label: "Satisfaction Guaranteed" },
                      { icon: MapPin, label: "VT Owned & Operated" },
                      { icon: Sparkles, label: "Professional Results" },
                    ].map(({ icon: Icon, label }, i) => (
                      <div
                        key={`${label}-${i}`}
                        className="flex items-center gap-2.5 group/badge cursor-default"
                      >
                        <div className="relative flex items-center justify-center w-7 h-7 rounded-lg bg-white/[0.02] border border-white/[0.05] group-hover/badge:border-[#D4AF37]/30 transition-all duration-500">
                          <Icon size={14} className="text-[#D4AF37] group-hover/badge:scale-110 transition-transform duration-500" strokeWidth={1.5} />
                          <div className="absolute inset-0 bg-[#D4AF37]/5 rounded-lg opacity-0 group-hover/badge:opacity-100 transition-opacity duration-500 blur-sm" />
                        </div>
                        <span className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-400 group-hover/badge:text-zinc-200 transition-colors duration-500">
                          {label}
                        </span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

      </motion.section>

      {/* ─── Before & After Slider ───────────────────────────────── */}
      <BeforeAfterSlider />


      {/* ─── Our Services ─────────────────────────────────────────────────────────────── */}
      <motion.section
        id="services"
        initial="hidden"
        whileInView="visible"
        viewport={sectionViewport}
        variants={sectionVariants}
        className="py-14 md:py-20 lg:py-24 px-4 sm:px-6 lg:px-8"
      >
        <div className="w-full max-w-7xl mx-auto">

          {/* Section header */}
          <div className="text-center mb-8 md:mb-14">
            <p className="text-xs font-bold tracking-[0.22em] uppercase text-[#D4AF37] mb-3">
              What We Offer
            </p>
            <h2
              className="text-3xl md:text-5xl font-black tracking-tight bg-gradient-to-r from-[#D4AF37] via-[#F3E5AB] to-[#D4AF37] bg-clip-text text-transparent"
              style={{ filter: "drop-shadow(0 2px 16px rgba(212,175,55,0.2))" }}
            >
              Our Services
            </h2>
            <p className="text-sm text-zinc-500 mt-3 max-w-xl mx-auto leading-relaxed">
              From everyday detailing to full paint restoration — every service is performed on location at your schedule.
            </p>
          </div>

          {/* ── Mobile/tablet: single carousel ──────────────────────── */}
          {mounted && <div className="lg:hidden">
            <div className="flex flex-col items-center w-full">
              <div
                ref={carouselRef}
                onScroll={handleCarouselScroll}
                className="w-full flex overflow-x-auto snap-x snap-mandatory"
                style={{ scrollbarWidth: "none", msOverflowStyle: "none" } as React.CSSProperties}
              >
                {carouselServices.map((service) => (
                  <div key={service.id} className="snap-center shrink-0 w-full flex justify-center px-4 pt-2 pb-3">
                    <div className="w-full max-w-[360px]">
                      <ServiceCard service={service} onBook={() => openBooking(service)} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2.5 mt-4">
                {carouselServices.map((service, i) => (
                  <button key={service.id} type="button" onClick={() => scrollToCard(i)} aria-label={service.name} className="group">
                    <div className={`h-1.5 rounded-full transition-all duration-300 ${carouselActiveIdx === i ? "w-6 bg-[#D4AF37]" : "w-1.5 bg-zinc-700 group-hover:bg-zinc-500"}`} />
                  </button>
                ))}
              </div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-600 mt-2">{carouselServices[carouselActiveIdx]?.name ?? ""}</p>
            </div>
          </div>}

          {/* ── Desktop: standard services grid ──────────────────── */}
          {carouselServices.length > 0 && (
            <div className="hidden lg:grid lg:grid-cols-3 gap-6 items-start">
              {carouselServices.map((service) => (
                <ServiceCard key={service.id} service={service} onBook={() => openBooking(service)} />
              ))}
            </div>
          )}

          {/* ── Inline booking for standard services ── */}
          {mounted && expandedBookingId === "services" && (
            <div className="w-full max-w-[450px] lg:max-w-3xl mx-auto mt-8 animate-in fade-in slide-in-from-top-4 duration-500">
              <BookingSection
                isVisible={true}
                onClose={() => setExpandedBookingId(null)}
                selectedService={selectedService}
                services={services}
                onSelectService={setSelectedService}
                onClearService={() => setSelectedService(null)}
                onBookingSuccess={handleBookingSuccess}
                initialRewardPoints={authRewardPoints}
                initialDraft={initialDraft}
                onDraftRestored={() => setInitialDraft(null)}
              />
            </div>
          )}

          {/* ── Ultimate Series ──────────────────────────────────────── */}
          <div className="mt-14 md:mt-20">
            <div className="flex items-center gap-3 mb-8">
              <Gem size={14} className="text-[#D4AF37]" />
              <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-400">Ultimate Series</h3>
              <div className="flex-1 h-px bg-white/[0.05]" />
            </div>

            {/* Mobile: Ultimate carousel */}
            {mounted && <div className="lg:hidden flex flex-col items-center w-full">
              <div
                ref={ultimateCarouselRef}
                onScroll={handleUltimateCarouselScroll}
                className="w-full flex overflow-x-auto snap-x snap-mandatory"
                style={{ scrollbarWidth: "none", msOverflowStyle: "none" } as React.CSSProperties}
              >
                {ULTIMATE_CARDS.map((card) => (
                  <div key={card.name} className="snap-center shrink-0 w-full flex justify-center px-4 pt-2 pb-3">
                    <div className="w-full max-w-[360px]">
                      <UltimateServiceCard {...card} onBook={openUltimateBooking} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2.5 mt-4">
                {ULTIMATE_CARDS.map((card, i) => (
                  <button key={card.name} type="button" onClick={() => scrollToUltimateCard(i)} aria-label={card.name} className="group">
                    <div className={`h-1.5 rounded-full transition-all duration-300 ${ultimateCarouselActiveIdx === i ? "w-6 bg-[#D4AF37]" : "w-1.5 bg-zinc-700 group-hover:bg-zinc-500"}`} />
                  </button>
                ))}
              </div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-600 mt-2">{ULTIMATE_CARDS[ultimateCarouselActiveIdx]?.name ?? ""}</p>
              <div className="flex items-start gap-2 mt-4 max-w-sm mx-auto">
                <AlertTriangle size={12} className="text-amber-500/60 shrink-0 mt-0.5" />
                <p className="text-[10px] text-zinc-600 leading-relaxed"><span className="text-zinc-500 font-semibold">Heavy Soil:</span> Vehicles with mold, biohazards, or excessive pet hair may incur a $50–$100 surcharge.</p>
              </div>
            </div>}

            {/* Desktop: Ultimate grid */}
            <div className="hidden lg:grid lg:grid-cols-2 gap-6 items-start">
              {ULTIMATE_CARDS.map((card) => (
                <UltimateServiceCard key={card.name} {...card} onBook={openUltimateBooking} />
              ))}
            </div>
            <div className="hidden lg:flex items-center gap-2 mt-5">
              <AlertTriangle size={12} className="text-amber-500/60 shrink-0" />
              <p className="text-[11px] text-zinc-600"><span className="text-zinc-500 font-semibold">Heavy Soil:</span> Vehicles with mold, biohazards, or excessive pet hair may incur a $50–$100 surcharge.</p>
            </div>
          </div>

          {/* View More Services */}
          <div className="mt-10 text-center">
            <Link href="/services" className="inline-flex items-center gap-2 text-sm font-bold text-[#D4AF37] hover:text-[#F3E5AB] transition-colors group">
              View More Services
              <span className="inline-block transition-transform group-hover:translate-x-1">→</span>
            </Link>
          </div>

          {/* ── Inline booking for ultimate ── */}
          {mounted && expandedBookingId === "ultimate" && (
            <div className="w-full max-w-[450px] lg:max-w-3xl mx-auto mt-8 animate-in fade-in slide-in-from-top-4 duration-500">
              <BookingSection
                isVisible={true}
                onClose={() => setExpandedBookingId(null)}
                selectedService={selectedService}
                services={services}
                onSelectService={setSelectedService}
                onClearService={() => setSelectedService(null)}
                onBookingSuccess={handleBookingSuccess}
                initialRewardPoints={authRewardPoints}
                initialDraft={initialDraft}
                onDraftRestored={() => setInitialDraft(null)}
              />
            </div>
          )}

        </div>
      </motion.section>

      {/* ─── Boat & RV Detailing Callouts ──────────────────────────────────────── */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={sectionViewport}
        variants={sectionVariants}
        className="py-10 md:py-16 px-4 sm:px-6 lg:px-8 border-t border-white/[0.06]"
      >
        <div className="w-full max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-500">More Services</p>
            <div className="flex-1 h-px bg-white/[0.05]" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* ── Boat / Marine Card ── */}
            <div className="relative rounded-2xl border border-[#D4AF37]/20 bg-zinc-900/50 overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-[#D4AF37]/[0.04] to-transparent pointer-events-none" />
              <div className="relative p-6 sm:p-8">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-11 h-11 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/20 flex items-center justify-center shrink-0">
                    <Anchor size={20} className="text-[#D4AF37]" />
                  </div>
                  <div>
                    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/20 text-[#D4AF37] text-[9px] font-bold tracking-widest uppercase mb-1.5">
                      Dockside Specialist
                    </div>
                    <h3 className="text-lg font-black text-white leading-tight">Boat & Marine Detailing</h3>
                    <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                      Waterline-up service — no haul-out required. Priced per foot, 15 ft minimum. 100% lake-safe, biodegradable chemicals.
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 mb-5">
                  {["Marine Express — $20/ft", "The Deep Reset — $30/ft", "Showroom Restoration — $55/ft"].map((tag) => (
                    <span key={tag} className="text-[10px] font-medium text-zinc-400 bg-zinc-800/60 border border-white/[0.06] px-2 py-1 rounded-lg">{tag}</span>
                  ))}
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedService(null);
                      setExpandedBookingId(expandedBookingId === "boat" ? null : "boat");
                    }}
                    className="flex-1 py-2.5 rounded-xl bg-[#D4AF37] text-black text-sm font-black hover:bg-amber-400 active:scale-[0.98] transition-all duration-200"
                  >
                    Book Now
                  </button>
                  <Link
                    href="/boat-detailing"
                    className="flex-1 py-2.5 rounded-xl border border-[#D4AF37]/30 text-[#D4AF37] text-sm font-semibold text-center hover:bg-[#D4AF37]/[0.06] transition-all duration-200"
                  >
                    View Packages
                  </Link>
                </div>
              </div>
              {/* Inline booking (Boat) */}
              {mounted && expandedBookingId === "boat" && (
                <div className="border-t border-white/[0.06] animate-in fade-in slide-in-from-top-3 duration-400">
                  <BookingSection
                    isVisible={true}
                    onClose={() => setExpandedBookingId(null)}
                    selectedService={null}
                    services={services}
                    onSelectService={setSelectedService}
                    onClearService={() => setSelectedService(null)}
                    onBookingSuccess={handleBookingSuccess}
                    initialRewardPoints={authRewardPoints}
                    initialCategory="boat"
                  />
                </div>
              )}
            </div>

            {/* ── RV Card ── */}
            <div className="relative rounded-2xl border border-[#D4AF37]/20 bg-zinc-900/50 overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-[#D4AF37]/[0.04] to-transparent pointer-events-none" />
              <div className="relative p-6 sm:p-8">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-11 h-11 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/20 flex items-center justify-center shrink-0">
                    <Truck size={20} className="text-[#D4AF37]" />
                  </div>
                  <div>
                    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/20 text-[#D4AF37] text-[9px] font-bold tracking-widest uppercase mb-1.5">
                      Mobile Service
                    </div>
                    <h3 className="text-lg font-black text-white leading-tight">RV Detailing</h3>
                    <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                      Full-service detailing for motorhomes &amp; campers. We come to you — priced per foot, 20 ft minimum.
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 mb-5">
                  {["Interior — $20/ft", "Exterior — $22/ft", "Full Detail — $38/ft"].map((tag) => (
                    <span key={tag} className="text-[10px] font-medium text-zinc-400 bg-zinc-800/60 border border-white/[0.06] px-2 py-1 rounded-lg">{tag}</span>
                  ))}
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedService(null);
                      setExpandedBookingId(expandedBookingId === "rv" ? null : "rv");
                    }}
                    className="flex-1 py-2.5 rounded-xl bg-[#D4AF37] text-black text-sm font-black hover:bg-amber-400 active:scale-[0.98] transition-all duration-200"
                  >
                    Book Now
                  </button>
                  <Link
                    href="/rv-detailing"
                    className="flex-1 py-2.5 rounded-xl border border-[#D4AF37]/30 text-[#D4AF37] text-sm font-semibold text-center hover:bg-[#D4AF37]/[0.06] transition-all duration-200"
                  >
                    View Packages
                  </Link>
                </div>
              </div>
              {/* Inline booking (RV) */}
              {mounted && expandedBookingId === "rv" && (
                <div className="border-t border-white/[0.06] animate-in fade-in slide-in-from-top-3 duration-400">
                  <BookingSection
                    isVisible={true}
                    onClose={() => setExpandedBookingId(null)}
                    selectedService={null}
                    services={services}
                    onSelectService={setSelectedService}
                    onClearService={() => setSelectedService(null)}
                    onBookingSuccess={handleBookingSuccess}
                    initialRewardPoints={authRewardPoints}
                    initialCategory="rv"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.section>

      {/* ─── Loyalty Rewards — Simple & Elegant ─────────────────────────────────────────── */}
      <motion.section
        id="loyalty-rewards"
        initial="hidden"
        whileInView="visible"
        viewport={sectionViewport}
        variants={sectionVariants}
        className="py-12 md:py-24 lg:py-32 px-4 sm:px-6 lg:px-8 border-t border-white/[0.06] relative overflow-hidden"
      >
        {/* Ambient background glow */}
        <div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl h-96 opacity-20 pointer-events-none"
          style={{
            background: "radial-gradient(circle, rgba(212,175,55,0.15) 0%, transparent 70%)",
            filter: "blur(60px)"
          }}
        />

        <div className="w-full max-w-7xl mx-auto relative z-10">
          <div className="flex flex-col items-center text-center">
            <p className="text-[11px] md:text-sm font-semibold tracking-[0.2em] uppercase text-[#D4AF37] mb-4">
              Rewarding Your Trust
            </p>
            <h2 className="text-3xl md:text-6xl font-black tracking-tight text-white mb-6 md:mb-8 leading-[1.1]">
              Details that <br />
              <span className="text-zinc-500">Pay You Back.</span>
            </h2>
            <p className="text-base md:text-lg text-zinc-400 mb-10 md:mb-12 leading-relaxed max-w-2xl mx-auto px-4">
              We believe in long-term relationships. That&apos;s why every dollar you spend with Arise & Shine helps you earn towards your next showroom-quality finish.
            </p>

            {/* Loyalty Visual Card — Centered */}
            <div className="relative group w-full max-w-2xl mb-10 md:mb-12">
              <div className="absolute -inset-2 md:-inset-4 bg-gradient-to-r from-[#D4AF37]/20 to-amber-500/20 rounded-[1.5rem] md:rounded-[2rem] blur-2xl opacity-50 transition-opacity duration-700" />
              <div className="relative bg-zinc-900/40 backdrop-blur-xl border border-white/10 rounded-[1.5rem] md:rounded-[2rem] p-6 md:p-12 shadow-2xl overflow-hidden">
                <div className="absolute top-0 right-0 p-4 md:p-8 opacity-10 md:opacity-20">
                  <Sparkles size={48} className="md:size-[64px] text-[#D4AF37]" />
                </div>
                
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/20 text-[#D4AF37] text-[10px] font-bold tracking-widest uppercase mb-6 md:mb-8">
                  <Star size={10} fill="currentColor" />
                  Exclusive Program
                </div>
                
                <h3 className="text-2xl md:text-4xl font-black text-white mb-8 md:mb-10 leading-tight">
                  Arise & Shine <br />
                  <span className="bg-gradient-to-r from-[#D4AF37] to-[#F3E5AB] bg-clip-text text-transparent">Loyalty Club</span>
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 mb-8 md:mb-10">
                  <div className="flex flex-col items-center md:items-start gap-3 md:gap-4">
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-zinc-800 flex items-center justify-center border border-white/5 shadow-inner">
                      <Car className="w-5 h-5 md:w-6 md:h-6 text-[#D4AF37]" />
                    </div>
                    <div className="text-center md:text-left">
                      <p className="text-zinc-100 font-bold text-sm md:text-base">Earn Points</p>
                      <p className="text-xs md:text-sm text-zinc-500">Get 1 point for every $1 spent on any detailing service.</p>
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-center md:items-start gap-3 md:gap-4">
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-zinc-800 flex items-center justify-center border border-white/5 shadow-inner">
                      <BadgeCheck className="w-5 h-5 md:w-6 md:h-6 text-[#D4AF37]" />
                    </div>
                    <div className="text-center md:text-left">
                      <p className="text-zinc-100 font-bold text-sm md:text-base">Redeem & Save</p>
                      <p className="text-xs md:text-sm text-zinc-500">Every 10 points equals $1 off. Save them up for a free detail!</p>
                    </div>
                  </div>
                </div>

                <div className="p-4 md:p-6 rounded-xl md:rounded-2xl bg-zinc-950/50 border border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-center sm:text-left">
                    <p className="text-[9px] md:text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-1">Sign Up Bonus</p>
                    <p className="text-xl md:text-2xl font-black text-white">+100 Points</p>
                  </div>
                  <div className="h-px w-8 bg-white/5 sm:hidden" />
                  <div className="text-center sm:text-right">
                    <p className="text-[9px] md:text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-1">Claim Today</p>
                    <p className="text-[#D4AF37] font-bold text-sm md:text-base">Instant Reward</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center gap-3 md:gap-4 w-full max-w-sm sm:max-w-none justify-center px-4">
              {authUserId ? (
                <Button
                  variant="primary"
                  href="/protected"
                  className="btn-primary-gold-shimmer w-full sm:w-auto px-8 md:px-10 py-5 md:py-6 rounded-xl md:rounded-2xl text-base md:text-lg font-black bg-zinc-900/80 backdrop-blur-sm border border-[#D4AF37]/50 text-[#D4AF37] hover:text-black hover:shadow-[0_0_30px_rgba(212,175,55,0.3)] transition-all duration-500 overflow-hidden"
                >
                  <span className="relative z-[1]">View My Dashboard</span>
                </Button>
              ) : (
                <Button
                  variant="primary"
                  href="/auth/sign-up"
                  className="btn-primary-gold-shimmer w-full sm:w-auto px-8 md:px-10 py-5 md:py-6 rounded-xl md:rounded-2xl text-base md:text-lg font-black bg-zinc-900/80 backdrop-blur-sm border border-[#D4AF37]/50 text-[#D4AF37] hover:text-black hover:shadow-[0_0_30px_rgba(212,175,55,0.3)] transition-all duration-500 overflow-hidden"
                >
                  <span className="relative z-[1]">Sign Up & Claim Points</span>
                </Button>
              )}
              <button
                onClick={() => openBooking()}
                className="w-full sm:w-auto px-8 md:px-10 py-5 md:py-6 rounded-xl md:rounded-2xl border border-white/10 text-white hover:bg-white/5 transition-all text-base md:text-lg font-bold active:scale-[0.98]"
              >
                Book & Earn
              </button>
            </div>

            <div className="mt-12 md:mt-16 flex flex-col items-center gap-4 md:gap-6">
              <div className="flex -space-x-2 md:-space-x-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="w-10 h-10 md:w-12 md:h-12 rounded-full border-2 border-zinc-950 bg-zinc-800 overflow-hidden relative shadow-xl">
                    <Image 
                      src={`https://i.pravatar.cc/100?img=${i+15}`} 
                      alt="User"
                      fill
                      className="object-cover grayscale"
                    />
                  </div>
                ))}
              </div>
              <p className="text-xs md:text-sm text-zinc-500">
                <span className="text-zinc-200 font-bold">500+ members</span> already earning rewards.
              </p>
            </div>
          </div>
        </div>
      </motion.section>


      {/* ─── Trust Banner (Our Promise) — 2x2 grid on mobile ─────────────────── */}
      <section id="why-us" className="border-t border-white/[0.06] bg-zinc-900/30 py-12 md:py-20 lg:py-24 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-8 w-full lg:max-w-7xl mx-auto">
          {[
            { icon: Car,       title: "We Come To You",     desc: "Fully mobile — at home or work." },
            { icon: Shield,    title: "100% Satisfaction", desc: "We make it right, no questions asked." },
            { icon: Star,      title: "Premium Products",   desc: "Pro-grade coatings & polishes." },
            { icon: Sparkles,  title: "Loyalty Rewards",    desc: "Earn points on every booking." },
          ].map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="flex flex-col items-center justify-center text-center p-5 md:p-8 bg-zinc-900/40 backdrop-blur-sm border border-white/5 rounded-2xl md:rounded-[2rem] hover:bg-zinc-800/50 hover:border-[#D4AF37]/20 transition-all duration-300 group relative overflow-hidden"
            >
              {/* Subtle accent glow */}
              <div className="absolute -inset-x-10 -top-10 h-20 bg-[#D4AF37]/5 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              
              <div className="w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-zinc-800 flex items-center justify-center mb-4 md:mb-6 border border-white/5 group-hover:border-[#D4AF37]/30 group-hover:bg-zinc-900 transition-all duration-300">
                <Icon className="w-5 h-5 md:w-7 md:h-7 text-[#D4AF37] group-hover:scale-110 transition-transform duration-300" strokeWidth={1.5} />
              </div>
              
              <p className="text-xs md:text-sm font-bold text-zinc-100 mb-2 uppercase tracking-wider">{title}</p>
              <p className="text-[10px] md:text-xs text-zinc-500 leading-relaxed max-w-[140px] md:max-w-none">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Testimonials Carousel ───────────────────────────────── */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={sectionViewport}
        variants={sectionVariants}
        className="relative py-20 md:py-32 lg:py-40 px-4 sm:px-6 lg:px-8 border-t border-white/[0.03] overflow-hidden"
      >
        {/* Cinematic background spotlight */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-6xl h-full bg-[radial-gradient(50%_50%_at_50%_50%,rgba(212,175,55,0.03)_0%,transparent_100%)] pointer-events-none" />

        <div className="w-full max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-16 md:mb-24">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900/50 border border-white/5 text-[#D4AF37] text-[10px] font-bold tracking-[0.2em] uppercase mb-6">
              <Star size={12} className="shrink-0" fill="currentColor" />
              Customer Stories
            </div>
            <h2 className="text-4xl md:text-6xl font-black tracking-tight text-white mb-6">
              What Vermonters <br />
              <span className="text-zinc-500">Are Saying.</span>
            </h2>
          </div>

          <div className="relative overflow-hidden marquee-fade-edges -mx-4 sm:-mx-6 lg:-mx-8">
            <div className="flex animate-testimonials-marquee gap-8 py-4">
              {[...Array(3)].map((_, groupIdx) => (
                <div key={groupIdx} className="flex gap-8">
                  {REVIEWS.map((r, i) => (
                    <div
                      key={`${groupIdx}-${r.name}-${i}`}
                      className="flex-shrink-0 w-[85vw] md:w-[600px] group/card relative"
                    >
                      {/* Card Glow Effect */}
                      <div className="absolute -inset-0.5 bg-gradient-to-b from-white/10 to-transparent rounded-[2rem] blur opacity-20 group-hover/card:opacity-40 transition-opacity duration-500" />
                      
                      <div className="relative h-full bg-zinc-900/40 backdrop-blur-xl border border-white/10 rounded-[2rem] p-10 flex flex-col shadow-2xl">
                        {/* Rating & Verified Tag */}
                        <div className="flex items-center justify-between mb-8">
                          <div className="flex items-center gap-1.5">
                            {Array.from({ length: 5 }).map((_, j) => (
                              <div key={j} className="relative">
                                <Star
                                  size={16}
                                  className="text-[#D4AF37] fill-[#D4AF37]"
                                  strokeWidth={0}
                                />
                                <div className="absolute inset-0 blur-sm bg-[#D4AF37]/40 scale-125 -z-1" />
                              </div>
                            ))}
                          </div>
                          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.03] border border-white/5 text-[9px] font-black uppercase tracking-widest text-zinc-500">
                            <CheckCircle size={10} className="text-[#D4AF37]" />
                            Verified Service
                          </div>
                        </div>

                        {/* Quote */}
                        <div className="relative mb-10">
                          <span className="absolute -top-6 -left-4 text-7xl font-serif text-white/5 pointer-events-none select-none">“</span>
                          <p className="text-zinc-200 text-lg md:text-xl leading-relaxed font-medium italic">
                            {r.review}
                          </p>
                        </div>

                        {/* Author Info */}
                        <div className="mt-auto pt-8 border-t border-white/5 flex items-center justify-between">
                          <div>
                            <p className="text-white font-bold text-base tracking-tight">
                              {r.name}
                            </p>
                            <p className="text-[#D4AF37] text-xs font-bold uppercase tracking-widest mt-1">
                              {r.location}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-zinc-600 text-[10px] font-black uppercase tracking-widest mb-1">Service Provided</p>
                            <p className="text-zinc-400 text-xs font-bold">{r.service}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.section>

      {/* ─── Frequently Asked Questions ───────────────────────── */}
      <section className="py-12 md:py-20 lg:py-24 px-4 sm:px-6 lg:px-8 flex flex-col items-center text-center">
        <div className="w-full max-w-7xl mx-auto">
        <h2 className="text-3xl md:text-5xl font-bold text-white mb-10">
          Frequently Asked Questions.
        </h2>
        <div className="max-w-3xl mx-auto space-y-4 w-full flex flex-col items-center">
          <details className="bg-zinc-900/30 border border-white/5 rounded-xl overflow-hidden transition-all duration-300 group w-full">
            <summary className="cursor-pointer p-6 flex justify-between items-center text-zinc-100 font-medium hover:text-[#D4AF37] outline-none list-none text-base md:text-lg">
              <span className="flex-1 text-center">Do I need to provide water or power?</span>
              <ChevronDown className="w-5 h-5 shrink-0 transition-transform duration-200 group-open:rotate-180" />
            </summary>
            <p className="text-zinc-400 text-sm md:text-base px-6 pb-6 leading-relaxed text-center">
              Yes, we require access to both a water spigot and a standard electrical outlet to properly service your vehicle. Please ensure your vehicle is parked within a reasonable distance of these hookups.
            </p>
          </details>
          <details className="bg-zinc-900/30 border border-white/5 rounded-xl overflow-hidden transition-all duration-300 group w-full">
            <summary className="cursor-pointer p-6 flex justify-between items-center text-zinc-100 font-medium hover:text-[#D4AF37] outline-none list-none text-base md:text-lg">
              <span className="flex-1 text-center">How long does a Full Detail take?</span>
              <ChevronDown className="w-5 h-5 shrink-0 transition-transform duration-200 group-open:rotate-180" />
            </summary>
            <p className="text-zinc-400 text-sm md:text-base px-6 pb-6 leading-relaxed text-center">
              A Full Detail typically takes between 3 to 5 hours depending on the size and condition of your vehicle. We never rush perfection.
            </p>
          </details>
          <details className="bg-zinc-900/30 border border-white/5 rounded-xl overflow-hidden transition-all duration-300 group w-full">
            <summary className="cursor-pointer p-6 flex justify-between items-center text-zinc-100 font-medium hover:text-[#D4AF37] outline-none list-none text-base md:text-lg">
              <span className="flex-1 text-center">Do I need to be present for the detail?</span>
              <ChevronDown className="w-5 h-5 shrink-0 transition-transform duration-200 group-open:rotate-180" />
            </summary>
            <p className="text-zinc-400 text-sm md:text-base px-6 pb-6 leading-relaxed text-center">
              Not at all! As long as we have the keys and access to the vehicle, you can work or relax. We will send you a text when your car is pristine.
            </p>
          </details>
          <details className="bg-zinc-900/30 border border-white/5 rounded-xl overflow-hidden transition-all duration-300 group w-full">
            <summary className="cursor-pointer p-6 flex justify-between items-center text-zinc-100 font-medium hover:text-[#D4AF37] outline-none list-none text-base md:text-lg">
              <span className="flex-1 text-center">What if it rains on my appointment day?</span>
              <ChevronDown className="w-5 h-5 shrink-0 transition-transform duration-200 group-open:rotate-180" />
            </summary>
            <p className="text-zinc-400 text-sm md:text-base px-6 pb-6 leading-relaxed text-center">
              If you have a garage we can work inside, we will proceed! If not, we will happily reschedule you to our next available clear day with priority placement.
            </p>
          </details>
        </div>
        </div>
      </section>

      {/* ─── CTA Banner ─────────────────────────────────────────── */}
      <section className="py-12 md:py-20 lg:py-24 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-7xl mx-auto">
        <div className="max-w-3xl mx-auto text-center">
          <div
            className="rounded-3xl p-6 md:p-12 border border-white/[0.08] bg-zinc-900/80 backdrop-blur-sm"
            style={{
              background:
                "radial-gradient(ellipse at 50% 0%, rgba(212,175,55,0.08) 0%, transparent 60%), rgba(24,24,27,0.85)",
            }}
          >
            <h2 className="text-3xl md:text-5xl font-black tracking-tight mb-4 text-zinc-100">
              Ready for a Spotless Ride?
            </h2>
            <p className="text-zinc-400 mb-8 md:mb-10 text-base md:text-lg">
              Book your mobile detail in minutes. We&apos;ll handle the rest.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8 w-full">
              <button
                type="button"
                onClick={() => openBooking()}
                className="btn-primary-gold-shimmer w-full sm:w-auto bg-zinc-900/80 backdrop-blur-md border border-[#D4AF37]/50 text-[#D4AF37] hover:text-black hover:shadow-[0_0_20px_rgba(212,175,55,0.3)] hover:scale-[1.03] px-8 py-3 rounded-lg font-semibold active:scale-[0.98] transition-all duration-500 ease-in-out"
              >
                <span className="relative z-[1]">Book Now</span>
              </button>
              <a
                href="tel:8025855563"
                className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-8 py-3 rounded-lg border border-zinc-800 text-zinc-300 hover:border-[#D4AF37]/50 hover:text-[#D4AF37] hover:bg-[#D4AF37]/5 transition-all duration-300 font-semibold"
              >
                <Phone className="w-4 h-4 shrink-0" />
                Call 802-585-5563
              </a>
            </div>
          </div>
        </div>
        </div>
      </section>

      {/* ─── Areas We Serve (SEO) ───────────────────────────────── */}
      <div className="w-full border-t border-[#D4AF37]/25 bg-[#09090b] py-12 md:py-20 lg:py-24 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-7xl mx-auto flex flex-col items-center text-center gap-4">
          <MapPin className="w-5 h-5 text-[#D4AF37] flex-shrink-0" />
          <p className="text-zinc-500 text-sm md:text-base leading-relaxed">
            Proudly providing premium mobile detailing to
          </p>
          <p className="font-medium tracking-[0.15em] md:tracking-widest text-[#D4AF37] text-sm uppercase leading-relaxed max-w-2xl">
            Burlington · South Burlington · Williston · Essex · Stowe · Shelburne · Winooski
          </p>
          <p className="text-zinc-500 text-sm">
            and surrounding Vermont areas.
          </p>
        </div>
      </div>

      {/* ─── Footer ─────────────────────────────────────────────── */}
      <footer
        id="contact"
        className="border-t border-white/[0.06] py-12 md:py-20 lg:py-24 px-4 sm:px-6 lg:px-8 bg-zinc-950/50"
      >
        <div className="w-full max-w-7xl mx-auto space-y-6">
          {/* Main row */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <Image
                src="/e.png"
                alt="Arise And Shine VT Logo"
                width={40}
                height={40}
                className="object-contain drop-shadow-md shrink-0"
              />
              <div>
                <div className="font-semibold text-sm">Arise And Shine VT</div>
                <div className="text-xs text-zinc-500">
                  Premium Mobile Auto Detailing
                </div>
              </div>
            </div>

            <div className="text-sm text-zinc-500 text-center">
              Serving all of Vermont &middot;{" "}
              <a
                href="mailto:contact@ariseandshinevt.com"
                className="hover:text-white transition-colors"
              >
                contact@ariseandshinevt.com
              </a>
              {" "}&middot;{" "}
              <a
                href="tel:802-585-5563"
                className="hover:text-white transition-colors"
              >
                802-585-5563
              </a>
            </div>

            <div className="text-xs text-zinc-700">
              &copy; 2026 Arise And Shine VT. All rights reserved.
            </div>
          </div>

          {/* Quick links row */}
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 pt-2 border-t border-white/[0.04]">
            <Link href="/my-detail" className="text-xs text-zinc-500 hover:text-[#D4AF37] transition-colors">
              Track My Appointment
            </Link>
            <span className="text-zinc-800 text-xs">·</span>
            <Link href="/gift-cards" className="text-xs text-zinc-500 hover:text-[#D4AF37] transition-colors">
              Gift Cards
            </Link>
            <span className="text-zinc-800 text-xs">·</span>
            <button
              onClick={() => setLegalModal("privacy")}
              className="text-xs text-zinc-500 hover:text-[#D4AF37] transition-colors"
            >
              Privacy Policy
            </button>
            <span className="text-zinc-800 text-xs">·</span>
            <button
              onClick={() => setLegalModal("terms")}
              className="text-xs text-zinc-500 hover:text-[#D4AF37] transition-colors"
            >
              Terms of Service
            </button>
          </div>
        </div>
      </footer>

      {/* ─── Sticky Mobile CTA (only after scrolling past hero) ──────── */}
      <div
        className={`md:hidden fixed inset-x-0 bottom-0 z-40 px-4 pb-4 pt-2 transition-all duration-300 ease-out ${
          isPastHero && !isBottomCtaVisible
            ? "translate-y-0 opacity-100"
            : "translate-y-full opacity-0 pointer-events-none"
        }`}
        style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
      >
        <div className="rounded-2xl border border-[#D4AF37]/30 bg-zinc-900/80 shadow-[0_-8px_32px_rgba(0,0,0,0.4)] backdrop-blur-md">
          <button
            onClick={() => openBooking()}
            className="btn-primary-gold-shimmer w-full flex items-center justify-center gap-2.5 py-4 px-6 rounded-xl text-base font-semibold text-[#D4AF37] hover:text-black hover:shadow-[0_0_20px_rgba(212,175,55,0.3)] hover:scale-[1.03] active:scale-[0.99] transition-all duration-500 ease-in-out"
          >
            <span className="relative z-[1] flex items-center justify-center gap-2.5">
              <Sparkles size={18} className="shrink-0 text-current" />
              Book Now
            </span>
          </button>
        </div>
      </div>

      {/* ─── Recent Activity Toast (social proof) ─────────────────── */}
      <RecentActivityToast />

      {/* ─── Privacy Policy Modal ──────────────────────────────────── */}
      <LegalModal
        isOpen={legalModal === "privacy"}
        onClose={() => setLegalModal(null)}
        title="Privacy Policy"
      >
        <p className="text-zinc-500 text-xs">Last updated: March 2026 &nbsp;·&nbsp; Arise And Shine VT</p>

        <LegalSection title="1. Information We Collect">
          <p className="mb-2">When you book a service or contact us, we collect the following information solely for the purpose of providing and improving our detailing services:</p>
          <LegalList items={[
            "Full name",
            "Phone number",
            "Email address",
            "Service address (where you'd like us to come)",
            "Vehicle year, make, and model",
          ]} />
        </LegalSection>

        <LegalSection title="2. How We Use Your Information">
          <LegalList items={[
            "To confirm and fulfill your detailing appointment",
            "To send booking confirmation and receipt emails",
            "To follow up regarding your service or loyalty rewards balance",
            "To improve scheduling and route efficiency",
          ]} />
        </LegalSection>

        <LegalSection title="3. Payment Information">
          <p>
            All payments are securely processed by <span className="text-zinc-200 font-medium">Stripe</span>, a PCI-DSS compliant payment processor.{" "}
            <strong className="text-zinc-200">Arise And Shine VT does not store, log, or have access to your full card number, CVV, or other sensitive payment data.</strong>{" "}
            Stripe&apos;s privacy policy governs how payment data is handled.
          </p>
        </LegalSection>

        <LegalSection title="4. Data Sharing">
          <p className="mb-2">We do not sell, rent, or trade your personal information to any third parties. We may share limited data only in the following circumstances:</p>
          <LegalList items={[
            "With Stripe for payment processing",
            "With Resend to deliver transactional booking emails",
            "When required by law or valid legal process",
          ]} />
        </LegalSection>

        <LegalSection title="5. Data Retention">
          <p>We retain your booking and profile information for up to 3 years to maintain service history and loyalty rewards. You may request deletion of your data at any time by emailing us at <span className="text-zinc-200">contact@ariseandshinevt.com</span>.</p>
        </LegalSection>

        <LegalSection title="6. Cookies & Analytics">
          <p>Our website may use basic analytics tools to understand traffic and improve user experience. No personally identifiable information is collected through cookies. We do not use third-party advertising cookies.</p>
        </LegalSection>

        <LegalSection title="7. Contact Us">
          <p>If you have questions about this Privacy Policy, please contact us at <span className="text-zinc-200">contact@ariseandshinevt.com</span> or by phone at <span className="text-zinc-200">802-585-5563</span>.</p>
        </LegalSection>
      </LegalModal>

      {/* ─── Terms of Service Modal ────────────────────────────────── */}
      <LegalModal
        isOpen={legalModal === "terms"}
        onClose={() => setLegalModal(null)}
        title="Terms of Service"
      >
        <p className="text-zinc-500 text-xs">Last updated: March 2026 &nbsp;·&nbsp; Arise And Shine VT</p>
        <p>By booking a service with Arise And Shine VT, you agree to the following terms. Please read them carefully.</p>

        <LegalSection title="1. Services Provided">
          <p>Arise And Shine VT is a mobile auto detailing service operating throughout Vermont. All services are performed at the customer&apos;s specified location. We are not a brick-and-mortar shop. Services are subject to availability.</p>
        </LegalSection>

        <LegalSection title="2. Site Requirements">
          <LegalList items={[
            "We bring our own water supply and power equipment for most services — no hookup is required unless otherwise agreed.",
            "The customer must ensure the vehicle is accessible and that we have reasonable space to work safely.",
            "Parking on a level surface is preferred. We reserve the right to decline service if conditions are unsafe.",
          ]} />
        </LegalSection>

        <LegalSection title="3. Pre-Existing Damage & Liability">
          <p className="mb-2">Arise And Shine VT is not liable for:</p>
          <LegalList items={[
            "Pre-existing scratches, swirl marks, chips, dents, or rust present before our service",
            "Damage resulting from faulty, peeling, or compromised clear coats or paint",
            "Personal items, valuables, or electronics left inside the vehicle during service",
            "Trim, emblems, or accessories that are already loose, cracked, or adhesive-failed",
          ]} />
          <p className="mt-2">We will perform a brief walk-around inspection and notify you of any concerns before beginning work. By proceeding with the booking, you acknowledge that any noted issues are pre-existing.</p>
        </LegalSection>

        <LegalSection title="4. Cancellation & Rescheduling">
          <LegalList items={[
            "Cancellations must be made at least 24 hours before your scheduled appointment.",
            "Same-day cancellations or no-shows may result in a $50 cancellation fee.",
            "We reserve the right to reschedule appointments due to severe weather or unforeseen circumstances. In such cases, no fee will be charged.",
          ]} />
        </LegalSection>

        <LegalSection title="5. Maintenance Club — Setup Fee">
          <p>
            All Monthly Maintenance Club subscriptions require a one-time{" "}
            <strong className="text-zinc-200">Deep Clean &amp; Reset Detail</strong>{" "}
            ($75 for Interior, $100 for Full Detail) before the recurring monthly service begins. This fee is{" "}
            <strong className="text-zinc-200">non-refundable</strong>{" "}
            once the initial detail has been completed. Subscriptions may be cancelled at any time before the next billing cycle with no further charges.
          </p>
        </LegalSection>

        <LegalSection title="6. Satisfaction Guarantee">
          <p>We stand behind our work. If you are not satisfied with the result, contact us within 24 hours of service completion and we will return to address the issue at no charge — one time, at our discretion. This does not apply to pre-existing conditions or damage outside our control.</p>
        </LegalSection>

        <LegalSection title="7. Payment">
          <p>Full payment is due at the time of service (Pay at Arrival) or collected in advance via Stripe Checkout (Pay Now). All prices are listed in USD. We reserve the right to adjust pricing with reasonable notice.</p>
        </LegalSection>

        <LegalSection title="8. Governing Law">
          <p>These terms are governed by the laws of the State of Vermont. Any disputes shall be resolved in the courts of Chittenden County, Vermont.</p>
        </LegalSection>

        <LegalSection title="9. Contact Us">
          <p>Questions about these terms? Reach us at <span className="text-zinc-200">contact@ariseandshinevt.com</span> or <span className="text-zinc-200">802-585-5563</span>.</p>
        </LegalSection>
      </LegalModal>

      {/* ─── Booking success modal (centered popup) ───────────────────────────── */}
      <SuccessModal
        isOpen={showSuccessModal}
        onClose={handleCloseSuccessModal}
        data={successModalData}
      />

      {/* ─── Stripe payment verification overlay ──────────────────────────────── */}
      {stripeVerifying && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4 text-center px-6">
            <div className="w-14 h-14 rounded-full border-2 border-[#D4AF37]/30 border-t-[#D4AF37] animate-spin" />
            <p className="text-white font-bold text-lg">Confirming your booking…</p>
            <p className="text-zinc-400 text-sm max-w-xs">
              We&apos;re verifying your payment and locking in your appointment. This takes just a moment.
            </p>
          </div>
        </div>
      )}

      {/* ─── Stripe recovery error banner ─────────────────────────────────────── */}
      {stripeRecoveryError && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] w-full max-w-md px-4">
          <div className="rounded-2xl border border-red-500/30 bg-zinc-900/95 backdrop-blur-sm p-4 shadow-2xl flex items-start gap-3">
            <AlertTriangle size={18} className="text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-zinc-100 mb-1">Payment received — booking needs attention</p>
              <p className="text-xs text-zinc-400 leading-relaxed">{stripeRecoveryError}</p>
              <a
                href="tel:+18025551234"
                className="inline-block mt-2 text-xs font-bold text-[#D4AF37] hover:underline"
              >
                Call or text us →
              </a>
            </div>
            <button
              type="button"
              onClick={() => setStripeRecoveryError(null)}
              className="text-zinc-600 hover:text-zinc-300 shrink-0"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      <BookingFlowSelector isOpen={flowSelectorOpen} onClose={() => setFlowSelectorOpen(false)} />
    </div>
  );
}


// ─── Service inclusions data ───────────────────────────────────────────────────

const EXTERIOR_ITEMS = [
  "Full handwash and foam bath",
  "Deep clean wheel wells, rims, and tires",
  "3 Month Ceramic Sealant",
];

const INTERIOR_ITEMS = [
  "Full wipe down & vacuum of every surface, crack, and crevice",
  "Clean and protect plastics and leathers",
  "Floor mats & carpet cleaning (shampoo not included)",
  "Interior glass cleaned and protected",
];

const MAINTENANCE_ITEMS = [
  "Everything in standard detail",
  "Priority scheduling",
  "Premium ceramic-grade protectants",
  "Fixed monthly dates",
];

const SERVICE_INCLUSIONS: Record<string, string[]> = {
  "Exterior Detail": EXTERIOR_ITEMS,
  "Interior Detail": INTERIOR_ITEMS,
  "Full Detail": [...EXTERIOR_ITEMS, ...INTERIOR_ITEMS],
  "Interior Monthly Maintenance": [...INTERIOR_ITEMS, ...MAINTENANCE_ITEMS],
  "Full Detail Monthly Maintenance": [...EXTERIOR_ITEMS, ...INTERIOR_ITEMS, ...MAINTENANCE_ITEMS],
};


// ─── Service Card ──────────────────────────────────────────────────────────────

function ServiceCard({
  service,
  onBook,
}: {
  service: Service;
  onBook: () => void;
}) {
  const isPopular = service.name === "Full Detail";
  const inclusions = SERVICE_INCLUSIONS[service.name] ?? [];

  return (
    <div className={`relative flex flex-col rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1 ${
      isPopular
        ? "border border-[#D4AF37]/45 shadow-[0_0_40px_rgba(212,175,55,0.1)] bg-zinc-900/70 hover:shadow-[0_16px_50px_rgba(212,175,55,0.15)]"
        : "border border-white/[0.07] bg-zinc-900/50 hover:border-[#D4AF37]/25 hover:shadow-[0_16px_40px_rgba(0,0,0,0.6)]"
    }`}>

      {/* Top gold accent line for popular */}
      {isPopular && (
        <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent shrink-0" />
      )}

      <div className="p-7 flex flex-col flex-1">

        {/* Header: badge + name */}
        <div className="mb-6">
          {isPopular && (
            <div className="flex items-center gap-1.5 mb-2.5">
              <Crown size={11} className="text-[#D4AF37]" strokeWidth={2} />
              <span className="text-[10px] font-black uppercase tracking-[0.25em] text-[#D4AF37]">
                Most Popular
              </span>
            </div>
          )}
          <h3 className="text-2xl font-black text-white tracking-tight leading-tight">
            {service.name}
          </h3>
          {service.description && (
            <p className="text-sm text-zinc-500 mt-2 leading-relaxed">{service.description}</p>
          )}
        </div>

        {/* Pricing — Normal / Large side-by-side */}
        <div className={`flex rounded-xl mb-7 overflow-hidden border ${isPopular ? "border-[#D4AF37]/20" : "border-white/[0.06]"}`}>
          <div className="flex-1 py-4 text-center bg-white/[0.02]">
            <div className="text-2xl font-black text-white tabular-nums">${service.price_small}</div>
            <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-500 mt-1">Normal</div>
          </div>
          <div className="w-px bg-white/[0.06]" />
          <div className={`flex-1 py-4 text-center ${isPopular ? "bg-[#D4AF37]/[0.05]" : "bg-white/[0.02]"}`}>
            <div className={`text-2xl font-black tabular-nums ${isPopular ? "text-[#D4AF37]" : "text-zinc-200"}`}>${service.price_large}</div>
            <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-500 mt-1">Large / 3-Row</div>
          </div>
        </div>

        {/* Inclusions — always visible */}
        {inclusions.length > 0 && (
          <div className="mb-7 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500 mb-3">What&apos;s Included</p>
            <ul className="space-y-2.5">
              {inclusions.map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-zinc-300 leading-snug">
                  <span className="mt-[3px] w-3.5 h-3.5 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/30 flex items-center justify-center shrink-0">
                    <span className="w-1 h-1 rounded-full bg-[#D4AF37]" />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}
        {inclusions.length === 0 && <div className="flex-1" />}

        {/* CTA */}
        <button
          onClick={onBook}
          className={`w-full py-3.5 rounded-xl font-bold text-sm flex justify-center items-center gap-2 transition-all duration-300 active:scale-[0.97] ${
            isPopular
              ? "bg-gradient-to-r from-[#D4AF37] to-[#F0D060] text-black hover:opacity-90 shadow-[0_4px_20px_rgba(212,175,55,0.35)] hover:shadow-[0_6px_28px_rgba(212,175,55,0.5)]"
              : "btn-primary-gold-shimmer bg-zinc-950 border border-[#D4AF37]/50 text-[#D4AF37] hover:text-black hover:shadow-[0_0_20px_rgba(212,175,55,0.25)] hover:scale-[1.02]"
          }`}
        >
          Book This Service
          <Sparkles size={13} className="shrink-0" />
        </button>

        {/* Reward points hint */}
        <p className="text-center text-[11px] text-zinc-600 mt-3">
          <Sparkles size={9} className="inline mr-1" />
          Earn {service.price_small}–{service.price_large} reward points
        </p>
      </div>
    </div>
  );
}

// ─── Ultimate Cards data ───────────────────────────────────────────────────────

const ULTIMATE_CARDS = [
  {
    name: "Ultimate Interior Reset",
    tagline: "The deep interior clean your vehicle deserves.",
    priceNormal: 250, priceLarge: 250, pointsNormal: 275, pointsLarge: 275,
    badge: { label: "Best for Families", icon: "star" as const },
    features: [
      "Everything in Full Detail",
      "Hot Water Extraction & Shampooing (Carpets & Seats)",
      "High-Pressure Steam Sanitation (Vents, Cup Holders, Crevices)",
      "Vermont Road Salt & Calcium Neutralization",
      "Engine Bay Deep Clean & Dressing (Add-On Available)",
      "6-Month Ceramic Sealant Upgrade",
    ],
    isFlagship: false,
  },
  {
    name: "Ultimate Interior + Exterior Reset",
    tagline: "Showroom quality — every surface, inside and out. No polishing required.",
    priceNormal: 325, priceLarge: 325, pointsNormal: 360, pointsLarge: 360,
    badge: { label: "Flagship Service", icon: "gem" as const },
    features: [
      "Everything in Ultimate Interior Reset",
      "Full Exterior Decontamination Wash & Clay Bar Treatment",
      "Iron & Fallout Decontamination (Paint Prep)",
      "Ceramic Sealant Application — 12-Month Protection",
      "All Exterior Trim, Rubber & Glass Dressing",
      "Exhaust Tips & Wheel Barrels Deep Cleaned",
    ],
    isFlagship: true,
  },
] as const;

// ─── Ultimate Service Card ─────────────────────────────────────────────────────

function UltimateServiceCard({
  name, tagline, priceNormal, priceLarge, pointsNormal, pointsLarge,
  badge, features, onBook, isFlagship,
}: {
  name: string; tagline: string; priceNormal: number; priceLarge: number;
  pointsNormal: number; pointsLarge: number;
  badge: { label: string; icon: "star" | "gem" };
  features: readonly string[];
  onBook: (name: string) => void;
  isFlagship: boolean;
}) {
  return (
    <div className={`relative flex flex-col rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1 ${
      isFlagship
        ? "border border-[#D4AF37]/60 shadow-[0_0_50px_rgba(212,175,55,0.2)] bg-zinc-900/70 hover:shadow-[0_16px_60px_rgba(212,175,55,0.3)]"
        : "border border-white/[0.08] bg-zinc-900/50 hover:border-[#D4AF37]/30 hover:shadow-[0_16px_40px_rgba(0,0,0,0.6)]"
    }`}>
      <div className={`h-[2px] w-full shrink-0 ${
        isFlagship
          ? "bg-gradient-to-r from-[#D4AF37]/40 via-[#D4AF37] to-[#D4AF37]/40"
          : "bg-gradient-to-r from-transparent via-[#D4AF37]/50 to-transparent"
      }`} />
      {isFlagship && (
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(212,175,55,0.07) 0%, transparent 60%)" }} />
      )}
      <div className="p-7 flex flex-col flex-1 relative">
        <div className="mb-6">
          <div className="flex items-center gap-1.5 mb-2.5">
            {badge.icon === "gem"
              ? <Gem size={11} className="text-[#D4AF37]" strokeWidth={2} />
              : <Star size={11} className="text-[#D4AF37]" strokeWidth={2} fill="currentColor" />
            }
            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-[#D4AF37]">{badge.label}</span>
          </div>
          <h3 className="text-2xl font-black text-white tracking-tight leading-tight">{name}</h3>
          <p className="text-sm text-zinc-500 mt-2 leading-relaxed">{tagline}</p>
        </div>
        <div className={`rounded-xl mb-7 overflow-hidden border ${isFlagship ? "border-[#D4AF37]/20" : "border-white/[0.06]"}`}>
          {priceNormal === priceLarge ? (
            <div className={`py-4 text-center ${isFlagship ? "bg-[#D4AF37]/[0.05]" : "bg-white/[0.02]"}`}>
              <div className={`text-3xl font-black tabular-nums ${isFlagship ? "text-[#D4AF37]" : "text-white"}`}>${priceNormal}</div>
              <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-500 mt-1">Flat Rate — All Vehicle Sizes</div>
            </div>
          ) : (
            <div className="flex">
              <div className="flex-1 py-4 text-center bg-white/[0.02]">
                <div className="text-2xl font-black text-white tabular-nums">${priceNormal}</div>
                <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-500 mt-1">Normal</div>
              </div>
              <div className="w-px bg-white/[0.06]" />
              <div className={`flex-1 py-4 text-center ${isFlagship ? "bg-[#D4AF37]/[0.05]" : "bg-white/[0.02]"}`}>
                <div className={`text-2xl font-black tabular-nums ${isFlagship ? "text-[#D4AF37]" : "text-zinc-200"}`}>${priceLarge}</div>
                <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-500 mt-1">Large / 3-Row</div>
              </div>
            </div>
          )}
        </div>
        <div className="mb-7 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500 mb-3">What&apos;s Included</p>
          <ul className="space-y-2.5">
            {features.map((item) => (
              <li key={item} className="flex items-start gap-3 text-sm text-zinc-300 leading-snug">
                <span className="mt-[3px] w-3.5 h-3.5 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/30 flex items-center justify-center shrink-0">
                  <span className="w-1 h-1 rounded-full bg-[#D4AF37]" />
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>
        <button
          onClick={() => onBook(name)}
          className={`w-full py-3.5 rounded-xl font-bold text-sm flex justify-center items-center gap-2 transition-all duration-300 active:scale-[0.97] ${
            isFlagship
              ? "bg-gradient-to-r from-[#D4AF37] to-[#F0D060] text-black hover:opacity-90 shadow-[0_4px_20px_rgba(212,175,55,0.35)]"
              : "btn-primary-gold-shimmer bg-zinc-950 border border-[#D4AF37]/50 text-[#D4AF37] hover:text-black hover:scale-[1.02]"
          }`}
        >
          Book This Service <Sparkles size={13} className="shrink-0" />
        </button>
        <p className="text-center text-[11px] text-zinc-600 mt-3">
          <Sparkles size={9} className="inline mr-1" />
          Earn {pointsNormal === pointsLarge ? pointsNormal : `${pointsNormal}–${pointsLarge}`} reward points
        </p>
      </div>
    </div>
  );
}

