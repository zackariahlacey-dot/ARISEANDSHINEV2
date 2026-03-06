"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { motion } from "framer-motion";
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
  CalendarClock,
  CalendarRange,
  CircleSlash,
  Crown,
  Menu,
  X,
  CheckCircle,
  Phone,
} from "lucide-react";
import type { Service } from "@/app/page";
import type { SuccessModalData } from "./SuccessModal";
import { LoyaltyHeaderButton } from "./LoyaltyHeaderButton";

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

const BEFORE_IMAGE = "/JEEP INT BEFORE.jpg";
const AFTER_IMAGE = "/JEEP INT AFTER.jpg";

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

type ExpandedBookingId = "hero" | "club" | "services" | null;

export function LandingPage({ services }: { services: Service[] }) {
  const [mounted, setMounted] = useState(false);
  const [expandedBookingId, setExpandedBookingId] = useState<ExpandedBookingId>(null);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isPastHero, setIsPastHero] = useState(false);
  const [beforeAfterPosition, setBeforeAfterPosition] = useState(50);
  const [authRewardPoints, setAuthRewardPoints] = useState<number | null>(null);
  const [authLifetimePoints, setAuthLifetimePoints] = useState<number | null>(null);
  const [legalModal, setLegalModal] = useState<"privacy" | "terms" | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successModalData, setSuccessModalData] = useState<SuccessModalData | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentReviewIndex, setCurrentReviewIndex] = useState(0);
  const reviewIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    getAuthProfile().then((p) => {
      setAuthRewardPoints(p?.rewardPoints ?? null);
      setAuthLifetimePoints(p?.lifetime_points ?? null);
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
    } else if (service.is_subscription) {
      setExpandedBookingId("club");
    } else {
      setExpandedBookingId("services");
    }
    // Scroll is handled by BookingSection’s onAnimationComplete so one silky scroll runs after expand
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
  }, []);

  const handleCloseSuccessModal = useCallback(() => {
    setShowSuccessModal(false);
    setSuccessModalData(null);
    setSelectedService(null);
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

  const mainGridServices = services.filter((s) => s.name !== "Monthly Maintenance Plan");
  const monthlyPlanService = services.find((s) => s.name === "Monthly Maintenance Plan");

  const [activeServiceId, setActiveServiceId] = useState<string | null>(() => {
    const main = services.filter((s) => s.name !== "Monthly Maintenance Plan");
    return main[0]?.id ?? null;
  });
  const activeService = mainGridServices.find((s) => s.id === activeServiceId) ?? mainGridServices[0];

  return (
    <div className="min-h-screen bg-zinc-950 text-white overflow-x-hidden">
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
        className={`fixed top-0 inset-x-0 z-50 flex justify-between items-center w-full px-4 py-3 md:px-10 md:h-16 transition-all duration-300 ${
          isScrolled || mobileMenuOpen
            ? "bg-black/95 backdrop-blur-md border-b border-white/[0.06] shadow-2xl"
            : "bg-transparent"
        }`}
      >
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
          <button onClick={scrollToServices} className="hover:text-white transition-colors">
            Services
          </button>
          <a href="#why-us" className="hover:text-white transition-colors">Why Us</a>
          <a href="#contact" className="hover:text-white transition-colors">Contact</a>
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
            onClick={() => openBooking()}
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
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
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
        <div className="flex flex-col items-center justify-center flex-1 gap-2 px-8">
          <nav className="flex flex-col items-center gap-1 w-full">
            {[
              { label: "Services", action: scrollToServices },
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
        className="relative min-h-screen flex flex-col items-center justify-center text-center px-6 pt-16"
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

        <div className="relative z-10 flex flex-col items-center gap-4 md:gap-6 w-full">
        <div className="max-w-4xl mx-auto w-full">
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
          <p className="text-base md:text-xl text-zinc-400 max-w-2xl mx-auto mb-10 md:mb-12 leading-relaxed">
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
            <div className="w-full max-w-4xl mx-auto mt-2">
              <BookingSection
                isVisible={expandedBookingId === "hero"}
                onClose={() => setExpandedBookingId(null)}
                selectedService={expandedBookingId === "hero" ? selectedService : null}
                services={services}
                onSelectService={setSelectedService}
                onBookingSuccess={handleBookingSuccess}
                initialRewardPoints={authRewardPoints}
                initialLifetimePoints={authLifetimePoints}
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

          {/* Stats row — no bottom padding/margin */}
          <div className="flex flex-row items-start justify-center gap-4 md:gap-12 w-full max-w-3xl mx-auto">
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

        {/* Trust Bar — infinite scrolling marquee with edge fade */}
        <section className="border-y border-white/[0.06] bg-zinc-950/80 py-8 md:py-10 px-0 w-full mb-6 md:mb-8">
          <div className="marquee-fade-edges w-full overflow-hidden relative flex items-center mt-6 md:mt-8 mb-6 md:mb-8">
            <div className="marquee-container group flex w-max min-w-full gap-6 md:gap-8 pr-6 md:pr-8 marquee-scroll">
              {(() => {
                const badges = [
                  { icon: ShieldCheck, label: "Fully Insured" },
                  { icon: Leaf, label: "Eco-Friendly Products" },
                  { icon: BadgeCheck, label: "Satisfaction Guaranteed" },
                  { icon: MapPin, label: "VT Owned & Operated" },
                ];
                const duplicated = [...badges, ...badges];
                return duplicated.map(({ icon: Icon, label }, i) => (
                  <div
                    key={`${label}-${i}`}
                    className="flex-shrink-0 inline-flex items-center gap-2 rounded-full bg-zinc-900/40 backdrop-blur-sm border border-white/5 px-6 py-3 text-sm font-medium text-zinc-300 transition-all hover:bg-zinc-800 hover:border-[#D4AF37]/30 cursor-default"
                  >
                    <Icon size={14} className="text-[#D4AF37] shrink-0" strokeWidth={1.75} />
                    <span className="whitespace-nowrap">{label}</span>
                  </div>
                ));
              })()}
            </div>
          </div>
        </section>
        </div>

      </motion.section>

      {/* ─── Before & After Slider ───────────────────────────────── */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={sectionViewport}
        variants={sectionVariants}
        className="pt-0 pb-16 md:pb-24 px-4 border-t border-white/[0.06]"
      >
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <p className="text-sm font-semibold tracking-[0.2em] uppercase text-[#D4AF37] mb-2">
              See the results
            </p>
            <h2 className="text-2xl md:text-3xl font-black tracking-tight text-zinc-100">
              Before & After
            </h2>
          </div>
          <div className="relative aspect-video rounded-xl overflow-hidden border border-white/[0.08] bg-[#0a0a0a]">
            {/* Both images stacked; dimensions never change (below fold, lazy + sizes) */}
            <Image
              src={BEFORE_IMAGE}
              alt="Interior before detail"
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover"
            />
            <Image
              src={AFTER_IMAGE}
              alt="Interior after detail"
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover"
              style={{
                clipPath: `inset(0 0 0 ${beforeAfterPosition}%)`,
              }}
            />
            {/* Vertical line and handle at slider position (visual only) */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-white pointer-events-none z-[2] shadow-lg"
              style={{ left: `${beforeAfterPosition}%`, transform: "translateX(-50%)" }}
            >
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white border-2 border-zinc-800 shadow-md flex items-center justify-center">
                <ChevronDown size={10} className="text-zinc-600 rotate-[-90deg]" />
              </div>
            </div>
            {/* Native range input for smooth dragging; spans full container */}
            <input
              type="range"
              min={0}
              max={100}
              value={beforeAfterPosition}
              onChange={(e) => setBeforeAfterPosition(Number(e.target.value))}
              className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-[3]"
              aria-label="Compare before and after"
            />
            {/* Labels */}
            <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/60 text-[9px] font-semibold uppercase tracking-wider text-zinc-300 pointer-events-none z-[1]">
              Before
            </div>
            <div
              className="absolute top-2 pointer-events-none px-2 py-0.5 rounded bg-black/60 text-[9px] font-semibold uppercase tracking-wider text-zinc-300 z-[1]"
              style={{ left: `calc(${beforeAfterPosition}% + 10px)` }}
            >
              After
            </div>
          </div>
        </div>
      </motion.section>

      {/* ─── Membership / Maintenance Club ────────────────────────── */}
      <motion.section
        id="maintenance-club"
        initial="hidden"
        whileInView="visible"
        viewport={sectionViewport}
        variants={sectionVariants}
        className="py-12 md:py-16 px-4 border-t border-white/[0.06]"
      >
        <div className="max-w-5xl mx-auto">
          {/* Section header — tighter */}
          <div className="text-center mb-6 md:mb-8">
            <p className="text-xs font-semibold tracking-[0.2em] uppercase text-[#D4AF37] mb-2">
              Member Exclusive
            </p>
            <h2
              className="text-2xl md:text-4xl font-black tracking-tight bg-gradient-to-r from-[#D4AF37] via-[#F3E5AB] to-[#D4AF37] bg-clip-text text-transparent"
              style={{ filter: "drop-shadow(0 2px 16px rgba(212,175,55,0.2))" }}
            >
              Join the Arise And Shine Maintenance Club
            </h2>
            <p className="mt-2 text-sm text-zinc-400 max-w-xl mx-auto">
              Put your vehicle&apos;s care on auto-pilot. Showroom condition year-round.
            </p>
          </div>

          <div className="relative">
            <div
              className="absolute inset-0 -m-6 rounded-2xl blur-2xl pointer-events-none opacity-40"
              style={{
                background:
                  "radial-gradient(ellipse 80% 60% at 50% 50%, rgba(212,175,55,0.12) 0%, transparent 70%)",
              }}
            />
            <div className="relative w-full max-w-lg lg:max-w-none mx-auto bg-zinc-900/40 backdrop-blur-md border border-[#D4AF37]/20 shadow-[0_0_40px_rgba(212,175,55,0.05)] rounded-2xl p-5 md:p-8 overflow-hidden">
              <div className="flex flex-col items-center lg:items-start text-center lg:text-left">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/20 text-[#D4AF37] text-[10px] font-bold tracking-widest uppercase mb-4">
                <Crown size={10} />
                Member Exclusive
              </div>
              <div className="flex flex-col md:flex-row items-center gap-3 bg-zinc-950 border border-zinc-800 text-zinc-300 text-xs px-4 py-3 rounded-lg mb-6 text-center md:text-left w-full">
                <ShieldCheck size={16} className="shrink-0 text-[#D4AF37]" strokeWidth={1.75} />
                <p>
                  Mandatory <span className="font-semibold text-zinc-100">$100 Deep Clean &amp; Reset</span> before recurring schedule.
                </p>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-12 mb-6 w-full">
                <div className="w-full">
                  <details className="group/details w-full">
                    <summary className="list-none [&::-webkit-details-marker]:hidden text-zinc-300 hover:text-[#D4AF37] cursor-pointer text-base font-semibold flex items-center justify-center gap-2 mb-4 py-3 border-y border-white/5 w-full outline-none transition-colors">
                      What You Get
                      <ChevronDown size={18} className="shrink-0 transition-transform duration-200 group-open/details:rotate-180" />
                    </summary>
                    <ul className="mt-4 mb-6 space-y-3 flex flex-col items-center text-center w-full">
                      {[
                        { icon: CalendarClock, text: "Priority Scheduling", sub: "Slot reserved first." },
                        { icon: CalendarRange, text: "Fixed Monthly Dates", sub: "Same day each month." },
                        { icon: Sparkles,      text: "Premium Protectants", sub: "Ceramic-grade every visit." },
                        { icon: CircleSlash,   text: "Cancel Anytime", sub: "No contracts." },
                      ].map(({ icon: Icon, text, sub }) => (
                        <li key={text} className="flex items-center gap-2">
                          <CheckCircle size={14} className="shrink-0 text-[#D4AF37]" strokeWidth={1.75} />
                          <div className="text-center">
                            <p className="text-xs font-semibold text-zinc-100">{text}</p>
                            <p className="text-[10px] text-zinc-500">{sub}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </details>
                </div>
                <div>
                  <p className="text-[10px] font-semibold tracking-[0.2em] uppercase text-[#D4AF37] mb-3">
                    Monthly Rate
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: "Small",       sub: "Compact",   price: 150 },
                      { label: "Medium",      sub: "Sedan",    price: 160 },
                      { label: "Large",       sub: "SUV/Truck", price: 170 },
                      { label: "Extra Large", sub: "Van/3-Row", price: 180 },
                    ].map(({ label, sub, price }) => (
                      <div
                        key={label}
                        className="bg-zinc-950 rounded-lg p-3 border border-white/5 text-center transition-all duration-300 hover:border-[#D4AF37]/30"
                      >
                        <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">{label}</p>
                        <p className="text-lg font-black bg-gradient-to-r from-[#D4AF37] via-[#F3E5AB] to-[#D4AF37] bg-clip-text text-transparent tabular-nums">
                          ${price}
                        </p>
                        <p className="text-[9px] text-zinc-600">/mo</p>
                        <p className="text-[9px] text-zinc-500 truncate">{sub}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="border-t border-white/[0.06] pt-5 flex flex-col items-center gap-1 w-full">
                <button
                  type="button"
                  onClick={() => monthlyPlanService && openBooking(monthlyPlanService)}
                  disabled={!monthlyPlanService}
                  className="btn-primary-gold-shimmer w-full md:w-auto justify-center inline-flex items-center gap-2 rounded-xl bg-zinc-900/80 backdrop-blur-sm border border-[#D4AF37]/50 text-[#D4AF37] px-8 py-3 text-sm font-bold hover:text-black hover:shadow-[0_0_28px_rgba(212,175,55,0.35)] hover:scale-[1.03] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 transition-all duration-500 ease-in-out"
                >
                  <span className="relative z-[1] inline-flex items-center gap-2">
                    <Crown size={16} className="shrink-0" />
                    Join the Club
                  </span>
                </button>
                <p className="text-[10px] text-zinc-600">No contracts · $100 setup applies</p>
              </div>
              {/* Inline booking dropdown (Maintenance Club — starts with Maintenance Plan selected) — client-only */}
              {mounted && (
                <div className="w-full mt-4">
                  <BookingSection
                    isVisible={expandedBookingId === "club"}
                    onClose={() => setExpandedBookingId(null)}
                    selectedService={expandedBookingId === "club" ? selectedService : null}
                    services={services}
                    onSelectService={setSelectedService}
                    onBookingSuccess={handleBookingSuccess}
                    initialRewardPoints={authRewardPoints}
                    initialLifetimePoints={authLifetimePoints}
                  />
                </div>
              )}
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      {/* ─── Loyalty Tiers — 3D Growth Lineup: Bronze → Silver → Gold → Diamond (Arise And Shine VT) ───────── */}
      <motion.section
        id="loyalty-tiers"
        initial="hidden"
        whileInView="visible"
        viewport={sectionViewport}
        variants={sectionVariants}
        className="py-12 md:py-16 px-4 border-t border-white/[0.06]"
      >
        <div className="max-w-6xl mx-auto">
          {/* Branding + title */}
          <div className="text-center mb-6 md:mb-8">
            <p className="text-xs font-semibold tracking-[0.2em] uppercase text-[#D4AF37] mb-2">
              Arise And Shine VT
            </p>
            <h2
              className="text-2xl md:text-4xl font-black tracking-tight text-white"
              style={{ filter: "drop-shadow(0 2px 12px rgba(0,0,0,0.3))" }}
            >
              Loyalty Tiers
            </h2>
            <p className="mt-3 text-sm text-zinc-400 max-w-xl mx-auto">
              How it works: Earn 1 point for every $1 spent. Redeem for discounts on future details.
            </p>
          </div>

          {/* Growth Lineup: 6-sided bullion bars (Tiny→Big) + volumetric Diamond; tilted stage; contact shadow per object; engraved text. */}
          <div className="tier-lineup-stage relative flex flex-col-reverse sm:flex-row items-end justify-center gap-3 sm:gap-4 md:gap-5 min-h-[320px] sm:min-h-0 mt-10 md:mt-16 pb-8 sm:pb-20 -mb-24 md:mb-0 overflow-visible">
            <div className="tier-lineup-tilted relative z-10 flex flex-col-reverse sm:flex-row items-end justify-center gap-3 sm:gap-4 md:gap-5 w-full max-w-5xl mx-auto px-1 sm:px-0 scale-[0.85] md:scale-100 origin-top">
              {/* Bronze — 20-layer Z-stack (rounded corners) + diagonal-seam gradient on stack */}
              <div className="tier-lineup-card relative w-full sm:w-[140px] md:w-[160px] flex flex-col items-center sm:staircase-0">
                <div aria-hidden className="tier-contact-shadow" />
                <div className="tier-float-container tier-float-bronze w-full">
                <div className="tier-solid-bar-box w-full relative z-[1]" style={{ height: "60px" }}>
                  {Array.from({ length: 20 }, (_, i) => (
                    <div key={i} className="tier-bar-extrusion-layer tier-bar-extrusion-bronze" style={{ transform: `translateZ(-${i + 1}px)${i % 2 === 0 ? ' scale(0.995)' : ''}` }} aria-hidden />
                  ))}
                  <div className="tier-solid-bar-top tier-solid-bar-top-bronze" aria-hidden />
                  <div className="tier-solid-bar-front tier-solid-bar-front-bronze px-3 py-2">
                    <p className="tier-front-engraved text-[9px] font-bold tracking-wider uppercase leading-tight">Bronze</p>
                    <p className="tier-front-engraved text-[10px] mt-0.5">500–999 pts</p>
                    <p className="tier-front-engraved text-[10px] mt-1">5% off</p>
                  </div>
                </div>
                </div>
              </div>

              {/* Silver — 20-layer Z-stack (rounded corners) + diagonal-seam gradient on stack */}
              <div className="tier-lineup-card relative w-full sm:w-[160px] md:w-[180px] flex flex-col items-center sm:staircase-1">
                <div aria-hidden className="tier-contact-shadow" />
                <div className="tier-float-container tier-float-silver w-full">
                <div className="tier-solid-bar-box w-full relative z-[1]" style={{ height: "90px" }}>
                  {Array.from({ length: 20 }, (_, i) => (
                    <div key={i} className="tier-bar-extrusion-layer tier-bar-extrusion-silver" style={{ transform: `translateZ(-${i + 1}px)${i % 2 === 0 ? ' scale(0.995)' : ''}` }} aria-hidden />
                  ))}
                  <div className="tier-solid-bar-top tier-solid-bar-top-silver" aria-hidden />
                  <div className="tier-solid-bar-front tier-solid-bar-front-silver px-3 py-2">
                    <p className="tier-front-engraved text-[9px] font-bold tracking-wider uppercase">Silver</p>
                    <p className="tier-front-engraved text-[10px] mt-0.5">1,000–1,499 pts</p>
                    <p className="tier-front-engraved text-[10px] mt-1">10% off · Priority</p>
                  </div>
                </div>
                </div>
              </div>

              {/* Gold — 20-layer Z-stack (rounded corners) + diagonal-seam gradient on stack */}
              <div className="tier-lineup-card relative w-full sm:w-[180px] md:w-[200px] flex flex-col items-center sm:staircase-2">
                <div aria-hidden className="tier-contact-shadow" />
                <div className="tier-float-container tier-float-gold w-full">
                <div className="tier-solid-bar-box w-full relative z-[1]" style={{ height: "120px" }}>
                  {Array.from({ length: 20 }, (_, i) => (
                    <div key={i} className="tier-bar-extrusion-layer tier-bar-extrusion-gold" style={{ transform: `translateZ(-${i + 1}px)${i % 2 === 0 ? ' scale(0.995)' : ''}` }} aria-hidden />
                  ))}
                  <div className="tier-solid-bar-top tier-solid-bar-top-gold" aria-hidden />
                  <div className="tier-solid-bar-front tier-solid-bar-front-gold px-3 py-3">
                    <p className="tier-front-engraved text-[10px] font-bold tracking-wider uppercase">Gold</p>
                    <p className="tier-front-engraved text-[11px] mt-0.5">1,500–1,999 pts</p>
                    <p className="tier-front-engraved text-[10px] mt-1.5">15% off · Priority · Discounted add-ons</p>
                  </div>
                </div>
                </div>
              </div>

              {/* Diamond — 20-layer Z-stack (rounded corners) + diagonal-seam gradient on stack */}
              <div className="tier-lineup-card tier-lineup-card-diamond relative w-full sm:w-[220px] md:w-[240px] flex flex-col items-center sm:staircase-3">
                <div aria-hidden className="tier-contact-shadow tier-contact-shadow-diamond" />
                <div className="tier-float-container tier-float-diamond w-full">
                <div className="tier-solid-bar-box tier-diamond-bar-box w-full relative z-[1]" style={{ height: "140px" }}>
                  {Array.from({ length: 20 }, (_, i) => (
                    <div key={i} className="tier-diamond-extrusion-layer" style={{ transform: `translateZ(-${i + 1}px)${i % 2 === 0 ? ' scale(0.995)' : ''}` }} aria-hidden />
                  ))}
                  <div className="tier-solid-bar-top tier-solid-bar-top-diamond" aria-hidden />
                  <div className="tier-solid-bar-front tier-solid-bar-front-diamond px-3 py-3">
                    <p className="tier-front-engraved text-[10px] font-bold tracking-wider uppercase">Diamond</p>
                    <p className="tier-front-engraved text-[11px] mt-0.5">2,000+ pts</p>
                    <p className="tier-front-engraved text-[10px] mt-1.5">20% off · VIP · Platinum</p>
                  </div>
                </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      {/* ─── Trust Banner (Our Promise) — 2x2 grid ─────────────────── */}
      <section id="why-us" className="border-t border-white/[0.06] bg-zinc-900/30 py-8 md:py-10 px-4">
        <div className="grid grid-cols-2 gap-3 md:gap-6 w-full max-w-2xl mx-auto mt-8 mb-12 px-4">
          {[
            { icon: Car,       title: "We Come To You",     desc: "Fully mobile — at home or work." },
            { icon: Shield,    title: "100% Satisfaction", desc: "We make it right, no questions asked." },
            { icon: Star,      title: "Premium Products",   desc: "Pro-grade coatings & polishes." },
            { icon: Sparkles,  title: "Loyalty Rewards",    desc: "Earn points on every booking." },
          ].map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="flex flex-col items-center text-center p-4 md:p-6 bg-zinc-900/40 backdrop-blur-sm border border-white/5 rounded-2xl hover:bg-zinc-800/50 transition-colors"
            >
              <Icon className="w-5 h-5 md:w-6 md:h-6 text-[#D4AF37] mb-3 shrink-0" strokeWidth={1.75} />
              <p className="text-xs md:text-sm font-semibold text-zinc-100 mb-1">{title}</p>
              <p className="text-[10px] md:text-xs text-zinc-500 leading-tight">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Services ───────────────────────────────────────────── */}
      <motion.section
        id="services"
        initial="hidden"
        whileInView="visible"
        viewport={sectionViewport}
        variants={sectionVariants}
        className="py-16 md:py-24 px-6"
      >
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10 md:mb-16">
            <p className="text-sm font-semibold tracking-[0.2em] uppercase text-[#D4AF37] mb-3">
              What We Offer
            </p>
            <h2
              className="text-3xl md:text-5xl font-black tracking-tight bg-gradient-to-r from-[#D4AF37] via-[#F3E5AB] to-[#D4AF37] bg-clip-text text-transparent"
              style={{ filter: "drop-shadow(0 2px 16px rgba(212,175,55,0.2))" }}
            >
              Our Services
            </h2>
          </div>

          {mainGridServices.length === 0 ? (
            <div className="text-center py-24 text-zinc-600">
              <Car size={40} className="mx-auto mb-4 opacity-30" />
              <p className="text-sm">Services coming soon — check back shortly.</p>
            </div>
          ) : (
            <div className="flex flex-col items-center max-w-7xl mx-auto">
              {/* Pill navigation */}
              <div className="bg-zinc-900/50 p-1.5 rounded-full inline-flex gap-1 border border-white/5 mb-8">
                {mainGridServices.map((service) => {
                  const isActive = activeServiceId === service.id;
                  const label = service.name === "Full Detail" ? "Full Detail" : service.name.replace(" Detail", "");
                  return (
                    <button
                      key={service.id}
                      type="button"
                      onClick={() => setActiveServiceId(service.id)}
                      className={
                        isActive
                          ? "bg-zinc-800 text-[#D4AF37] shadow-lg rounded-full px-6 py-2 text-sm font-semibold transition-all"
                          : "text-zinc-400 hover:text-zinc-200 px-6 py-2 text-sm font-medium transition-all rounded-full"
                      }
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
              {/* Single card with fade-in */}
              <motion.div
                key={activeServiceId}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-[450px] mx-auto flex justify-center"
              >
                {activeService && (
                  <ServiceCard
                    service={activeService}
                    onBook={() => openBooking(activeService)}
                  />
                )}
              </motion.div>
              {/* Inline booking dropdown (Services — starts with selected service) — client-only */}
              {mounted && (
                <div className="w-full max-w-[450px] mx-auto mt-4">
                  <BookingSection
                    isVisible={expandedBookingId === "services"}
                    onClose={() => setExpandedBookingId(null)}
                    selectedService={expandedBookingId === "services" ? selectedService : null}
                    services={services}
                    onSelectService={setSelectedService}
                    onBookingSuccess={handleBookingSuccess}
                    initialRewardPoints={authRewardPoints}
                    initialLifetimePoints={authLifetimePoints}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </motion.section>

      {/* ─── Testimonials Carousel ───────────────────────────────── */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={sectionViewport}
        variants={sectionVariants}
        className="py-16 md:py-24 px-4 border-t border-white/[0.06]"
      >
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-sm font-semibold tracking-widest uppercase text-[#D4AF37] mb-2">
              Client Experiences
            </p>
            <h2
              className="text-3xl md:text-5xl font-bold tracking-tight bg-gradient-to-r from-[#D4AF37] via-[#F3E5AB] to-[#D4AF37] bg-clip-text text-transparent"
              style={{ filter: "drop-shadow(0 2px 20px rgba(212,175,55,0.2))" }}
            >
              What Vermonters Are Saying.
            </h2>
          </div>

          <div
            ref={scrollRef}
            className="flex overflow-x-auto snap-x snap-mandatory scroll-smooth gap-6 pb-8 pt-4 px-4 md:px-12 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
            onMouseEnter={() => {
              if (reviewIntervalRef.current) {
                clearInterval(reviewIntervalRef.current);
                reviewIntervalRef.current = null;
              }
            }}
            onTouchStart={() => {
              if (reviewIntervalRef.current) {
                clearInterval(reviewIntervalRef.current);
                reviewIntervalRef.current = null;
              }
            }}
            onScroll={() => {
              if (reviewIntervalRef.current) {
                clearInterval(reviewIntervalRef.current);
                reviewIntervalRef.current = null;
              }
              const el = scrollRef.current;
              if (el) {
                const cardWidth = (cardRefs.current[0]?.offsetWidth ?? el.offsetWidth) + 24;
                const index = Math.min(
                  REVIEWS.length - 1,
                  Math.round(el.scrollLeft / cardWidth)
                );
                setCurrentReviewIndex(index);
              }
            }}
          >
            {REVIEWS.map((r, i) => (
              <div
                key={`${r.name}-${i}`}
                ref={(el) => { cardRefs.current[i] = el; }}
                className="flex-shrink-0 snap-center w-[85vw] md:w-[600px] bg-zinc-900/40 backdrop-blur-md border border-white/5 rounded-2xl p-8 flex flex-col"
              >
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <Star
                      key={j}
                      size={14}
                      className="text-[#D4AF37] fill-[#D4AF37]"
                      strokeWidth={0}
                    />
                  ))}
                </div>
                <p className="text-zinc-400 text-sm md:text-base leading-relaxed mt-4 mb-6 flex-1">
                  &ldquo;{r.review}&rdquo;
                </p>
                <div>
                  <p className="text-zinc-100 font-semibold text-sm">
                    {r.name}{" "}
                    <span className="text-zinc-500 font-normal">— {r.location}</span>
                  </p>
                  <p className="text-zinc-500 text-xs mt-0.5">{r.service}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination dots */}
          <div className="flex items-center justify-center gap-2 mt-2">
            {REVIEWS.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  cardRefs.current[i]?.scrollIntoView({
                    behavior: "smooth",
                    inline: "center",
                    block: "nearest",
                  });
                }}
                aria-label={`Go to review ${i + 1}`}
                className={`rounded-full transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37]/50 ${
                  i === currentReviewIndex
                    ? "w-6 h-2 bg-[#D4AF37]"
                    : "w-2 h-2 bg-zinc-700 hover:bg-zinc-600"
                }`}
              />
            ))}
          </div>
        </div>
      </motion.section>

      {/* ─── Frequently Asked Questions ───────────────────────── */}
      <section className="py-16 md:py-24 px-4">
        <h2 className="text-3xl md:text-5xl font-bold text-white mb-10 text-center">
          Frequently Asked Questions.
        </h2>
        <div className="max-w-3xl mx-auto space-y-4 px-4">
          <details className="bg-zinc-900/30 border border-white/5 rounded-xl overflow-hidden transition-all duration-300 group">
            <summary className="cursor-pointer p-6 flex justify-between items-center text-zinc-100 font-medium hover:text-[#D4AF37] outline-none list-none text-base md:text-lg">
              Do I need to provide water or power?
              <ChevronDown className="w-5 h-5 shrink-0 transition-transform duration-200 group-open:rotate-180" />
            </summary>
            <p className="text-zinc-400 text-sm md:text-base px-6 pb-6 leading-relaxed">
              No, our mobile units are fully equipped with spot-free water and quiet generators. We can detail your vehicle anywhere, from your office parking lot to your home driveway.
            </p>
          </details>
          <details className="bg-zinc-900/30 border border-white/5 rounded-xl overflow-hidden transition-all duration-300 group">
            <summary className="cursor-pointer p-6 flex justify-between items-center text-zinc-100 font-medium hover:text-[#D4AF37] outline-none list-none text-base md:text-lg">
              How long does a Full Detail take?
              <ChevronDown className="w-5 h-5 shrink-0 transition-transform duration-200 group-open:rotate-180" />
            </summary>
            <p className="text-zinc-400 text-sm md:text-base px-6 pb-6 leading-relaxed">
              A Full Detail typically takes between 3 to 5 hours depending on the size and condition of your vehicle. We never rush perfection.
            </p>
          </details>
          <details className="bg-zinc-900/30 border border-white/5 rounded-xl overflow-hidden transition-all duration-300 group">
            <summary className="cursor-pointer p-6 flex justify-between items-center text-zinc-100 font-medium hover:text-[#D4AF37] outline-none list-none text-base md:text-lg">
              Do I need to be present for the detail?
              <ChevronDown className="w-5 h-5 shrink-0 transition-transform duration-200 group-open:rotate-180" />
            </summary>
            <p className="text-zinc-400 text-sm md:text-base px-6 pb-6 leading-relaxed">
              Not at all! As long as we have the keys and access to the vehicle, you can work or relax. We will send you a text when your car is pristine.
            </p>
          </details>
          <details className="bg-zinc-900/30 border border-white/5 rounded-xl overflow-hidden transition-all duration-300 group">
            <summary className="cursor-pointer p-6 flex justify-between items-center text-zinc-100 font-medium hover:text-[#D4AF37] outline-none list-none text-base md:text-lg">
              What if it rains on my appointment day?
              <ChevronDown className="w-5 h-5 shrink-0 transition-transform duration-200 group-open:rotate-180" />
            </summary>
            <p className="text-zinc-400 text-sm md:text-base px-6 pb-6 leading-relaxed">
              If you have a garage we can work inside, we will proceed! If not, we will happily reschedule you to our next available clear day with priority placement.
            </p>
          </details>
        </div>
      </section>

      {/* ─── CTA Banner ─────────────────────────────────────────── */}
      <section className="py-16 md:py-24 px-6">
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
      </section>

      {/* ─── Areas We Serve (SEO) ───────────────────────────────── */}
      <div className="w-full border-t border-[#D4AF37]/25 bg-[#09090b] py-10 md:py-12 px-4">
        <div className="max-w-4xl mx-auto flex flex-col items-center text-center gap-4">
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
        className="border-t border-white/[0.06] py-12 px-6 bg-zinc-950/50"
      >
        <div className="max-w-5xl mx-auto space-y-6">
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

          {/* Legal links row */}
          <div className="flex items-center justify-center gap-6 pt-2 border-t border-white/[0.04]">
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
          isPastHero
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
            <strong className="text-zinc-200">$100 Deep Clean &amp; Reset Detail</strong>{" "}
            before the recurring monthly service begins. This fee is{" "}
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
    </div>
  );
}

// ─── Service inclusions data ───────────────────────────────────────────────────

const EXTERIOR_ITEMS = [
  "Hand wash & dry",
  "Wheel faces & barrel cleaning",
  "Tire dressing",
  "Bug & tar spot removal",
  "Streak-free exterior glass",
  "High-quality spray wax finish",
];

const INTERIOR_ITEMS = [
  "Thorough vacuuming (seats, carpets, mats)",
  "Complete dash & console wipe-down",
  "Interior glass cleaning",
  "Door jamb wipe-down",
  "Light spot-treatment for stains",
];

const SERVICE_INCLUSIONS: Record<string, string[]> = {
  "Exterior Detail": EXTERIOR_ITEMS,
  "Interior Detail": INTERIOR_ITEMS,
  "Full Detail": [...EXTERIOR_ITEMS, ...INTERIOR_ITEMS],
};

// ─── Service Card ──────────────────────────────────────────────────────────────

function ServiceCard({
  service,
  onBook,
}: {
  service: Service;
  onBook: () => void;
}) {
  const samePrice = service.price_small === service.price_extra_large;
  const priceDisplay = samePrice
    ? `$${service.price_small}`
    : `$${service.price_small} – $${service.price_extra_large}`;

  const inclusions = SERVICE_INCLUSIONS[service.name] ?? [];

  return (
    <div className="group relative bg-zinc-900/40 backdrop-blur-md border border-white/5 rounded-2xl p-6 md:p-10 flex flex-col h-full transition-all duration-300 hover:-translate-y-1 hover:border-[#D4AF37]/30 hover:shadow-[0_8px_30px_rgb(0,0,0,0.5)]">
      {/* Service name */}
      <div className="mb-5">
        <h3 className="text-xl font-bold text-zinc-100 leading-snug">
          {service.name}
        </h3>
        {service.is_subscription && (
          <span className="text-[10px] text-[#D4AF37]/70 font-semibold uppercase tracking-widest mt-1 block">
            Subscription
          </span>
        )}
      </div>

      {/* Price — Champagne Gold gradient */}
      <div className="mb-1">
        <span className="text-3xl font-bold bg-gradient-to-r from-[#D4AF37] via-[#F3E5AB] to-[#D4AF37] bg-clip-text text-transparent tabular-nums">
          {priceDisplay}
        </span>
      </div>
      {!samePrice && (
        <p className="text-sm text-zinc-500 mt-1 mb-5">by vehicle size</p>
      )}
      {samePrice && <div className="mb-5" />}

      {/* Description */}
      {service.description && (
        <p className="text-sm text-zinc-400 leading-relaxed mb-6">
          {service.description}
        </p>
      )}

      {/* Reward points badge */}
      <div className="inline-flex items-center gap-2 bg-[#D4AF37]/10 border border-[#D4AF37]/20 text-[#D4AF37] text-xs font-medium px-4 py-1.5 rounded-full mb-6 w-fit">
        <Sparkles size={11} className="shrink-0" />
        Earn {service.price_small}–{service.price_extra_large} Reward Points
      </div>

      {/* What's Included dropdown */}
      {inclusions.length > 0 && (
        <details className="group/details mb-6 mt-auto">
          <summary className="list-none [&::-webkit-details-marker]:hidden flex items-center justify-between border-t border-white/5 pt-4 pb-0.5 cursor-pointer text-sm font-medium text-zinc-400 hover:text-[#D4AF37] outline-none transition-colors duration-200 select-none">
            What&apos;s Included
            <ChevronDown
              size={15}
              className="shrink-0 transition-transform duration-300 group-open/details:rotate-180"
            />
          </summary>
          <ul className="mt-4 space-y-2 ml-1">
            {inclusions.map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-sm text-zinc-400">
                <span className="mt-[3px] w-3.5 h-3.5 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/30 flex items-center justify-center shrink-0">
                  <span className="w-1 h-1 rounded-full bg-[#D4AF37]" />
                </span>
                {item}
              </li>
            ))}
          </ul>
        </details>
      )}
      {inclusions.length === 0 && <div className="mt-auto" />}

      {/* CTA — Obsidian & Gold */}
      <button
        onClick={onBook}
        className="btn-primary-gold-shimmer w-full bg-zinc-950 border border-[#D4AF37]/50 text-[#D4AF37] py-3 rounded-lg font-semibold flex justify-center items-center gap-2 hover:text-black hover:shadow-[0_0_20px_rgba(212,175,55,0.3)] hover:scale-[1.03] active:scale-[0.98] transition-all duration-500 ease-in-out"
      >
        <span className="relative z-[1] flex items-center justify-center gap-2">
          Book This Service
          <Sparkles size={13} className="shrink-0" />
        </span>
      </button>
    </div>
  );
}
