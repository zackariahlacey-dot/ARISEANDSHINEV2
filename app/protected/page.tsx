import { redirect } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import { ArrowLeft, Gift, Star, Crown, ChevronRight, Calendar, Car, MapPin, RotateCcw } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getAuthProfile } from "@/app/actions/getAuthProfile";
import { getRecentPointTransactions } from "@/app/actions/getRecentPointTransactions";
import { ensureReferralCode } from "@/app/actions/createProfileWithReferral";
import { ReferAndEarnCard } from "@/components/landing/ReferAndEarnCard";
import { XpHistoryCard } from "@/components/dashboard/XpHistoryCard";
import { getClientBookings, type ClientBooking } from "@/app/actions/getClientBookings";

function formatBookingDate(d: string) {
  try {
    return new Date(d + "T12:00:00").toLocaleDateString("en-US", {
      weekday: "short", month: "short", day: "numeric", year: "numeric",
    });
  } catch { return d; }
}

function formatBookingTime(t: string | null) {
  if (!t) return null;
  try {
    const [h, m] = t.split(":");
    const hour = parseInt(h, 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    return `${hour % 12 || 12}:${m} ${ampm}`;
  } catch { return t; }
}

function buildRebookDraft(b: ClientBooking) {
  return {
    serviceId: "",
    vehicleSize: "sedan" as const,
    vehicleYear: b.vehicle_year ?? "",
    vehicleMake: b.vehicle_make ?? "",
    vehicleModel: b.vehicle_model ?? "",
    selectedDate: "",
    selectedTime: "",
    serviceAddress: b.service_address ?? "",
    name: "", phone: "", email: "", notes: "",
    travelFee: 0, distanceMiles: null,
    couponCode: "", appliedCoupon: null,
    pointsToRedeemInput: 0,
  };
}

function BookingCard({ b, showRebook }: { b: ClientBooking; showRebook?: boolean }) {
  const today = new Date().toISOString().split("T")[0];
  const isUpcoming = b.booking_date >= today;
  const vehicleLabel = [b.vehicle_year, b.vehicle_make, b.vehicle_model].filter(Boolean).join(" ");

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-zinc-900/60 p-4 space-y-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-bold text-zinc-100 truncate text-sm">{b.service_name ?? "Detailing Service"}</p>
          {vehicleLabel && <p className="text-xs text-zinc-500 truncate mt-0.5">{vehicleLabel}</p>}
        </div>
        <div className="shrink-0 text-right">
          <p className="text-sm font-black text-[#D4AF37]">${b.total_price.toFixed(0)}</p>
          {isUpcoming && (
            <span className="text-[8px] font-bold uppercase tracking-wider bg-sky-500/10 text-sky-400 px-1.5 py-0.5 rounded">
              Upcoming
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-zinc-500">
        <span className="flex items-center gap-1">
          <Calendar size={10} />
          {formatBookingDate(b.booking_date)}
          {b.booking_time ? ` · ${formatBookingTime(b.booking_time.slice(0, 5))}` : ""}
        </span>
        {b.service_address && (
          <span className="flex items-center gap-1 truncate max-w-[200px]">
            <MapPin size={10} className="shrink-0" />{b.service_address}
          </span>
        )}
      </div>

      {showRebook && (
        <form
          action="/"
          method="get"
          onSubmit={(e) => {
            e.preventDefault();
            const draft = buildRebookDraft(b);
            try { sessionStorage.setItem("draftBooking", JSON.stringify(draft)); } catch {}
            window.location.href = "/?restore_booking=1";
          }}
        >
          <button
            type="submit"
            className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-[#D4AF37] transition-colors"
          >
            <RotateCcw size={11} /> Rebook this service
          </button>
        </form>
      )}
    </div>
  );
}

async function Dashboard() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login?redirect=/protected");

  const profile = await getAuthProfile();
  const currentPoints = profile?.current_points ?? 0;
  const lifetimePoints = profile?.lifetime_points ?? 0;
  const emailHandle = user.email?.split("@")[0] ?? "there";

  // Display profile.referral_code from DB; for legacy accounts with null/empty, generate once and persist via ensureReferralCode
  const referralCode =
    profile?.referralCode ?? (await ensureReferralCode(user.id));

  const transactions = await getRecentPointTransactions(user.id);
  const dollarValue = (currentPoints / 10).toFixed(2);
  const { upcoming, past } = await getClientBookings(user.id);

  return (
    <div className="relative min-h-screen bg-zinc-950 overflow-hidden">
      {/* Background gold glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px]"
        style={{
          background:
            "radial-gradient(ellipse at 50% 0%, rgba(212,175,55,0.07) 0%, transparent 65%)",
        }}
      />

      {/* SVG noise overlay */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-[1]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          backgroundRepeat: "repeat",
          backgroundSize: "256px 256px",
          opacity: 0.03,
          mixBlendMode: "overlay",
        }}
      />

      <div className="relative z-10 max-w-2xl mx-auto px-4 py-10 pb-20">
        {/* Back link */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-300 transition-colors mb-10 group"
        >
          <ArrowLeft
            size={14}
            className="group-hover:-translate-x-0.5 transition-transform"
          />
          Back to Home
        </Link>

        {/* Page heading */}
        <div className="mb-8">
          <p className="text-xs font-semibold tracking-[0.2em] uppercase text-[#D4AF37] mb-1.5">
            My Account
          </p>
          <h1 className="text-3xl font-black tracking-tight text-zinc-100">
            Hello, {emailHandle}!
          </h1>
          <p className="text-sm text-zinc-500 mt-1">{user.email}</p>
        </div>

        {/* ── Loyalty Points Card ──────────────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-zinc-900/80 backdrop-blur-sm p-6 md:p-8 mb-5">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-12 -right-12 w-40 h-40 rounded-full"
            style={{
              background:
                "radial-gradient(circle, rgba(212,175,55,0.1) 0%, transparent 70%)",
            }}
          />
          <div className="flex items-start justify-between gap-4 mb-5">
            <div>
              <p className="text-xs font-semibold tracking-[0.18em] uppercase text-[#D4AF37] mb-1">
                Loyalty Rewards
              </p>
              <div className="flex flex-wrap items-baseline gap-2">
                <span
                  className="text-5xl font-black bg-gradient-to-r from-[#D4AF37] via-[#F3E5AB] to-[#D4AF37] bg-clip-text text-transparent"
                  style={{
                    filter: "drop-shadow(0 2px 16px rgba(212,175,55,0.3))",
                  }}
                >
                  {currentPoints.toLocaleString()}
                </span>
                <span className="text-lg font-semibold text-zinc-400">pts</span>
              </div>
              <p className="text-sm text-zinc-500 mt-1">
                <span className="text-zinc-400">Available Points</span> ={" "}
                <span className="text-zinc-300 font-medium">${dollarValue}</span>{" "}
                off your next booking
              </p>
              <p className="text-xs text-zinc-600 mt-0.5">
                Lifetime: {lifetimePoints.toLocaleString()} pts
              </p>
            </div>
            <div className="shrink-0 w-12 h-12 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/20 flex items-center justify-center">
              <Gift size={22} className="text-[#D4AF37]" />
            </div>
          </div>

          {/* Simple Info — 2-column grid */}
          <div className="mt-5 pt-5 border-t border-white/[0.06]">
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-xs text-zinc-500">
              <li className="flex items-start gap-2">
                <Star size={11} className="text-[#D4AF37] shrink-0 mt-0.5" />
                <span>Earn 1 pt per $1 spent on services.</span>
              </li>
              <li className="flex items-start gap-2">
                <Star size={11} className="text-[#D4AF37] shrink-0 mt-0.5" />
                <span>Redeem points for discounts (10 pts = $1).</span>
              </li>
              <li className="flex items-start gap-2">
                <Star size={11} className="text-[#D4AF37] shrink-0 mt-0.5" />
                <span>Redeem up to 1,000 pts ($100 off) per booking.</span>
              </li>
              <li className="flex items-start gap-2">
                <Star size={11} className="text-[#D4AF37] shrink-0 mt-0.5" />
                <span>Points never expire for active accounts.</span>
              </li>
            </ul>
          </div>
        </div>


        {/* ── Upcoming Appointments ───────────────────────────────────────── */}
        {upcoming.length > 0 && (
          <div className="mb-5">
            <p className="text-xs font-semibold tracking-[0.18em] uppercase text-[#D4AF37] mb-3">
              Upcoming ({upcoming.length})
            </p>
            <div className="space-y-3">
              {upcoming.map((b) => (
                <BookingCard key={b.id} b={b} />
              ))}
            </div>
          </div>
        )}

        {/* ── Past Appointments ─────────────────────────────────────────────── */}
        {past.length > 0 && (
          <div className="mb-5">
            <p className="text-xs font-semibold tracking-[0.18em] uppercase text-zinc-600 mb-3">
              Past appointments
            </p>
            <div className="space-y-3">
              {past.slice(0, 5).map((b) => (
                <BookingCard key={b.id} b={b} showRebook />
              ))}
            </div>
          </div>
        )}

        {upcoming.length === 0 && past.length === 0 && (
          <div className="mb-5 rounded-2xl border border-dashed border-white/[0.06] p-6 text-center">
            <p className="text-sm text-zinc-600">No appointments yet.</p>
            <Link
              href="/#services"
              className="mt-2 inline-block text-sm text-[#D4AF37] hover:underline"
            >
              Book your first detail →
            </Link>
          </div>
        )}

        {/* ── XP History Ledger ─────────────────────────────────────────────── */}
        <XpHistoryCard transactions={transactions} />

        {/* ── Refer & Earn Card ────────────────────────────────────────────── */}
        <ReferAndEarnCard referralCode={referralCode} />

        {/* ── Maintenance Club CTA ─────────────────────────────────────────── */}
        <Link
          href="/maintenance-club"
          className="group relative mt-5 flex items-center gap-4 rounded-2xl border border-[#D4AF37]/20 bg-zinc-900/60 backdrop-blur-sm p-5 transition-all duration-200 hover:border-[#D4AF37]/40 hover:bg-zinc-900/80"
        >
          <div className="shrink-0 w-11 h-11 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/20 flex items-center justify-center">
            <Crown size={20} className="text-[#D4AF37]" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold tracking-[0.16em] uppercase text-[#D4AF37] mb-0.5">
              Member Exclusive
            </p>
            <p className="text-sm font-bold text-zinc-100">Maintenance Club</p>
            <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">
              Monthly plans starting at $89/mo — keep your vehicle in showroom condition year-round.
            </p>
          </div>
          <ChevronRight size={16} className="text-zinc-600 shrink-0 group-hover:text-[#D4AF37] transition-colors" />
        </Link>

        {/* Back to book CTA */}
        <div className="mt-6 text-center">
          <Link
            href="/#services"
            className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-[#D4AF37] transition-colors"
          >
            Browse services &amp; book →
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function ProtectedPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-[#D4AF37]/30 border-t-[#D4AF37] animate-spin" />
        </div>
      }
    >
      <Dashboard />
    </Suspense>
  );
}
