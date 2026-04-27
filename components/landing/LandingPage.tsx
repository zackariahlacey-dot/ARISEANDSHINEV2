"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin,
  Shield,
  ShieldCheck,
  Leaf,
  BadgeCheck,
  Star,
  ChevronDown,
  ChevronUp,
  Calendar,
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
  CheckCircle,
  Phone,
  Gem,
  AlertTriangle,
  X,
} from "lucide-react";
import { createClient as createBrowserSupabaseClient } from "@/lib/supabase/client";
import type { Service } from "@/app/page";
import type { SuccessModalData } from "./SuccessModal";
import type { DraftBooking, BookingProgressData } from "./BookingModal";
import { SiteHeader } from "./SiteHeader";
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
  const pathname = usePathname();
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
  const [bookingProgress, setBookingProgress] = useState<BookingProgressData | null>(null);
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
    setMounted(true);
  }, []);

  // Intersection Observer to hide sticky CTA when reaching the bottom one
  useEffect(() => {
    if (!mounted) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsBottomCtaVisible(entry.isIntersecting);
      },
      { rootMargin: "0px 0px -80px 0px", threshold: 0 }
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
    document.getElementById("services")?.scrollIntoView({ behavior: "smooth" });
  }, []);

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
      {/* ─── Shared Site Header (with mobile drawer) ───────────── */}
      <SiteHeader onBookNow={() => { window.scrollTo({ top: 0, behavior: "smooth" }); openBooking(); }} />

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
                onProgress={setBookingProgress}
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
            {/* Ultimate Series intro */}
            <div className="mb-8 md:mb-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="flex-1 h-px bg-white/[0.05]" />
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/25 shrink-0">
                  <Gem size={11} className="text-[#D4AF37]" />
                  <span className="text-[10px] font-black uppercase tracking-[0.28em] text-[#D4AF37]">Ultimate Series</span>
                </div>
                <div className="flex-1 h-px bg-white/[0.05]" />
              </div>
              <div className="text-center">
                <h3 className="text-2xl md:text-3xl font-black text-white mb-2">The Premium Tier.</h3>
                <p className="text-sm text-zinc-500 max-w-xl mx-auto leading-relaxed">For those who want it done completely right — hot water extraction, ceramic protection, full decontamination. This is the service your vehicle deserves once a year.</p>
              </div>
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* ── Boat / Marine Card ── */}
            <div
              className="relative rounded-2xl overflow-hidden group transition-all duration-500 hover:-translate-y-1.5 border border-[#D4AF37]/30 hover:border-[#D4AF37]/55 hover:shadow-[0_24px_60px_rgba(212,175,55,0.2)]"
              style={{ background: "linear-gradient(170deg, #1a1a1c 0%, #0d0d0f 100%)" }}
            >
              {/* Gold top glow */}
              <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 110% 40% at 50% 0%, rgba(212,175,55,0.11) 0%, transparent 65%)" }} />
              {/* Top stripe */}
              <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-[#D4AF37]/70 to-transparent shrink-0" />

              <div className="relative p-7 sm:p-8">
                {/* Header */}
                <div className="flex items-start justify-between gap-4 mb-6">
                  <div className="flex-1 min-w-0">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/25 mb-3">
                      <Anchor size={9} className="text-[#D4AF37]" strokeWidth={2} />
                      <span className="text-[9px] font-black uppercase tracking-[0.3em] text-[#D4AF37]">Dockside Specialist</span>
                    </div>
                    <h3 className="text-2xl font-black text-white tracking-tight leading-tight">Boat & Marine Detailing</h3>
                    <p className="text-sm text-zinc-500 mt-1.5 leading-relaxed">
                      We come to the dock — no haul-out required. 15 ft minimum. Lake Champlain specialists using biodegradable marine products.
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37]/25 flex items-center justify-center shrink-0 mt-0.5">
                    <Anchor size={22} className="text-[#D4AF37]" strokeWidth={1.5} />
                  </div>
                </div>

                <div className="h-px bg-white/[0.06] mb-5" />

                {/* Pricing rows */}
                <div className="space-y-2 mb-6">
                  {[
                    { label: "Marine Interior Reset",  price: "$18/ft" },
                    { label: "Marine Exterior Shine",  price: "$22/ft" },
                    { label: "Captain's Full Detail",  price: "$35/ft" },
                    { label: "Showroom Restoration",   price: "from $65/ft" },
                  ].map(({ label, price }) => (
                    <div key={label} className="flex items-center justify-between py-2.5 px-4 rounded-xl bg-zinc-950/60 border border-white/[0.05]">
                      <span className="text-sm text-zinc-300 font-medium">{label}</span>
                      <span className="text-sm font-black text-[#D4AF37] tabular-nums">{price}</span>
                    </div>
                  ))}
                </div>

                {/* CTAs */}
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedService(null);
                      setExpandedBookingId(expandedBookingId === "boat" ? null : "boat");
                    }}
                    className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#F0D060] text-black text-sm font-black hover:opacity-90 active:scale-[0.98] transition-all duration-200 shadow-[0_4px_16px_rgba(212,175,55,0.3)]"
                  >
                    Book Now
                  </button>
                  <Link
                    href="/boat-detailing"
                    className="flex-1 py-3 rounded-xl border border-[#D4AF37]/35 text-[#D4AF37] text-sm font-semibold text-center hover:bg-[#D4AF37]/[0.08] transition-all duration-200"
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
            <div
              className="relative rounded-2xl overflow-hidden group transition-all duration-500 hover:-translate-y-1.5 border border-[#D4AF37]/30 hover:border-[#D4AF37]/55 hover:shadow-[0_24px_60px_rgba(212,175,55,0.2)]"
              style={{ background: "linear-gradient(170deg, #1a1a1c 0%, #0d0d0f 100%)" }}
            >
              {/* Gold top glow */}
              <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 110% 40% at 50% 0%, rgba(212,175,55,0.11) 0%, transparent 65%)" }} />
              {/* Top stripe */}
              <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-[#D4AF37]/70 to-transparent shrink-0" />

              <div className="relative p-7 sm:p-8">
                {/* Header */}
                <div className="flex items-start justify-between gap-4 mb-6">
                  <div className="flex-1 min-w-0">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/25 mb-3">
                      <Truck size={9} className="text-[#D4AF37]" strokeWidth={2} />
                      <span className="text-[9px] font-black uppercase tracking-[0.3em] text-[#D4AF37]">Mobile Service</span>
                    </div>
                    <h3 className="text-2xl font-black text-white tracking-tight leading-tight">RV & Camper Detailing</h3>
                    <p className="text-sm text-zinc-500 mt-1.5 leading-relaxed">
                      Full-service detailing for motorhomes &amp; campers at your site or home. 20 ft minimum, priced per foot.
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37]/25 flex items-center justify-center shrink-0 mt-0.5">
                    <Truck size={22} className="text-[#D4AF37]" strokeWidth={1.5} />
                  </div>
                </div>

                <div className="h-px bg-white/[0.06] mb-5" />

                {/* Pricing rows */}
                <div className="space-y-2 mb-3">
                  {[
                    { label: "Exterior Refresh",              price: "$18/ft" },
                    { label: "Living Space Reset",            price: "$28/ft" },
                    { label: "Ultimate Transformation",       price: "$50/ft" },
                    { label: "+ Oxidation Restoration",       price: "$35–45/ft", muted: true },
                  ].map(({ label, price, muted }) => (
                    <div key={label} className={`flex items-center justify-between py-2.5 px-4 rounded-xl border ${muted ? "bg-transparent border-dashed border-white/[0.04]" : "bg-zinc-950/60 border-white/[0.05]"}`}>
                      <span className={`text-sm font-medium ${muted ? "text-zinc-600" : "text-zinc-300"}`}>{label}</span>
                      <span className={`text-sm font-black tabular-nums ${muted ? "text-zinc-600" : "text-[#D4AF37]"}`}>{price}</span>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-zinc-700 mb-5 px-1">Add-ons: $50/slide · Roof seal $200+ · Pet hair / mold $75–$150</p>

                {/* CTAs */}
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedService(null);
                      setExpandedBookingId(expandedBookingId === "rv" ? null : "rv");
                    }}
                    className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#F0D060] text-black text-sm font-black hover:opacity-90 active:scale-[0.98] transition-all duration-200 shadow-[0_4px_16px_rgba(212,175,55,0.3)]"
                  >
                    Book Now
                  </button>
                  <Link
                    href="/rv-detailing"
                    className="flex-1 py-3 rounded-xl border border-[#D4AF37]/35 text-[#D4AF37] text-sm font-semibold text-center hover:bg-[#D4AF37]/[0.08] transition-all duration-200"
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
                      sizes="(max-width: 768px) 40px, 48px"
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


      {/* ─── Trust Banner (Our Promise) ─────────────────────────────────────── */}
      <section id="why-us" className="border-t border-white/[0.06] bg-zinc-900/30 py-6 md:py-8 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 w-full lg:max-w-7xl mx-auto">
          {[
            { icon: Car,      title: "We Come To You",        desc: "Your driveway, office, or anywhere in Vermont." },
            { icon: Shield,   title: "Satisfaction Guaranteed", desc: "Not happy? We'll make it right, every time." },
            { icon: Star,     title: "Premium Products",       desc: "Pro-grade polishes, coatings & protectants." },
            { icon: Sparkles, title: "Earn Rewards",           desc: "1 point per dollar — redeem for free details." },
          ].map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="flex items-center gap-3 p-3.5 md:p-4 bg-zinc-900/40 border border-white/[0.06] rounded-xl hover:border-[#D4AF37]/20 hover:bg-zinc-900/60 transition-all duration-300 group"
            >
              <div className="w-9 h-9 rounded-xl bg-zinc-800 border border-white/[0.05] flex items-center justify-center shrink-0 group-hover:border-[#D4AF37]/25 transition-all duration-300">
                <Icon className="w-4 h-4 text-[#D4AF37]" strokeWidth={1.5} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-zinc-100 leading-tight">{title}</p>
                <p className="text-[10px] text-zinc-500 mt-0.5 leading-snug">{desc}</p>
              </div>
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
              Yes — please make sure your vehicle is parked within reach of a water spigot and a standard electrical outlet. We&apos;ll handle everything else from there.
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
      <section ref={bottomCtaRef} className="py-12 md:py-20 lg:py-24 px-4 sm:px-6 lg:px-8">
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
        className={`md:hidden fixed inset-x-0 bottom-0 z-40 px-4 pt-2 transition-all duration-500 ${
          isPastHero && !isBottomCtaVisible
            ? "translate-y-0 opacity-100 ease-out"
            : "translate-y-full opacity-0 pointer-events-none ease-in"
        }`}
        style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
      >
        <div className={`rounded-2xl border bg-black/60 backdrop-blur-xl shadow-[0_-8px_32px_rgba(0,0,0,0.5)] transition-colors duration-300 ${bookingProgress ? "border-[#D4AF37]/20" : "border-[#D4AF37]/30"}`}>
          {bookingProgress ? (
            /* ── Progress summary bar ── */
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-bold text-white truncate leading-tight">
                  {bookingProgress.serviceName ?? "Booking in progress…"}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  {/* Step dots */}
                  <div className="flex items-center gap-1">
                    {[1, 2, 3].map((s) => (
                      <div
                        key={s}
                        className={`rounded-full transition-all duration-300 ${s <= bookingProgress.step ? "w-3 h-1.5 bg-[#D4AF37]" : "w-1.5 h-1.5 bg-zinc-700"}`}
                      />
                    ))}
                  </div>
                  <span className="text-[11px] text-zinc-500">Step {bookingProgress.step} of 3</span>
                  {bookingProgress.date && (
                    <>
                      <span className="text-zinc-700 text-[11px]">·</span>
                      <span className="flex items-center gap-1 text-[11px] text-zinc-400">
                        <Calendar size={10} />
                        {new Date(bookingProgress.date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                      </span>
                    </>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {bookingProgress.price !== null && (
                  <span className="text-[#D4AF37] font-black text-sm">
                    ${Math.round(bookingProgress.price)}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById("booking-panel");
                    if (!el) return;
                    const top = el.getBoundingClientRect().top + window.scrollY - 84;
                    const startY = window.scrollY;
                    const diff = top - startY;
                    const duration = Math.min(900, Math.max(400, Math.abs(diff) * 0.4));
                    const start = performance.now();
                    const step = (ts: number) => {
                      const p = Math.min((ts - start) / duration, 1);
                      // easeInOutQuart
                      const e = p < 0.5 ? 8 * p ** 4 : 1 - (-2 * p + 2) ** 4 / 2;
                      window.scrollTo(0, startY + diff * e);
                      if (p < 1) requestAnimationFrame(step);
                    };
                    requestAnimationFrame(step);
                  }}
                  className="flex items-center gap-1.5 px-3 h-9 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/25 text-[#D4AF37] text-xs font-semibold hover:bg-[#D4AF37]/20 active:scale-95 transition-all whitespace-nowrap"
                >
                  <ChevronUp size={13} />
                  Back to booking
                </button>
              </div>
            </div>
          ) : (
            /* ── Normal Book Now CTA ── */
            <button
              onClick={() => openBooking()}
              className="btn-primary-gold-shimmer w-full flex items-center justify-center gap-2.5 py-4 px-6 rounded-xl text-base font-semibold text-[#D4AF37] hover:text-black hover:shadow-[0_0_20px_rgba(212,175,55,0.3)] hover:scale-[1.03] active:scale-[0.99] transition-all duration-500 ease-in-out"
            >
              <span className="relative z-[1] flex items-center justify-center gap-2.5">
                <Sparkles size={18} className="shrink-0 text-current" />
                Book Now
              </span>
            </button>
          )}
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

const SERVICE_CARD_ICONS: Record<string, React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>> = {
  "Interior Detail": Brush,
  "Exterior Detail": Car,
  "Full Detail": Sparkles,
};

function ServiceCard({
  service,
  onBook,
}: {
  service: Service;
  onBook: () => void;
}) {
  const isPopular = service.name === "Full Detail";
  const inclusions = SERVICE_INCLUSIONS[service.name] ?? [];
  const Icon = SERVICE_CARD_ICONS[service.name] ?? Sparkles;

  return (
    <div className={`relative flex flex-col rounded-2xl overflow-hidden transition-all duration-500 hover:-translate-y-1.5 group ${
      isPopular
        ? "border border-[#D4AF37]/40 shadow-[0_0_50px_rgba(212,175,55,0.12)] bg-gradient-to-b from-zinc-900 to-zinc-950 hover:shadow-[0_20px_60px_rgba(212,175,55,0.2)]"
        : "border border-white/[0.07] bg-gradient-to-b from-zinc-900/80 to-zinc-950 hover:border-[#D4AF37]/30 hover:shadow-[0_20px_50px_rgba(0,0,0,0.7)]"
    }`}>

      {/* Top accent line — gold on popular, dim on others but brightens on hover */}
      <div className={`h-[2px] w-full bg-gradient-to-r from-transparent to-transparent shrink-0 transition-all duration-500 ${
        isPopular ? "via-[#D4AF37]" : "via-white/10 group-hover:via-[#D4AF37]/50"
      }`} />

      {/* Card header — icon + name */}
      <div className={`px-7 pt-6 pb-5 ${isPopular ? "bg-[#D4AF37]/[0.03]" : ""}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            {isPopular && (
              <div className="flex items-center gap-1.5 mb-2">
                <Crown size={10} className="text-[#D4AF37]" strokeWidth={2} />
                <span className="text-[10px] font-black uppercase tracking-[0.25em] text-[#D4AF37]">
                  Most Popular
                </span>
              </div>
            )}
            <h3 className="text-2xl font-black text-white tracking-tight leading-tight">
              {service.name}
            </h3>
            {service.description && (
              <p className="text-xs text-zinc-500 mt-1.5 leading-relaxed">{service.description}</p>
            )}
          </div>
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 mt-0.5 transition-all duration-300 ${
            isPopular
              ? "bg-[#D4AF37]/15 border border-[#D4AF37]/25"
              : "bg-zinc-800/80 border border-white/[0.06] group-hover:border-[#D4AF37]/25 group-hover:bg-[#D4AF37]/[0.07]"
          }`}>
            <Icon size={18} className={`transition-colors duration-300 ${isPopular ? "text-[#D4AF37]" : "text-zinc-500 group-hover:text-[#D4AF37]"}`} strokeWidth={1.5} />
          </div>
        </div>
      </div>

      <div className="mx-7 h-px bg-white/[0.05]" />

      {/* Pricing — side-by-side boxes */}
      <div className="px-7 py-5">
        <div className="flex gap-3">
          <div className="flex-1 rounded-xl p-4 bg-zinc-950/60 border border-white/[0.05] text-center">
            <div className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest mb-1.5">Normal</div>
            <div className="text-3xl font-black text-white tabular-nums">${service.price_small}</div>
          </div>
          <div className={`flex-1 rounded-xl p-4 text-center border ${
            isPopular ? "bg-[#D4AF37]/[0.07] border-[#D4AF37]/20" : "bg-zinc-950/60 border-white/[0.05]"
          }`}>
            <div className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest mb-1.5">Large / 3-Row</div>
            <div className={`text-3xl font-black tabular-nums ${isPopular ? "text-[#D4AF37]" : "text-zinc-300"}`}>${service.price_large}</div>
          </div>
        </div>
      </div>

      {/* Inclusions */}
      {inclusions.length > 0 && (
        <div className="px-7 pb-6 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-600 mb-3">What&apos;s Included</p>
          <ul className="space-y-2.5">
            {inclusions.map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-sm text-zinc-400 leading-snug">
                <CheckCircle size={14} className="shrink-0 mt-[1px] text-[#D4AF37]/70" strokeWidth={2} />
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}
      {inclusions.length === 0 && <div className="flex-1" />}

      {/* CTA */}
      <div className="px-7 pb-7">
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
    priceNormal: 250, priceLarge: 250, pointsNormal: 250, pointsLarge: 250,
    badge: { label: "Best for Families", icon: "star" as const },
    features: [
      "Everything in Interior Detail",
      "UV Protection on All Interior Plastics & Surfaces",
      "Full Interior Dressing (Dash, Doors, Trim)",
      "Hot Water Extraction & Deep Shampooing (Seats & Carpets)",
      "Dog Hair & Heavy Dirt Removal",
    ],
    isFlagship: false,
  },
  {
    name: "Ultimate Interior + Exterior Reset",
    tagline: "Showroom quality — every surface, inside and out.",
    priceNormal: 350, priceLarge: 350, pointsNormal: 350, pointsLarge: 350,
    badge: { label: "Flagship Service", icon: "gem" as const },
    features: [
      "Everything in Ultimate Interior Reset",
      "Full Exterior Hand Wash & Dry",
      "Plastic Trim Restoration",
      "12-Month Ceramic Spray Coating",
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
    <div
      className={`relative flex flex-col rounded-2xl overflow-hidden transition-all duration-500 hover:-translate-y-2 group ${
        isFlagship
          ? "border border-[#D4AF37]/55 shadow-[0_0_80px_rgba(212,175,55,0.22)] hover:shadow-[0_28px_90px_rgba(212,175,55,0.36)]"
          : "border border-[#D4AF37]/25 shadow-[0_0_40px_rgba(212,175,55,0.08)] hover:border-[#D4AF37]/45 hover:shadow-[0_24px_60px_rgba(212,175,55,0.18)]"
      }`}
      style={{ background: "linear-gradient(170deg, #1a1a1c 0%, #0d0d0f 100%)" }}
    >
      {/* Gold inner glow at top */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: isFlagship
            ? "radial-gradient(ellipse 110% 45% at 50% 0%, rgba(212,175,55,0.14) 0%, transparent 65%)"
            : "radial-gradient(ellipse 110% 35% at 50% 0%, rgba(212,175,55,0.07) 0%, transparent 65%)",
        }}
      />

      {/* Top accent stripe */}
      <div className={`w-full shrink-0 ${
        isFlagship
          ? "h-[3px] bg-gradient-to-r from-[#C9A227]/60 via-[#F3E5AB] to-[#C9A227]/60"
          : "h-[2px] bg-gradient-to-r from-transparent via-[#D4AF37]/70 to-transparent"
      }`} />

      {/* Header */}
      <div className="px-7 pt-7 pb-6 relative">
        <div className="flex items-start justify-between gap-4 mb-5">
          {/* Badges */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#D4AF37]/12 border border-[#D4AF37]/30">
              {badge.icon === "gem"
                ? <Gem size={9} className="text-[#D4AF37]" strokeWidth={2} />
                : <Star size={9} className="text-[#D4AF37]" strokeWidth={2} fill="currentColor" />
              }
              <span className="text-[9px] font-black uppercase tracking-[0.3em] text-[#D4AF37]">{badge.label}</span>
            </div>
            {isFlagship && (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.08]">
                <span className="text-[9px] font-black uppercase tracking-[0.25em] text-zinc-400">Most Complete</span>
              </div>
            )}
          </div>
          {/* Icon orb */}
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300 ${
            isFlagship
              ? "bg-gradient-to-br from-[#D4AF37]/25 to-[#D4AF37]/08 border border-[#D4AF37]/35"
              : "bg-zinc-800/60 border border-[#D4AF37]/20 group-hover:border-[#D4AF37]/40 group-hover:bg-[#D4AF37]/[0.1]"
          }`}>
            {badge.icon === "gem"
              ? <Gem size={20} className="text-[#D4AF37]" strokeWidth={1.5} />
              : <Star size={20} className="text-[#D4AF37]" strokeWidth={1.5} fill="currentColor" />
            }
          </div>
        </div>

        <h3 className={`text-2xl font-black tracking-tight leading-tight mb-2 ${
          isFlagship
            ? "bg-gradient-to-br from-white via-zinc-100 to-[#D4AF37] bg-clip-text text-transparent"
            : "text-white"
        }`}>{name}</h3>
        <p className="text-sm text-zinc-500 leading-relaxed">{tagline}</p>
      </div>

      <div className="mx-7 h-px bg-white/[0.06]" />

      {/* Price — big and prominent */}
      <div className="px-7 py-6">
        <div className={`relative rounded-2xl p-5 border overflow-hidden ${
          isFlagship
            ? "bg-gradient-to-br from-[#D4AF37]/[0.13] to-[#D4AF37]/[0.04] border-[#D4AF37]/30"
            : "bg-zinc-950/60 border-[#D4AF37]/18"
        }`}>
          <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.2em] mb-2">Flat Rate — All Vehicle Sizes</div>
          <div className={`text-5xl font-black tabular-nums leading-none ${isFlagship ? "text-[#D4AF37]" : "text-white"}`}>
            ${priceNormal}
          </div>
          <div className="text-xs text-zinc-600 mt-2">No hidden fees · We bring everything</div>
          {/* Decorative gem watermark */}
          <div className="absolute right-4 bottom-3 opacity-[0.12]">
            <Gem size={56} className="text-[#D4AF37]" strokeWidth={0.8} />
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="px-7 pb-6 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 mb-4">Everything Included</p>
        <ul className="space-y-3">
          {features.map((item) => (
            <li key={item} className="flex items-start gap-3 leading-snug">
              <CheckCircle
                size={15}
                className={`shrink-0 mt-[1px] ${isFlagship ? "text-[#D4AF37]" : "text-[#D4AF37]/65"}`}
                strokeWidth={2}
              />
              <span className={`text-sm ${isFlagship ? "text-zinc-200" : "text-zinc-300"}`}>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* CTA */}
      <div className="px-7 pb-7">
        <button
          onClick={() => onBook(name)}
          className={`w-full py-4 rounded-xl font-bold text-sm flex justify-center items-center gap-2 transition-all duration-300 active:scale-[0.97] ${
            isFlagship
              ? "bg-gradient-to-r from-[#D4AF37] to-[#F0D060] text-black hover:opacity-90 shadow-[0_4px_24px_rgba(212,175,55,0.45)] hover:shadow-[0_8px_32px_rgba(212,175,55,0.6)]"
              : "btn-primary-gold-shimmer bg-zinc-950 border border-[#D4AF37]/50 text-[#D4AF37] hover:text-black hover:scale-[1.02]"
          }`}
        >
          Book This Service <Sparkles size={14} className="shrink-0" />
        </button>
        <p className="text-center text-[11px] text-zinc-600 mt-3">
          <Sparkles size={9} className="inline mr-1" />
          Earn {pointsNormal === pointsLarge ? pointsNormal : `${pointsNormal}–${pointsLarge}`} reward points
        </p>
      </div>
    </div>
  );
}

