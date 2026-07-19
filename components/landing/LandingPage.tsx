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
  Zap,
  Trophy,
  ChevronRight,
  Container,
  Tractor,
} from "lucide-react";
import { createClient as createBrowserSupabaseClient } from "@/lib/supabase/client";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import type { Service } from "@/app/page";
import type { SuccessModalData } from "./SuccessModal";
import type { DraftBooking, BookingProgressData } from "./BookingModal";
import type { VehicleSizeSlug } from "@/app/actions/bookDetailing";
import { SiteHeader } from "./SiteHeader";
import { SqueezeMeInModal } from "./SqueezeMeInModal";
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
import { BeforeAfterGallery } from "./BeforeAfterGallery";
// ServiceComparisonTable lives on /services now — it's research content, not
// conversion. Removed from the homepage to reduce scroll depth before booking.
// The "Not sure which tier?" link below routes researchy customers there.
import { FleetQuoteCalculator } from "@/components/fleet/FleetQuoteCalculator";
import { BuildForMeQuiz } from "./BuildForMeQuiz";
import { matchPackage } from "@/lib/packageMatcher";
// NewsletterSignup removed from homepage footer — "Detailing tips" block
// gone per owner request. Component file kept in case it's used elsewhere.
import { NextAvailableBanner } from "./NextAvailableBanner";
import type { NextAvailableSlot } from "@/lib/nextAvailable";
import { getServiceDisplayName } from "@/lib/serviceDisplay";
import { trackFbInitiateCheckout, trackFbPurchase } from "@/lib/analytics/metaPixel";

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
  { href: "/detailing", label: "Auto Detailing", icon: Car, desc: "Interior, Exterior, Full Detail & Ultimate" },
  { href: "/paint-correction", label: "Paint Correction", icon: Sparkles, desc: "1-Step, 2-Step + Premium Ceramic Coating" },
];

const REVIEWS = [
  {
    review:
      "I was blown away by how easy it was. They came right to my driveway in Williston while I worked from home. My SUV looked better than the day I bought it. The whole thing took maybe two hours and I didn't have to move a muscle.",
    name: "Sarah M.",
    location: "Williston, VT",
    service: "Interior + Exterior",
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

export function LandingPage({ services, addonOverrides = {}, nextSlot = null }: { services: Service[]; addonOverrides?: import("@/app/actions/addonPricing").AddonOverrideMap; nextSlot?: NextAvailableSlot | null }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  // Persist booking-open + builder handoff across reloads so customers don't
  // restart their build on refresh mid-checkout.
  const HANDOFF_KEY = "buildYourPackageHandoff";
  const initialHandoff = (() => {
    if (typeof window === "undefined") return null;
    try {
      const raw = sessionStorage.getItem(HANDOFF_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  })();

  const [expandedBookingId, setExpandedBookingId] = useState<ExpandedBookingId>(
    initialHandoff?.bookingOpen ? "services" : null
  );
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [initialDraft, setInitialDraft] = useState<DraftBooking | null>(null);
  const [prefilledVehicle, setPrefilledVehicle] = useState<{
    make: string;
    model: string;
    size?: VehicleSizeSlug;
  } | null>(null);
  const [builderPrefill, setBuilderPrefill] = useState<{
    vehicleMake: string;
    vehicleModel: string;
    vehicleYear: string;
    vehicleSize: VehicleSizeSlug;
    addonIds: string[];
    /** Additional vehicles built in the multi-vehicle builder, each
     *  with its own foundation + size + resolved add-on prices. */
    additionalVehicles?: Array<{
      serviceName: string;
      vehicleSize: VehicleSizeSlug;
      vehicleMake: string;
      vehicleModel: string;
      vehicleYear: string;
      addons: { id: string; label: string; price: number }[];
    }>;
  } | null>(initialHandoff?.builderPrefill ?? null);

  // Save handoff state for refresh-resume
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (expandedBookingId === "services" && builderPrefill) {
        sessionStorage.setItem(HANDOFF_KEY, JSON.stringify({
          bookingOpen: true,
          builderPrefill,
          serviceName: selectedService?.name ?? null,
        }));
      } else {
        sessionStorage.removeItem(HANDOFF_KEY);
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expandedBookingId, builderPrefill]);

  // ── Meta Pixel: InitiateCheckout ──────────────────────────────────────────
  // Fire when a booking section opens (customer clicked a Book Now CTA,
  // finished the Build-For-Me quiz, or landed with ?book=1). Tracks the
  // section so we can segment audiences by which package they engaged with.
  const prevExpandedBookingRef = useRef<ExpandedBookingId>(null);
  useEffect(() => {
    if (expandedBookingId !== null && prevExpandedBookingRef.current === null) {
      trackFbInitiateCheckout({
        content_category: expandedBookingId,
        content_name: selectedService?.name ?? undefined,
      });
    }
    prevExpandedBookingRef.current = expandedBookingId;
  }, [expandedBookingId, selectedService?.name]);

  // Restore selectedService from saved handoff once services load
  useEffect(() => {
    if (initialHandoff?.serviceName && !selectedService) {
      const svc = services.find(s => s.name === initialHandoff.serviceName);
      if (svc) setSelectedService(svc);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [services]);
  const [showRestoreToast, setShowRestoreToast] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isPastHero, setIsPastHero] = useState(false);
  const [authLoyaltyDiscountPct, setAuthLoyaltyDiscountPct] = useState<number>(0);
  const [legalModal, setLegalModal] = useState<"privacy" | "terms" | null>(null);
  const [trackModalOpen, setTrackModalOpen] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successModalData, setSuccessModalData] = useState<SuccessModalData | null>(null);
  const [stripeVerifying, setStripeVerifying] = useState(false);
  const [stripeRecoveryError, setStripeRecoveryError] = useState<string | null>(null);
  const [bookingProgress, setBookingProgress] = useState<BookingProgressData | null>(null);
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [authEmail, setAuthEmail] = useState<string | null>(null);
  const [squeezeOpen, setSqueezeOpen] = useState(false);

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    supabase.auth.getUser().then((result: { data: { user: { id: string; email?: string } | null } }) => {
      setAuthUserId(result.data.user?.id ?? null);
      setAuthEmail(result.data.user?.email ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_: AuthChangeEvent, session: Session | null) => {
      setAuthUserId(session?.user?.id ?? null);
      setAuthEmail(session?.user?.email ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const isAdmin = authEmail?.toLowerCase() === "zackariahlacey@gmail.com";
  const bottomCtaRef = useRef<HTMLDivElement>(null);
  const carouselRef = useRef<HTMLDivElement>(null);
  const [isBottomCtaVisible, setIsBottomCtaVisible] = useState(false);
  // (legacy) Previously hid the global Book Now CTA while the builder was
  // active. The builder is no longer rendered, but we keep this state so the
  // ref `builderActive` below stays valid until cleanup.
  const [builderActive] = useState(false);


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

        // Meta Pixel: Purchase conversion — Stripe path. Fire ONCE with the
        // draft-snapshotted total so ad optimization targets actual bookers.
        // Guarded against double-fires by removing draftBooking above (line
        // sessionStorage.removeItem("draftBooking")).
        if (typeof draft.totalPaid === "number" && draft.totalPaid > 0) {
          trackFbPurchase({
            value: draft.totalPaid,
            currency: "USD",
            content_name: service?.name ?? "Detailing Service",
            content_ids: service ? [service.id] : undefined,
          });
        }

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
            firstName,
            serviceAddress: draft.serviceAddress || undefined,
            phone: draft.phone,
          });
          setShowSuccessModal(true);
        }
      } else {
        // Cancelled or rebook — old behavior auto-opened the BookingSection.
        // New flow: just clear and let them re-enter via the builder. The old
        // BookingSection is preserved for the builder handoff + Ultimate paths
        // only, not as an auto-popup.
        setInitialDraft(null);
        try { sessionStorage.removeItem("draftBooking"); } catch {}
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
      setAuthLoyaltyDiscountPct(p?.loyaltyDiscountPct ?? 0);
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

  // Auto-open booking when arriving with ?book=1 (used by town landing pages).
  // Also captures ?category=truck|heavy_equipment so the BookingFlowSelector
  // can deep-link straight into the right pathway.
  const [heroInitialCategory, setHeroInitialCategory] =
    useState<"vehicle" | "boat" | "rv" | "truck" | "heavy_equipment" | undefined>(undefined);
  useEffect(() => {
    if (!mounted) return;
    if (searchParams.get("book") !== "1") return;
    const cat = searchParams.get("category");
    if (cat === "truck" || cat === "heavy_equipment" || cat === "boat" || cat === "rv" || cat === "vehicle") {
      setHeroInitialCategory(cat);
    }
    setExpandedBookingId("hero");
    const path = window.location.pathname + (window.location.hash || "");
    window.history.replaceState(null, "", path || "/");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [mounted, searchParams]);

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

  const openUltimateBooking = useCallback((
    serviceName: string,
    vehicle?: { make: string; model: string; size?: VehicleSizeSlug } | null,
  ) => {
    const match = services.find(s => s.name === serviceName) ?? null;
    setSelectedService(match);
    setPrefilledVehicle(vehicle ?? null);
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
      <AnimatePresence>
        {showRestoreToast && (
          <motion.div
            key="restore-toast"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="fixed top-4 left-1/2 z-[100] w-[calc(100vw-2rem)] max-w-sm -translate-x-1/2"
            role="status"
            aria-live="polite"
          >
            <div className="rounded-2xl border border-[#D4AF37]/25 bg-zinc-900/95 backdrop-blur-md shadow-[0_8px_40px_rgba(0,0,0,0.5)] px-4 py-3.5 flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37]/20 flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4 text-[#D4AF37]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white leading-tight">Draft saved</p>
                <p className="text-[11px] text-zinc-500 leading-tight mt-0.5">
                  No Stripe? No problem — your details are ready. Pay at arrival instead.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
      <SiteHeader
        onBookNow={() => { window.scrollTo({ top: 0, behavior: "smooth" }); openBooking(); }}
        trackOpen={trackModalOpen}
        onTrackOpenChange={setTrackModalOpen}
      />

      {/* ─── Hero ───────────────────────────────────────────────── */}
      <motion.section
        id="hero"
        initial="hidden"
        whileInView="visible"
        viewport={sectionViewport}
        variants={sectionVariants}
        className="relative min-h-screen flex flex-col items-center justify-center text-center px-4 sm:px-6 lg:px-8 pt-36 md:pt-40"
        style={{ background: "#09090b" }}
      >
        {/* Moody automotive background image — barely visible texture layer (above fold, priority) */}
        <Image
          src="/bmw.jpg"
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
          {/* Live scarcity banner — only shown when there is a real open slot */}
          <NextAvailableBanner
            slot={nextSlot}
            onBookNow={() => {
              openBooking();
              // Allow the BookingSection animation to mount, then scroll it
              // into the viewport so the click feels like it did something.
              setTimeout(() => {
                document.getElementById("hero-booking")?.scrollIntoView({ behavior: "smooth", block: "start" });
              }, 120);
            }}
          />

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
          <div className="flex flex-col md:flex-row items-center justify-center gap-4 mb-3">
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

          {/* Small "Build me a package" pill under the primary CTAs — same
              quiz as the one above packages, wired to the same handoff. */}
          <div className="flex justify-center mb-4">
            <BuildForMeQuiz
              compact
              services={services}
              onUseBuild={(args) => {
                const serviceName = args.preferUltimate
                  ? "Ultimate Interior Reset"
                  : args.foundation === "interior" ? "Interior Detail"
                  : args.foundation === "exterior" ? "Exterior Detail"
                  : "Full Detail";
                const svc = services.find(s => s.name === serviceName) ?? null;
                setSelectedService(svc);
                setBuilderPrefill({
                  vehicleMake:  args.vehicle.make,
                  vehicleModel: args.vehicle.model,
                  vehicleYear:  args.vehicle.year,
                  vehicleSize:  args.vehicle.size,
                  addonIds:     args.addonIds,
                });
                setExpandedBookingId("hero");
                setTimeout(() => document.getElementById("hero-booking")?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
              }}
            />
          </div>

          {/* Squeeze Me In CTA */}
          <div className="flex justify-center mb-6">
            <button
              onClick={() => setSqueezeOpen(true)}
              className="group flex items-center gap-3 bg-zinc-900/60 hover:bg-zinc-800/80 border border-white/[0.08] hover:border-amber-500/30 rounded-2xl px-5 py-3 transition-all duration-300 active:scale-[0.98]"
            >
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0 group-hover:bg-amber-500/20 transition-colors">
                <Zap size={15} className="text-amber-500" />
              </div>
              <div className="text-left">
                <p className="text-sm font-black text-white leading-tight">Need it Today or Tomorrow?</p>
                <p className="text-[11px] text-zinc-500 group-hover:text-zinc-400 transition-colors">Request a last-minute spot — we&apos;ll reach out fast</p>
              </div>
              <ChevronDown size={14} className="text-zinc-600 group-hover:text-amber-500 transition-colors -rotate-90 shrink-0" />
            </button>
          </div>

          {/* Hero inline-booking dropdown — opens from any "Book Now" CTA. */}
          {mounted && (
            <div id="hero-booking" className="w-full max-w-3xl mx-auto mt-2 scroll-mt-24">
              <BookingSection
                isVisible={expandedBookingId === "hero"}
                onClose={() => setExpandedBookingId(null)}
                selectedService={expandedBookingId === "hero" ? selectedService : null}
                services={services}
                addonOverrides={addonOverrides}
                onSelectService={setSelectedService}
                onClearService={() => setSelectedService(null)}
                onBookingSuccess={handleBookingSuccess}
                initialLoyaltyDiscountPct={authLoyaltyDiscountPct}
                initialDraft={initialDraft}
                onDraftRestored={() => setInitialDraft(null)}
                onProgress={setBookingProgress}
                initialCategory={heroInitialCategory}
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
              { value: "263+", label: "Vehicles Detailed" },
              { value: "5.0★", label: "On Google · 10 reviews" },
              { value: "100%", label: "Mobile · We come to you" },
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
                      { icon: Leaf, label: "Lake-Safe Products" },
                      { icon: MapPin, label: "VT Owned & Operated" },
                      { icon: CalendarClock, label: "Same-Week Openings" },
                      { icon: CalendarRange, label: "Real-Time Online Booking" },
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

      {/* ─── Before & After Gallery ───────────────────────────────── */}
      <BeforeAfterGallery
        onBookUltimate={() => openUltimateBooking("Ultimate Interior Reset")}
      />


      {/* Build For Me Quiz — sits directly above the packages so people who
          don't know which tier to pick get an immediate on-ramp. Quiz collects
          scope + pains + severity + vehicle → the full builder prefill is
          handed off so BookingModal opens on Step 2 (Date & Time) with
          service, vehicle, and add-ons already selected. When customer picks
          the Ultimate upgrade from the result screen, `preferUltimate` is
          set so we swap the foundation to Ultimate Interior Reset. */}
      <BuildForMeHomepageSection
        services={services}
        onUseBuild={(args) => {
          const serviceName = args.preferUltimate
            ? "Ultimate Interior Reset"
            : args.foundation === "interior" ? "Interior Detail"
            : args.foundation === "exterior" ? "Exterior Detail"
            : "Full Detail";
          const svc = services.find(s => s.name === serviceName) ?? null;
          setSelectedService(svc);
          setBuilderPrefill({
            vehicleMake:  args.vehicle.make,
            vehicleModel: args.vehicle.model,
            vehicleYear:  args.vehicle.year,
            vehicleSize:  args.vehicle.size,
            addonIds:     args.addonIds,
          });
          setExpandedBookingId("services");
          setTimeout(() => document.getElementById("services")?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
        }}
      />

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
          <div className="text-center mb-8 md:mb-10">
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#D4AF37] mb-2">Our Services</p>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-white">Pick the detail that fits.</h2>
            <p className="text-zinc-500 text-sm mt-2">Three foundations, four sizes, fully transparent pricing.</p>
          </div>

          {/* ── Basic services carousel (mobile) + grid (desktop) ──── */}
          {mounted && (
            <div className="flex flex-col items-center w-full lg:hidden">
              <div
                ref={carouselRef}
                onScroll={handleCarouselScroll}
                className="w-full flex overflow-x-auto snap-x snap-mandatory"
                style={{ scrollbarWidth: "none", msOverflowStyle: "none" } as React.CSSProperties}
              >
                {carouselServices.map((service) => (
                  <div key={service.id} className="snap-center shrink-0 w-full flex justify-center px-4 pt-6 pb-12">
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
          )}

          {/* Desktop: 3-up grid of basic service cards */}
          {carouselServices.length > 0 && (
            <div className="hidden lg:grid lg:grid-cols-3 gap-6 items-start">
              {carouselServices.map((service) => (
                <ServiceCard key={service.id} service={service} onBook={() => openBooking(service)} />
              ))}
            </div>
          )}

          {/* ── Inline booking — opens when a basic service card is clicked ── */}
          {mounted && expandedBookingId === "services" && (
            <div className="w-full max-w-[450px] lg:max-w-3xl mx-auto mt-8 animate-in fade-in slide-in-from-top-4 duration-500">
              <BookingSection
                isVisible={true}
                onClose={() => { setExpandedBookingId(null); setBuilderPrefill(null); }}
                selectedService={selectedService}
                services={services}
                addonOverrides={addonOverrides}
                onSelectService={setSelectedService}
                onClearService={() => setSelectedService(null)}
                onBookingSuccess={handleBookingSuccess}
                initialLoyaltyDiscountPct={authLoyaltyDiscountPct}
                initialDraft={initialDraft}
                onDraftRestored={() => setInitialDraft(null)}
                prefilledVehicle={builderPrefill ? {
                  make: builderPrefill.vehicleMake,
                  model: builderPrefill.vehicleModel,
                  size: builderPrefill.vehicleSize,
                  year: builderPrefill.vehicleYear,
                } : null}
                prefilledAddonIds={builderPrefill?.addonIds ?? null}
                prefilledAdditionalVehicles={builderPrefill?.additionalVehicles ?? null}
              />
            </div>
          )}

          {/* ── Ultimate Series — premium deep-reset cards ── */}
          {(
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
                <h3 className="text-2xl md:text-3xl font-black text-white">Beyond clean — <span className="text-[#D4AF37]">restored.</span></h3>
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
                  <div key={card.name} className="snap-center shrink-0 w-full flex justify-center px-4 pt-6 pb-12">
                    <div className="w-full max-w-[360px]">
                      <UltimateServiceCard {...card} onBook={openUltimateBooking} loyaltyDiscountPct={authLoyaltyDiscountPct} />
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
            </div>}

            {/* Desktop: Ultimate grid — single card now, centered */}
            <div className="hidden lg:grid lg:grid-cols-1 gap-6 items-start max-w-xl mx-auto">
              {ULTIMATE_CARDS.map((card) => (
                <UltimateServiceCard key={card.name} {...card} onBook={openUltimateBooking} loyaltyDiscountPct={authLoyaltyDiscountPct} />
              ))}
            </div>
          </div>
          )}

          {/* Comparison link removed from homepage — lives at /services for
              customers in research mode (linked from the header More menu). */}

          {/* ── Inline booking for ultimate ── */}
          {mounted && expandedBookingId === "ultimate" && (
            <div className="w-full max-w-[450px] lg:max-w-3xl mx-auto mt-8 animate-in fade-in slide-in-from-top-4 duration-500">
              <BookingSection
                isVisible={true}
                onClose={() => { setExpandedBookingId(null); setPrefilledVehicle(null); }}
                selectedService={selectedService}
                services={services}
                addonOverrides={addonOverrides}
                onSelectService={setSelectedService}
                onClearService={() => setSelectedService(null)}
                onBookingSuccess={handleBookingSuccess}
                initialLoyaltyDiscountPct={authLoyaltyDiscountPct}
                initialDraft={initialDraft}
                onDraftRestored={() => setInitialDraft(null)}
                prefilledVehicle={prefilledVehicle}
              />
            </div>
          )}

        </div>
      </motion.section>


      {/* ─── Boat / RV / Fleet — collapsed under "More Services" button ──────
          Boat/RV/Truck/Heavy Equipment retired 2026-07. Kept the
          component definition below in case fleet needs to surface later. */}
      {/* <MoreServicesDisclosure /> */}

      {/* ─── Fleet Quote Calculator — homepage embed ─────────────────────────
          Live slider that lets visitors play with the per-vehicle math
          without leaving the homepage. Same component used on /fleet —
          the inquiry modal it opens captures the same data either way. */}
      <FleetCalloutWithSlider />

      {/* Legacy expanded-card block — preserved below behind a `false` gate so the
          state shape + inline booking flow remain referenced by the rest of the
          page, but the bloated UI is no longer rendered. Safe to remove entirely
          in a future cleanup pass once we've confirmed nothing else hooks into
          `expandedBookingId === "boat" / "rv"`. */}
      {false && (
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={sectionViewport}
        variants={sectionVariants}
        className="hidden"
      >
        <div className="w-full max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* ── Boat / Marine Card ── */}
            <div
              className="relative rounded-2xl overflow-hidden group transition-all duration-300 hover:-translate-y-1 border border-[#D4AF37]/25 hover:border-[#D4AF37]/50 hover:shadow-[0_16px_40px_rgba(212,175,55,0.15)]"
              style={{ background: "linear-gradient(170deg, #1a1a1c 0%, #0d0d0f 100%)" }}
            >
              <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 110% 40% at 50% 0%, rgba(212,175,55,0.08) 0%, transparent 65%)" }} />
              <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-[#D4AF37]/60 to-transparent shrink-0" />

              <div className="relative p-5">
                {/* Header */}
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div className="flex-1 min-w-0">
                    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/20 mb-2">
                      <Anchor size={8} className="text-[#D4AF37]" strokeWidth={2} />
                      <span className="text-[8px] font-black uppercase tracking-[0.3em] text-[#D4AF37]">Dockside Specialist</span>
                    </div>
                    <h3 className="text-lg font-black text-white tracking-tight leading-tight">Boat & Marine Detailing</h3>
                    <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                      We come to the dock — no haul-out required. Lake Champlain specialists.
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/20 flex items-center justify-center shrink-0">
                    <Anchor size={18} className="text-[#D4AF37]" strokeWidth={1.5} />
                  </div>
                </div>

                <div className="h-px bg-white/[0.05] mb-3" />

                {/* Pricing rows */}
                <div className="space-y-1.5 mb-4">
                  {[
                    { label: "Boat Interior",     price: "$15/ft" },
                    { label: "Boat Exterior",     price: "$16/ft" },
                    { label: "Boat Full Detail",  price: "$28/ft" },
                  ].map(({ label, price }) => (
                    <div key={label} className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-zinc-950/60 border border-white/[0.04]">
                      <span className="text-xs text-zinc-300 font-medium">{label}</span>
                      <span className="text-xs font-black text-[#D4AF37] tabular-nums">{price}</span>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-zinc-700 mb-4 px-1">15 ft minimum · Heavy mold or bilge odor +$75–$150</p>

                {/* CTAs */}
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedService(null);
                      setExpandedBookingId(expandedBookingId === "boat" ? null : "boat");
                    }}
                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#F0D060] text-black text-xs font-black hover:opacity-90 active:scale-[0.98] transition-all duration-200 shadow-[0_4px_12px_rgba(212,175,55,0.25)]"
                  >
                    Book Now
                  </button>
                  <Link
                    href="/boat-detailing"
                    className="flex-1 py-2.5 rounded-xl border border-[#D4AF37]/30 text-[#D4AF37] text-xs font-semibold text-center hover:bg-[#D4AF37]/[0.07] transition-all duration-200"
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
                    addonOverrides={addonOverrides}
                    onSelectService={setSelectedService}
                    onClearService={() => setSelectedService(null)}
                    onBookingSuccess={handleBookingSuccess}
                    initialLoyaltyDiscountPct={authLoyaltyDiscountPct}
                    initialCategory="boat"
                  />
                </div>
              )}
            </div>

            {/* ── RV Card ── */}
            <div
              className="relative rounded-2xl overflow-hidden group transition-all duration-300 hover:-translate-y-1 border border-[#D4AF37]/25 hover:border-[#D4AF37]/50 hover:shadow-[0_16px_40px_rgba(212,175,55,0.15)]"
              style={{ background: "linear-gradient(170deg, #1a1a1c 0%, #0d0d0f 100%)" }}
            >
              <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 110% 40% at 50% 0%, rgba(212,175,55,0.08) 0%, transparent 65%)" }} />
              <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-[#D4AF37]/60 to-transparent shrink-0" />

              <div className="relative p-5">
                {/* Header */}
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div className="flex-1 min-w-0">
                    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/20 mb-2">
                      <Truck size={8} className="text-[#D4AF37]" strokeWidth={2} />
                      <span className="text-[8px] font-black uppercase tracking-[0.3em] text-[#D4AF37]">Mobile Service</span>
                    </div>
                    <h3 className="text-lg font-black text-white tracking-tight leading-tight">RV & Camper Detailing</h3>
                    <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                      At your site or home. 20 ft minimum, priced per foot.
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/20 flex items-center justify-center shrink-0">
                    <Truck size={18} className="text-[#D4AF37]" strokeWidth={1.5} />
                  </div>
                </div>

                <div className="h-px bg-white/[0.05] mb-3" />

                {/* Pricing rows */}
                <div className="space-y-1.5 mb-3">
                  {[
                    { label: "RV Exterior",     price: "$15/ft" },
                    { label: "RV Interior",     price: "$25/ft" },
                    { label: "RV Full Detail",  price: "$38/ft" },
                  ].map(({ label, price }) => (
                    <div key={label} className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-zinc-950/60 border-white/[0.04] border">
                      <span className="text-xs font-medium text-zinc-300">{label}</span>
                      <span className="text-xs font-black tabular-nums text-[#D4AF37]">{price}</span>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-zinc-700 mb-4 px-1">20 ft minimum · Heavy mold or pet hair +$75–$150</p>

                {/* CTAs */}
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedService(null);
                      setExpandedBookingId(expandedBookingId === "rv" ? null : "rv");
                    }}
                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#F0D060] text-black text-xs font-black hover:opacity-90 active:scale-[0.98] transition-all duration-200 shadow-[0_4px_12px_rgba(212,175,55,0.25)]"
                  >
                    Book Now
                  </button>
                  <Link
                    href="/rv-detailing"
                    className="flex-1 py-2.5 rounded-xl border border-[#D4AF37]/30 text-[#D4AF37] text-xs font-semibold text-center hover:bg-[#D4AF37]/[0.07] transition-all duration-200"
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
                    addonOverrides={addonOverrides}
                    onSelectService={setSelectedService}
                    onClearService={() => setSelectedService(null)}
                    onBookingSuccess={handleBookingSuccess}
                    initialLoyaltyDiscountPct={authLoyaltyDiscountPct}
                    initialCategory="rv"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.section>
      )}

      {/* ─── Loyalty Rewards (Premium Tier Ladder) ───────────────────── */}
      <motion.section
        id="loyalty-rewards"
        initial="hidden"
        whileInView="visible"
        viewport={sectionViewport}
        variants={sectionVariants}
        className="py-20 md:py-32 px-4 sm:px-6 lg:px-8 border-t border-white/[0.06] relative overflow-hidden"
      >
        {/* Layered ambient backdrop — large gold glow + subtle grain pattern */}
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 90% 70% at 50% 0%, rgba(212,175,55,0.10) 0%, transparent 60%)" }} />
          <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 70% 60% at 50% 100%, rgba(212,175,55,0.08) 0%, transparent 70%)" }} />
        </div>

        <div className="w-full max-w-6xl mx-auto relative z-10">
          {/* ── Premium header ── */}
          <div className="text-center mb-12 md:mb-16">
            <div className="inline-flex items-center gap-2 mb-5 px-3.5 py-1.5 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30 backdrop-blur-sm">
              <Crown size={11} className="text-[#D4AF37]" />
              <span className="text-[10px] font-black uppercase tracking-[0.28em] text-[#D4AF37]">Members Only</span>
            </div>
            <h2 className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tight leading-[1] mb-5">
              <span className="block bg-gradient-to-r from-[#D4AF37] via-[#F3E5AB] to-[#D4AF37] bg-clip-text text-transparent"
                style={{ filter: "drop-shadow(0 2px 24px rgba(212,175,55,0.25))" }}>
                Up to 20% off.
              </span>
              <span className="block text-white mt-1">Forever.</span>
            </h2>
            <p className="text-zinc-400 text-base md:text-lg max-w-xl mx-auto leading-relaxed">
              Every detail you book unlocks a bigger discount. Automatic, forever.
            </p>
          </div>

          {/* ── The Tier Ladder ──────────────────────────────────────── */}
          {/* Stepped visual progression — tier height, glow, and color intensity escalate toward VIP */}
          <div className="relative mb-10 md:mb-12">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 items-end">
              {[
                {
                  label: "Member", pct: 5, min: 1,
                  icon: Star, sample: 12,
                  height: "md:min-h-[230px]",
                  gradient: "from-zinc-800/60 to-zinc-950/70",
                  border: "border-zinc-700/45",
                  ringGlow: "rgba(161,161,170,0.12)",
                  textColor: "text-zinc-200",
                  pctColor: "text-zinc-100",
                  iconBg: "bg-zinc-800/70 border-zinc-700/45",
                  topAccent: "from-transparent via-zinc-500/40 to-transparent",
                },
                {
                  label: "Silver", pct: 10, min: 3,
                  icon: ShieldCheck, sample: 24,
                  height: "md:min-h-[260px]",
                  gradient: "from-zinc-700/50 to-zinc-900/70",
                  border: "border-zinc-400/35",
                  ringGlow: "rgba(212,212,216,0.18)",
                  textColor: "text-zinc-100",
                  pctColor: "text-white",
                  iconBg: "bg-zinc-800/70 border-zinc-400/35",
                  topAccent: "from-transparent via-zinc-300/45 to-transparent",
                },
                {
                  label: "Gold", pct: 15, min: 5,
                  icon: Zap, sample: 36,
                  height: "md:min-h-[290px]",
                  gradient: "from-[#D4AF37]/[0.10] to-zinc-950/70",
                  border: "border-[#D4AF37]/45",
                  ringGlow: "rgba(212,175,55,0.28)",
                  textColor: "text-[#D4AF37]",
                  pctColor: "text-[#D4AF37]",
                  iconBg: "bg-[#D4AF37]/[0.12] border-[#D4AF37]/45",
                  topAccent: "from-[#D4AF37]/30 via-[#D4AF37] to-[#D4AF37]/30",
                },
                {
                  label: "VIP", pct: 20, min: 10,
                  icon: Trophy, sample: 48,
                  height: "md:min-h-[330px]",
                  gradient: "from-[#D4AF37]/[0.18] via-[#D4AF37]/[0.06] to-zinc-950/80",
                  border: "border-[#D4AF37]/65",
                  ringGlow: "rgba(212,175,55,0.45)",
                  textColor: "text-[#F3E5AB]",
                  pctColor: "text-transparent bg-clip-text bg-gradient-to-r from-[#D4AF37] via-[#F3E5AB] to-[#D4AF37]",
                  iconBg: "bg-[#D4AF37]/[0.18] border-[#D4AF37]/60",
                  topAccent: "from-[#D4AF37]/50 via-[#F3E5AB] to-[#D4AF37]/50",
                  isFlagship: true,
                },
              ].map(({ label, pct, min, icon: Icon, sample, height, gradient, border, ringGlow, textColor, pctColor, iconBg, topAccent, isFlagship }) => (
                <div
                  key={label}
                  className={`group relative flex flex-col rounded-2xl overflow-hidden transition-all duration-500 hover:-translate-y-1.5 ${height} bg-gradient-to-b ${gradient} border ${border} ${
                    isFlagship ? "shadow-[0_0_60px_rgba(212,175,55,0.18)] hover:shadow-[0_0_80px_rgba(212,175,55,0.32)]" : "hover:shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
                  }`}
                >
                  {/* Top accent stripe */}
                  <div className={`h-[2px] w-full shrink-0 bg-gradient-to-r ${topAccent}`} />

                  {/* Inner ambient glow */}
                  <div aria-hidden className="absolute inset-0 pointer-events-none rounded-2xl"
                    style={{ background: `radial-gradient(ellipse 110% 50% at 50% 0%, ${ringGlow} 0%, transparent 70%)` }} />

                  <div className="relative flex flex-col items-center text-center flex-1 p-4 md:p-5 pt-5 md:pt-6 z-[1]">
                    {/* Flagship ribbon — placed above the icon, clear separation */}
                    {isFlagship ? (
                      <div className="mb-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-[#D4AF37]/15 via-[#F3E5AB]/20 to-[#D4AF37]/15 border border-[#D4AF37]/45 backdrop-blur-sm shadow-[0_0_14px_rgba(212,175,55,0.18)]">
                        <Crown size={9} className="text-[#F3E5AB] fill-[#F3E5AB]" />
                        <span className="text-[9px] font-black uppercase tracking-[0.24em] bg-gradient-to-r from-[#D4AF37] via-[#F3E5AB] to-[#D4AF37] bg-clip-text text-transparent">
                          Top Tier
                        </span>
                      </div>
                    ) : (
                      // Reserve equal vertical space on non-flagship cards so all icon rows align
                      <div className="mb-3 h-[22px]" aria-hidden />
                    )}

                    {/* Icon */}
                    <div className={`w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center border ${iconBg} mb-3 md:mb-4 transition-transform duration-500 group-hover:scale-110`}>
                      <Icon size={isFlagship ? 22 : 20} className={textColor} fill={isFlagship ? "currentColor" : "none"} strokeWidth={isFlagship ? 1.8 : 2} />
                    </div>

                    {/* Tier label */}
                    <p className="text-[10px] font-black uppercase tracking-[0.28em] text-zinc-500 mb-1">{label}</p>

                    {/* Big % savings */}
                    <p className={`text-4xl md:text-5xl font-black tabular-nums leading-none mb-1 ${pctColor}`}
                       style={isFlagship ? { filter: "drop-shadow(0 1px 16px rgba(212,175,55,0.35))" } : {}}>
                      {pct}%
                    </p>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-3">off forever</p>

                    {/* Min details required */}
                    <div className={`mt-auto inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-900/60 border border-white/[0.06] text-[10px] text-zinc-400`}>
                      <CheckCircle size={9} className={isFlagship ? "text-[#D4AF37]" : "text-zinc-500"} />
                      <span>{min} detail{min !== 1 ? "s" : ""}</span>
                    </div>

                    {/* Sample savings — concrete dollar value */}
                    <div className="hidden md:block mt-3 pt-3 border-t border-white/[0.05] w-full">
                      <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-600">Save on Interior + Exterior</p>
                      <p className={`text-base font-black tabular-nums ${textColor}`}>${sample}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Mobile-only sample savings rail */}
            <div className="md:hidden mt-3 grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-white/[0.06] bg-zinc-900/40 px-4 py-2.5 text-center">
                <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-600">Member saves</p>
                <p className="text-sm font-black tabular-nums text-zinc-200">$12 / Interior + Exterior</p>
              </div>
              <div className="rounded-xl border border-[#D4AF37]/40 bg-[#D4AF37]/[0.06] px-4 py-2.5 text-center">
                <p className="text-[9px] font-bold uppercase tracking-widest text-[#D4AF37]/70">VIP saves</p>
                <p className="text-sm font-black tabular-nums text-[#D4AF37]">$48 / Interior + Exterior</p>
              </div>
            </div>
          </div>

          {/* ── How it works — premium pill row ── */}
          <div className="relative rounded-2xl border border-white/[0.07] bg-gradient-to-b from-zinc-900/60 to-zinc-950/70 backdrop-blur-sm p-5 md:p-6 mb-10 overflow-hidden">
            <div aria-hidden className="absolute inset-0 pointer-events-none"
              style={{ background: "radial-gradient(ellipse 60% 80% at 50% 50%, rgba(212,175,55,0.04) 0%, transparent 70%)" }} />
            <div className="relative grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-0 md:divide-x divide-white/[0.06]">
              {[
                { step: "01", icon: Sparkles, title: "Book any car detail",        sub: "Interior, Exterior, Interior + Exterior, or Ultimate" },
                { step: "02", icon: Zap,      title: "Climb the ladder",            sub: "Each detail counts — automatic, no apps" },
                { step: "03", icon: Crown,    title: "Save more, every time",       sub: "Discount auto-applies forever at checkout" },
              ].map(({ step, icon: Icon, title, sub }) => (
                <div key={step} className="flex items-start gap-3 px-2 md:px-6">
                  <div className="shrink-0 w-9 h-9 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/25 flex items-center justify-center">
                    <Icon size={14} className="text-[#D4AF37]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-[9px] font-black uppercase tracking-[0.22em] text-[#D4AF37]/60">{step}</span>
                    </div>
                    <p className="text-sm font-bold text-white leading-snug">{title}</p>
                    <p className="text-[11px] text-zinc-500 leading-snug mt-0.5">{sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Premium CTAs ── */}
          <div className="flex flex-col items-center gap-3">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full sm:w-auto">
              {authUserId ? (
                <Button variant="primary" href="/protected"
                  className="btn-primary-gold-shimmer relative w-full sm:w-auto px-10 py-4 rounded-2xl text-sm font-black bg-zinc-900/80 backdrop-blur-sm border border-[#D4AF37]/55 text-[#D4AF37] hover:text-black transition-all duration-500 overflow-hidden shadow-[0_4px_30px_rgba(212,175,55,0.18)] hover:shadow-[0_8px_40px_rgba(212,175,55,0.35)]">
                  <span className="relative z-[1] inline-flex items-center gap-2"><Crown size={13} /> View My Dashboard</span>
                </Button>
              ) : (
                <Button variant="primary" href="/auth/sign-up"
                  className="btn-primary-gold-shimmer relative w-full sm:w-auto px-10 py-4 rounded-2xl text-sm font-black bg-zinc-900/80 backdrop-blur-sm border border-[#D4AF37]/55 text-[#D4AF37] hover:text-black transition-all duration-500 overflow-hidden shadow-[0_4px_30px_rgba(212,175,55,0.18)] hover:shadow-[0_8px_40px_rgba(212,175,55,0.35)]">
                  <span className="relative z-[1] inline-flex items-center gap-2"><Sparkles size={13} /> Join Free — Start Earning</span>
                </Button>
              )}
              <button onClick={() => openBooking()}
                className="w-full sm:w-auto px-8 py-4 rounded-2xl border border-white/10 bg-zinc-950/40 text-white hover:bg-white/5 hover:border-white/20 transition-all text-sm font-bold active:scale-[0.98]">
                Book & Earn
              </button>
            </div>
            <p className="text-[10.5px] text-zinc-500 mt-1 flex items-center gap-1.5">
              <Sparkles size={9} className="text-[#D4AF37]" />
              No credit card · No expirations · Lifetime tier
            </p>
          </div>
        </div>
      </motion.section>

      {/* ─── Google Reviews ───────────────────────────────────────────── */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={sectionViewport}
        variants={sectionVariants}
        className="py-14 md:py-24 px-4 sm:px-6 lg:px-8 border-t border-white/[0.06] relative overflow-hidden"
      >
        <div className="w-full max-w-5xl mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
            <div>
              <p className="text-[11px] font-bold tracking-[0.22em] uppercase text-[#D4AF37] mb-1.5">Customer Reviews</p>
              <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">What Vermont is saying</h2>
            </div>
            {/* Google badge */}
            <a
              href="https://g.page/r/Cd76zEF6l465EAI/review"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-4 py-3 rounded-2xl border border-white/[0.08] bg-zinc-900/60 hover:border-white/20 transition-all shrink-0"
            >
              <div className="flex items-center gap-0.5">
                {[1,2,3,4,5].map(i => (
                  <svg key={i} viewBox="0 0 20 20" className="w-4 h-4 fill-[#FBBC04]">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <div>
                <p className="text-sm font-black text-white leading-none">5.0</p>
                <p className="text-[10px] text-zinc-500 mt-0.5">on Google</p>
              </div>
              <div className="w-px h-7 bg-white/[0.07]" />
              <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
            </a>
          </div>

          {/* Review cards — 3-up grid */}
          <div className="grid md:grid-cols-3 gap-4">
            {REVIEWS.slice(0, 3).map((r) => (
              <div key={r.name} className="rounded-2xl border border-white/[0.06] bg-zinc-900/50 p-5 flex flex-col gap-3">
                {/* Stars */}
                <div className="flex items-center gap-0.5">
                  {[1,2,3,4,5].map(i => (
                    <svg key={i} viewBox="0 0 20 20" className="w-3.5 h-3.5 fill-[#FBBC04]">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                {/* Review text */}
                <p className="text-sm text-zinc-300 leading-relaxed flex-1 line-clamp-4">&ldquo;{r.review}&rdquo;</p>
                {/* Name + service */}
                <div className="flex items-center justify-between pt-2 border-t border-white/[0.05]">
                  <div>
                    <p className="text-xs font-bold text-white">{r.name}</p>
                    <p className="text-[10px] text-zinc-600">{r.location}</p>
                  </div>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-[#D4AF37] bg-[#D4AF37]/10 border border-[#D4AF37]/20 px-2 py-0.5 rounded-lg">
                    {r.service}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* See all reviews link */}
          <div className="mt-5 text-center">
            <a
              href="https://g.page/r/Cd76zEF6l465EAI/review"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              See all reviews on Google
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </a>
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
              No — we&apos;re 100% self-contained. Just give us access to the vehicle.
            </p>
          </details>
          <details className="bg-zinc-900/30 border border-white/5 rounded-xl overflow-hidden transition-all duration-300 group w-full">
            <summary className="cursor-pointer p-6 flex justify-between items-center text-zinc-100 font-medium hover:text-[#D4AF37] outline-none list-none text-base md:text-lg">
              <span className="flex-1 text-center">How long does a detail take?</span>
              <ChevronDown className="w-5 h-5 shrink-0 transition-transform duration-200 group-open:rotate-180" />
            </summary>
            <p className="text-zinc-400 text-sm md:text-base px-6 pb-6 leading-relaxed text-center">
              Interior 2–3 hrs · Exterior 1.5–2 hrs · Interior + Exterior 3–4 hrs · Ultimate 4–6 hrs.
            </p>
          </details>
          <details className="bg-zinc-900/30 border border-white/5 rounded-xl overflow-hidden transition-all duration-300 group w-full">
            <summary className="cursor-pointer p-6 flex justify-between items-center text-zinc-100 font-medium hover:text-[#D4AF37] outline-none list-none text-base md:text-lg">
              <span className="flex-1 text-center">Do I need to be home during the appointment?</span>
              <ChevronDown className="w-5 h-5 shrink-0 transition-transform duration-200 group-open:rotate-180" />
            </summary>
            <p className="text-zinc-400 text-sm md:text-base px-6 pb-6 leading-relaxed text-center">
              Nope. As long as the vehicle is accessible, we text you when we start and finish.
            </p>
          </details>
          <details className="bg-zinc-900/30 border border-white/5 rounded-xl overflow-hidden transition-all duration-300 group w-full">
            <summary className="cursor-pointer p-6 flex justify-between items-center text-zinc-100 font-medium hover:text-[#D4AF37] outline-none list-none text-base md:text-lg">
              <span className="flex-1 text-center">What if it rains on my appointment day?</span>
              <ChevronDown className="w-5 h-5 shrink-0 transition-transform duration-200 group-open:rotate-180" />
            </summary>
            <p className="text-zinc-400 text-sm md:text-base px-6 pb-6 leading-relaxed text-center">
              We&apos;ll reschedule at no charge for exterior work. Interior-only can usually still go.
            </p>
          </details>
          <details className="bg-zinc-900/30 border border-white/5 rounded-xl overflow-hidden transition-all duration-300 group w-full">
            <summary className="cursor-pointer p-6 flex justify-between items-center text-zinc-100 font-medium hover:text-[#D4AF37] outline-none list-none text-base md:text-lg">
              <span className="flex-1 text-center">How do loyalty discounts work?</span>
              <ChevronDown className="w-5 h-5 shrink-0 transition-transform duration-200 group-open:rotate-180" />
            </summary>
            <p className="text-zinc-400 text-sm md:text-base px-6 pb-6 leading-relaxed text-center">
              1 detail = 5% off · 3 = 10% · 5 = 15% · 10 = 20% off forever. Auto-applied at checkout.
            </p>
          </details>
          <a href="/faq" className="mt-2 text-sm text-[#D4AF37]/70 hover:text-[#D4AF37] transition-colors font-medium">
            See all FAQs →
          </a>
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
              Let&apos;s get your vehicle on the calendar.
            </h2>
            <p className="text-zinc-400 mb-8 md:mb-10 text-base md:text-lg">
              Real-time availability, transparent pricing, and Vermont&apos;s only owner-operated
              5-star mobile detailer. Pick a time tonight — I&apos;ll come to you.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8 w-full">
              <button
                type="button"
                onClick={() => openBooking()}
                className="btn-primary-gold-shimmer w-full sm:w-auto bg-zinc-900/80 backdrop-blur-md border border-[#D4AF37]/50 text-[#D4AF37] hover:text-black hover:shadow-[0_0_20px_rgba(212,175,55,0.3)] hover:scale-[1.03] px-8 py-3 rounded-lg font-semibold active:scale-[0.98] transition-all duration-500 ease-in-out"
              >
                <span className="relative z-[1]">See Open Slots</span>
              </button>
              <a
                href="tel:8025855563"
                className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-8 py-3 rounded-lg border border-zinc-800 text-zinc-300 hover:border-[#D4AF37]/50 hover:text-[#D4AF37] hover:bg-[#D4AF37]/5 transition-all duration-300 font-semibold"
              >
                <Phone className="w-4 h-4 shrink-0" />
                Or Call Me — 802-585-5563
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
          {/* Newsletter / "Detailing tips" signup removed per owner request —
              wasn't earning its space at the bottom of the homepage. */}

          {/* Main row */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <Image
                src="/e.png"
                alt="Arise And Shine Detailing Logo"
                width={40}
                height={40}
                className="object-contain drop-shadow-md shrink-0"
              />
              <div>
                <div className="font-semibold text-sm">Arise And Shine Detailing</div>
                <div className="text-xs text-zinc-500">
                  Premium Mobile Auto Detailing
                </div>
              </div>
            </div>

            <div className="text-sm text-zinc-500 text-center">
              Serving all of Vermont &middot;{" "}
              <a
                href="mailto:contact@ariseandshinedetailing.com"
                className="hover:text-white transition-colors"
              >
                contact@ariseandshinedetailing.com
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
              &copy; 2026 Arise And Shine Detailing. All rights reserved.
            </div>
          </div>

          {/* Quick links row */}
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 pt-2 border-t border-white/[0.04]">
            <Link href="/my-detail" className="text-xs text-zinc-500 hover:text-[#D4AF37] transition-colors">
              Track My Appointment
            </Link>
            <span className="text-zinc-800 text-xs">·</span>
            <Link href="/guides" className="text-xs text-zinc-500 hover:text-[#D4AF37] transition-colors">
              Detailing Guides
            </Link>
            <span className="text-zinc-800 text-xs">·</span>
            <Link href="/service-area" className="text-xs text-zinc-500 hover:text-[#D4AF37] transition-colors">
              Service Area
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
      {/* Hidden when the booking flow is open — the customer is already
          in checkout and doesn't need a redundant "Book Now" button. */}
      <div
        className={`md:hidden fixed inset-x-0 bottom-0 z-40 px-4 pt-2 transition-all duration-500 ${
          isPastHero && !isBottomCtaVisible && expandedBookingId !== "services" && !builderActive
            ? "translate-y-0 opacity-100 ease-out"
            : "translate-y-full opacity-0 pointer-events-none ease-in"
        }`}
        style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
      >
        <div className={`rounded-2xl border bg-black/60 backdrop-blur-xl shadow-[0_-8px_32px_rgba(0,0,0,0.5)] transition-colors duration-300 ${bookingProgress ? "border-[#D4AF37]/20" : "border-[#D4AF37]/30"}`}>
          {bookingProgress ? (
            /* ── Progress summary bar — mobile-optimised 2-row stack ── */
            (() => {
              const jumpBack = () => {
                const el = document.getElementById("booking-panel");
                if (!el) return;
                const top = el.getBoundingClientRect().top + window.scrollY - 84;
                const startY = window.scrollY;
                const diff = top - startY;
                const duration = Math.min(900, Math.max(400, Math.abs(diff) * 0.4));
                const start = performance.now();
                const step = (ts: number) => {
                  const p = Math.min((ts - start) / duration, 1);
                  const e = p < 0.5 ? 8 * p ** 4 : 1 - (-2 * p + 2) ** 4 / 2;
                  window.scrollTo(0, startY + diff * e);
                  if (p < 1) requestAnimationFrame(step);
                };
                requestAnimationFrame(step);
              };
              const displayStep = bookingProgress.step + 1;
              return (
                <div className="px-3 sm:px-4 py-2.5 sm:py-3">
                  {/* Top row: service + running total */}
                  <div className="flex items-baseline justify-between gap-2 mb-1.5">
                    <p className="text-[13px] sm:text-sm font-black text-white truncate leading-tight flex-1 min-w-0">
                      {bookingProgress.serviceName ?? "Booking in progress…"}
                    </p>
                    {bookingProgress.price !== null && (
                      <span className="text-[#D4AF37] font-black text-base sm:text-lg tabular-nums shrink-0 leading-none">
                        ${Math.round(bookingProgress.price)}
                      </span>
                    )}
                  </div>

                  {/* Middle row: step ladder + date chip */}
                  <div className="flex items-center gap-2 mb-2.5">
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4].map((s) => {
                        const isDone = s <= displayStep;
                        return (
                          <div
                            key={s}
                            className={`rounded-full transition-all duration-300 ${isDone ? "w-3 h-1.5 bg-[#D4AF37]" : "w-1.5 h-1.5 bg-zinc-700"}`}
                          />
                        );
                      })}
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 shrink-0">
                      Step {displayStep}/4
                    </span>
                    {bookingProgress.date && (
                      <>
                        <span className="text-zinc-700 text-[10px] shrink-0">·</span>
                        <span className="flex items-center gap-1 text-[10px] text-zinc-400 truncate">
                          <Calendar size={10} className="shrink-0" />
                          <span className="truncate">
                            {new Date(bookingProgress.date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                          </span>
                        </span>
                      </>
                    )}
                  </div>

                  {/* Full-width back-to-booking button */}
                  <button
                    type="button"
                    onClick={jumpBack}
                    className="w-full flex items-center justify-center gap-1.5 h-10 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/25 text-[#D4AF37] text-xs font-black uppercase tracking-widest hover:bg-[#D4AF37]/20 active:scale-[0.98] transition-all"
                  >
                    <ChevronUp size={13} strokeWidth={3} />
                    Back to Booking
                  </button>
                </div>
              );
            })()
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
      <RecentActivityToast
        paused={
          expandedBookingId !== null ||
          showSuccessModal ||
          stripeVerifying ||
          legalModal !== null ||
          trackModalOpen
        }
      />

      {/* ─── Privacy Policy Modal ──────────────────────────────────── */}
      <LegalModal
        isOpen={legalModal === "privacy"}
        onClose={() => setLegalModal(null)}
        title="Privacy Policy"
      >
        <p className="text-zinc-500 text-xs">Last updated: March 2026 &nbsp;·&nbsp; Arise And Shine Detailing</p>

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
            <strong className="text-zinc-200">Arise And Shine Detailing does not store, log, or have access to your full card number, CVV, or other sensitive payment data.</strong>{" "}
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
          <p>We retain your booking and profile information for up to 3 years to maintain service history and loyalty rewards. You may request deletion of your data at any time by emailing us at <span className="text-zinc-200">contact@ariseandshinedetailing.com</span>.</p>
        </LegalSection>

        <LegalSection title="6. Cookies & Analytics">
          <p>Our website may use basic analytics tools to understand traffic and improve user experience. No personally identifiable information is collected through cookies. We do not use third-party advertising cookies.</p>
        </LegalSection>

        <LegalSection title="7. Contact Us">
          <p>If you have questions about this Privacy Policy, please contact us at <span className="text-zinc-200">contact@ariseandshinedetailing.com</span> or by phone at <span className="text-zinc-200">802-585-5563</span>.</p>
        </LegalSection>
      </LegalModal>

      {/* ─── Terms of Service Modal ────────────────────────────────── */}
      <LegalModal
        isOpen={legalModal === "terms"}
        onClose={() => setLegalModal(null)}
        title="Terms of Service"
      >
        <p className="text-zinc-500 text-xs">Last updated: March 2026 &nbsp;·&nbsp; Arise And Shine Detailing</p>
        <p>By booking a service with Arise And Shine Detailing, you agree to the following terms. Please read them carefully.</p>

        <LegalSection title="1. Services Provided">
          <p>Arise And Shine Detailing is a mobile auto detailing service operating throughout Vermont. All services are performed at the customer&apos;s specified location. We are not a brick-and-mortar shop. Services are subject to availability.</p>
        </LegalSection>

        <LegalSection title="2. Site Requirements">
          <LegalList items={[
            "We bring our own water supply and power equipment for most services — no hookup is required unless otherwise agreed.",
            "The customer must ensure the vehicle is accessible and that we have reasonable space to work safely.",
            "Parking on a level surface is preferred. We reserve the right to decline service if conditions are unsafe.",
          ]} />
        </LegalSection>

        <LegalSection title="3. Pre-Existing Damage & Liability">
          <p className="mb-2">Arise And Shine Detailing is not liable for:</p>
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
            ($75 for Interior, $100 for Interior + Exterior) before the recurring monthly service begins. This fee is{" "}
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
          <p>Questions about these terms? Reach us at <span className="text-zinc-200">contact@ariseandshinedetailing.com</span> or <span className="text-zinc-200">802-585-5563</span>.</p>
        </LegalSection>
      </LegalModal>

      {/* ─── Booking success modal (centered popup) ───────────────────────────── */}
      <SuccessModal
        isOpen={showSuccessModal}
        onClose={handleCloseSuccessModal}
        data={successModalData}
      />

      <SqueezeMeInModal isOpen={squeezeOpen} onClose={() => setSqueezeOpen(false)} />

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
  "Floor mats & carpet cleaning (shampoo not included — heavy dirt or set-in stains will NOT lift without adding Carpet & Upholstery Shampoo)",
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
  const [showInclusions, setShowInclusions] = useState(false);

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
              {getServiceDisplayName(service.name)}
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

      {/* Inclusions — collapsible disclosure to keep card compact at idle */}
      {inclusions.length > 0 ? (
        <div className="px-7 pb-5 flex-1">
          <button
            type="button"
            onClick={() => setShowInclusions(s => !s)}
            aria-expanded={showInclusions}
            className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-zinc-400 hover:text-[#D4AF37] transition-colors group/disc"
          >
            {showInclusions ? "Hide" : `What's Included (${inclusions.length})`}
            <ChevronDown size={12} className={`transition-transform duration-200 ${showInclusions ? "rotate-180" : ""}`} />
          </button>
          {showInclusions && (
            <ul className="space-y-2.5 mt-3">
              {inclusions.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-zinc-400 leading-snug">
                  <CheckCircle size={14} className="shrink-0 mt-[1px] text-[#D4AF37]/70" strokeWidth={2} />
                  {item}
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <div className="flex-1" />
      )}

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
          Counts toward your loyalty tier
        </p>
      </div>
    </div>
  );
}

// ─── Ultimate Cards data ───────────────────────────────────────────────────────

const ULTIMATE_CARDS = [
  {
    name: "Ultimate Interior Reset",
    tagline: "Seats removed. Every crevice reset.",
    priceNormal: 325, priceLarge: 395,
    badge: { label: "Flagship Service", icon: "gem" as const },
    /** Estimated on-site duration window. Calibrated from SERVICE_DURATIONS. */
    timeOnSite: "3.5–4.5 hrs",
    features: [
      "Seats REMOVED from vehicle for deep clean",
      "Full shampoo of seats, carpet, and floor mats",
      "Steam clean every surface, vacuum every crevice",
      "Disinfect and protect all interior surfaces",
      "Interior glass streak-free (all windows)",
      "Rubber/carpet mats cleaned and protected",
      "Leather conditioning (if applicable)",
      "Trunk fully included",
      "Optional: + Exterior Detail bundle at checkout",
    ],
    isFlagship: true,
  },
] as const;

// ─── Fleet Quote Calculator — homepage section ─────────────────────────────
// Embeds the same FleetQuoteCalculator that lives on /fleet, wrapped in a
// landing-page-styled section. Collapsed by default to keep the homepage
// short — a single CTA expands the live slider + quote tool.
function FleetCalloutWithSlider() {
  const [open, setOpen] = useState(false);
  return (
    <motion.section
      initial="hidden"
      whileInView="visible"
      viewport={sectionViewport}
      variants={sectionVariants}
      className="py-12 md:py-16 px-4 sm:px-6 lg:px-8 border-t border-white/[0.06] relative overflow-hidden"
    >
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse 70% 50% at 50% 0%, rgba(212,175,55,0.06) 0%, transparent 65%)" }}
      />
      <div className="relative w-full max-w-3xl mx-auto">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 text-[11px] font-semibold tracking-[0.2em] uppercase text-[#D4AF37] border border-[#D4AF37]/30 rounded-full px-4 py-2 mb-4">
            <LayoutDashboard size={11} className="shrink-0" />Fleet & Group Quotes
          </div>
          <h2 className="text-2xl md:text-3xl font-black tracking-tight text-white mb-2">
            Got 4+ Vehicles?
          </h2>
          <p className="text-sm text-zinc-500 max-w-md mx-auto leading-relaxed">
            Dealership lot, rental fleet, company cars, or a Saturday-morning
            detailing day for your coworkers — get an instant ballpark with our
            live quote slider.
          </p>
        </div>

        {!open ? (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="w-full sm:w-auto sm:mx-auto block py-3.5 px-6 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#F0D060] text-black font-black text-sm hover:opacity-95 active:scale-[0.98] transition-all shadow-[0_4px_24px_rgba(212,175,55,0.35)] mx-auto"
          >
            Open Fleet Quote Calculator
          </button>
        ) : (
          <div className="rounded-2xl border border-white/[0.08] bg-zinc-900/40 p-5 sm:p-6 animate-in fade-in slide-in-from-top-2 duration-300">
            <FleetQuoteCalculator />
            <div className="text-center mt-4 pt-4 border-t border-white/[0.05]">
              <Link
                href="/fleet"
                className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-zinc-400 hover:text-[#D4AF37] transition-colors"
              >
                See full fleet info page <ChevronRight size={12} />
              </Link>
            </div>
          </div>
        )}
      </div>
    </motion.section>
  );
}

// ─── More Services disclosure ──────────────────────────────────────────────
// Auto detailing is the primary funnel; Boat / RV / Fleet sit behind a
// click so they don't compete with the Ultimate cards for attention.
// ─── Build For Me Quiz — homepage section ─────────────────────────────────
// Standalone "answer 3 questions and we pick the package for you" quiz.
// Same component used inside BuildYourPackage on /detailing — here it's
// surfaced directly on the homepage so visitors who don't want to think
// about packages can get a recommendation in 30 seconds.
function BuildForMeHomepageSection({
  services,
  onUseBuild,
}: {
  services: Service[];
  onUseBuild: React.ComponentProps<typeof BuildForMeQuiz>["onUseBuild"];
}) {
  return (
    <section className="py-10 md:py-14 px-4 sm:px-6 lg:px-8 border-t border-white/[0.06]">
      <div className="w-full max-w-3xl mx-auto">
        <div className="text-center mb-5">
          <div className="inline-flex items-center gap-2 text-[11px] font-semibold tracking-[0.2em] uppercase text-[#D4AF37] mb-3">
            <Sparkles size={11} /> Not Sure Which Package?
          </div>
          <h2 className="text-2xl md:text-3xl font-black tracking-tight text-white mb-2">
            Answer 3 questions, we&apos;ll pick for you.
          </h2>
          <p className="text-sm text-zinc-500 max-w-md mx-auto leading-relaxed">
            Tell us what part of your car needs the most help and how rough it&apos;s
            gotten — we&apos;ll recommend the right tier and you can book in one tap.
          </p>
        </div>
        <BuildForMeQuiz services={services} onUseBuild={onUseBuild} />
      </div>
    </section>
  );
}

function MoreServicesDisclosure() {
  const [open, setOpen] = useState(false);
  const TILES = [
    { href: "/boat-detailing",            Icon: Anchor,          title: "Boat Detailing",       blurb: "Dockside · Lake Champlain",     priceHint: "from $15/ft" },
    { href: "/rv-detailing",              Icon: Truck,           title: "RV Detailing",         blurb: "At your site · 20 ft min",      priceHint: "from $15/ft" },
    { href: "/truck-detailing",           Icon: Container,       title: "Semi Truck Detailing", blurb: "Day cabs & sleepers · on-site", priceHint: "from $99" },
    { href: "/heavy-equipment-detailing", Icon: Tractor,         title: "Heavy Equipment",      blurb: "Cab interiors · excavators",    priceHint: "from $175" },
    { href: "/fleet",                     Icon: LayoutDashboard, title: "Fleet Quotes",         blurb: "4+ vehicles · up to 20% off",   priceHint: "Custom quote" },
  ];
  return (
    <section className="py-8 md:py-10 px-4 sm:px-6 lg:px-8 border-t border-white/[0.06]">
      <div className="w-full max-w-3xl mx-auto">
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          aria-expanded={open}
          className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-white/[0.08] bg-zinc-900/40 text-zinc-300 text-sm font-bold hover:border-[#D4AF37]/40 hover:text-[#D4AF37] active:scale-[0.99] transition-all"
        >
          {open ? "Hide other services" : "Also offering Boat · RV · Truck · Heavy Equipment · Fleet"}
          <ChevronDown size={14} className={`text-[#D4AF37] transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
        </button>
        {open && (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
            {TILES.map(({ href, Icon, title, blurb, priceHint }) => (
              <Link key={href} href={href}
                className="group relative rounded-2xl overflow-hidden border border-[#D4AF37]/20 hover:border-[#D4AF37]/50 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(212,175,55,0.12)] p-4 flex items-center gap-3.5"
                style={{ background: "linear-gradient(170deg, #1a1a1c 0%, #0d0d0f 100%)" }}>
                <div className="w-11 h-11 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/20 flex items-center justify-center shrink-0 group-hover:bg-[#D4AF37]/15 transition-colors">
                  <Icon size={18} className="text-[#D4AF37]" strokeWidth={1.75} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-white leading-tight group-hover:text-[#D4AF37] transition-colors">{title}</p>
                  <p className="text-[11px] text-zinc-500 mt-0.5 leading-snug truncate">{blurb}</p>
                  <p className="text-[10px] font-bold text-[#D4AF37]/70 mt-0.5 tabular-nums">{priceHint}</p>
                </div>
                <ChevronRight size={14} className="text-zinc-600 group-hover:text-[#D4AF37] group-hover:translate-x-0.5 transition-all shrink-0" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

// ─── Ultimate Service Card ─────────────────────────────────────────────────────

function UltimateServiceCard({
  name, tagline, priceNormal, priceLarge,
  badge, features, onBook, isFlagship, timeOnSite, loyaltyDiscountPct = 0,
}: {
  name: string; tagline: string; priceNormal: number; priceLarge: number;
  badge: { label: string; icon: "star" | "gem" };
  features: readonly string[];
  onBook: (name: string) => void;
  isFlagship: boolean;
  timeOnSite?: string;
  /** Customer's loyalty tier discount (0-1). When > 0, surfaces a live
   *  "Your VIP price" preview on the card so members see the savings
   *  before they even open the booking flow. */
  loyaltyDiscountPct?: number;
}) {
  const loyaltyActive = loyaltyDiscountPct > 0;
  const discountedNormal = loyaltyActive ? Math.round(priceNormal * (1 - loyaltyDiscountPct)) : priceNormal;
  const discountedLarge  = loyaltyActive ? Math.round(priceLarge  * (1 - loyaltyDiscountPct)) : priceLarge;
  const [showFeatures, setShowFeatures] = useState(false);
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
            {/* "Most Complete" only on the truly flagship card (gem icon).
                Both cards share the premium styling via isFlagship now, but
                this label still belongs only to Interior + Exterior. */}
            {badge.icon === "gem" && (
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
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.2em]">
              {priceNormal === priceLarge ? "Flat Rate — All Vehicle Sizes" : "Range — Varies by Vehicle Size"}
            </div>
            {loyaltyActive && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-emerald-500/15 border border-emerald-400/40 text-emerald-300">
                <Crown size={8} fill="currentColor" /> Your VIP −{Math.round(loyaltyDiscountPct * 100)}%
              </span>
            )}
          </div>
          {loyaltyActive && (
            <div className="text-xs font-bold text-zinc-500 line-through tabular-nums mb-1">
              {priceNormal === priceLarge ? `$${priceNormal}` : `$${priceNormal}–$${priceLarge}`}
            </div>
          )}
          <div className={`font-black tabular-nums leading-none whitespace-nowrap ${isFlagship ? "text-[#D4AF37]" : "text-white"} ${
            priceNormal === priceLarge ? "text-5xl" : "text-3xl sm:text-4xl md:text-5xl"
          }`}>
            {discountedNormal === discountedLarge ? `$${discountedNormal}` : `$${discountedNormal}–$${discountedLarge}`}
          </div>
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <div className="text-xs text-zinc-600">No hidden fees · We bring everything</div>
            {timeOnSite && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-900/60 border border-white/[0.08] text-[10px] font-bold text-zinc-300">
                <Sparkles size={9} className="text-[#D4AF37]" />
                {timeOnSite} on site
              </span>
            )}
          </div>
          {/* Decorative gem watermark */}
          <div className="absolute right-4 bottom-3 opacity-[0.12]">
            <Gem size={56} className="text-[#D4AF37]" strokeWidth={0.8} />
          </div>
        </div>
      </div>

      {/* Top 3 highlights — always visible. Surfaces the differentiators
          customers actually care about (deep clean / ceramic / etc.) without
          forcing them to expand "What's Included". The full list still
          available via the toggle below. */}
      <div className="px-7 pb-4 flex-1">
        <ul className="space-y-2.5 mb-4">
          {features.slice(0, 3).map((item) => (
            <li key={item} className="flex items-start gap-2.5 leading-snug">
              <CheckCircle
                size={14}
                className={`shrink-0 mt-[1px] ${isFlagship ? "text-[#D4AF37]" : "text-[#D4AF37]/70"}`}
                strokeWidth={2.5}
              />
              <span className={`text-[13px] leading-relaxed ${isFlagship ? "text-zinc-200" : "text-zinc-300"}`}>{item}</span>
            </li>
          ))}
        </ul>

        {/* "See full list" — subtle text link instead of a heavy button so the
            visual focus stays on Book This Service below. */}
        {features.length > 3 && (
          <button
            type="button"
            onClick={() => setShowFeatures(s => !s)}
            aria-expanded={showFeatures}
            className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-zinc-400 hover:text-[#D4AF37] transition-colors group"
          >
            {showFeatures ? "Hide" : `+ ${features.length - 3} more included`}
            <ChevronDown size={12} className={`transition-transform duration-200 ${showFeatures ? "rotate-180" : ""}`} />
          </button>
        )}
        {showFeatures && (
          <ul className="space-y-2.5 mt-3">
            {features.slice(3).map((item) => (
              <li key={item} className="flex items-start gap-2.5 leading-snug">
                <CheckCircle
                  size={14}
                  className={`shrink-0 mt-[1px] ${isFlagship ? "text-[#D4AF37]" : "text-[#D4AF37]/70"}`}
                  strokeWidth={2.5}
                />
                <span className={`text-[13px] leading-relaxed ${isFlagship ? "text-zinc-200" : "text-zinc-300"}`}>{item}</span>
              </li>
            ))}
          </ul>
        )}
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
          Counts toward your loyalty tier
        </p>
      </div>
    </div>
  );
}
