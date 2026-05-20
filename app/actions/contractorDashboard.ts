"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { DEFAULT_TIER_LADDER } from "@/lib/contractorAgreement";

export type ContractorJob = {
  bookingId: string;
  date: string;             // YYYY-MM-DD
  time: string;             // "9:00 AM"
  serviceName: string;
  customerName: string;
  customerPhone: string | null;
  serviceAddress: string;
  vehicleYear: string;
  vehicleMake: string;
  vehicleModel: string;
  vehicleSize: string;
  totalPrice: number;
  addons: Array<{ id: string; label: string; price: number }>;
  hasAdditionalVehicles: boolean;
  // Lifecycle stamps — null until contractor acts
  acceptedAt: string | null;
  onMyWayAt: string | null;
  arrivedAt: string | null;
  startedAt: string | null;
  jobCompletedAt: string | null;
  photoReviewStatus: string;  // pending | approved | rejected
  // Estimated commission for display only
  estimatedCommissionCents: number;
};

export type ContractorDashboardData = {
  profile: {
    id: string;
    firstName: string;
    employmentStatus: string;
    commissionTier: number;
    commissionPct: number;
    dailyJobCap: number;
    ratingOverallAvg: number | null;
    ratingCount: number;
    completedJobsCount: number;
  };
  todayJobs: ContractorJob[];
  tomorrowJobs: ContractorJob[];
  upcomingThisWeek: ContractorJob[];   // beyond tomorrow, within next 7 days
  weekStats: {
    jobsCompleted: number;
    estimatedEarnings: number;          // sum of commission % of completed bookings this week
    tipsReceived: number;
    weekStart: string;                  // YYYY-MM-DD (Monday)
    weekEnd: string;                    // YYYY-MM-DD (Sunday)
  };
  tierProgress: {
    currentTier: number;
    currentPct: number;
    nextTier: number | null;
    nextTierPct: number | null;
    jobsToNextTier: number | null;
    ratingNeededForNext: number | null;
    eligibleForNext: boolean;           // earned the criteria; admin still must promote
  };
};

/** Convert "10:00:00" / "10:00" → "10:00 AM". */
function to12h(time24: string | null): string {
  if (!time24) return "";
  const [hStr, mStr] = time24.split(":");
  const h = parseInt(hStr, 10);
  if (isNaN(h)) return time24;
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${mStr ?? "00"} ${period}`;
}

function startOfWeek(d: Date): Date {
  // Monday-start week, local time
  const out = new Date(d);
  const day = out.getDay();                   // 0=Sun..6=Sat
  const diff = (day === 0 ? -6 : 1 - day);    // shift Sunday to previous Monday
  out.setDate(out.getDate() + diff);
  out.setHours(0, 0, 0, 0);
  return out;
}

function fmtLocalDate(d: Date): string {
  return d.toLocaleDateString("en-CA");        // YYYY-MM-DD in local
}

export async function getContractorDashboard(): Promise<ContractorDashboardData | null> {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return null;

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("id, first_name, role, employment_status, commission_tier, commission_pct, daily_job_cap, rating_overall_avg, rating_count, completed_jobs_count")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile || (profile as any).role !== "contractor") return null;

  const now = new Date();
  const todayStr = fmtLocalDate(now);
  const tomorrow = new Date(now); tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = fmtLocalDate(tomorrow);
  const weekStart = startOfWeek(now);
  const weekStartStr = fmtLocalDate(weekStart);
  const weekEnd = new Date(weekStart); weekEnd.setDate(weekEnd.getDate() + 6);
  const weekEndStr = fmtLocalDate(weekEnd);
  const next7End = new Date(now); next7End.setDate(next7End.getDate() + 7);
  const next7EndStr = fmtLocalDate(next7End);

  // Fetch all bookings assigned to this contractor in the relevant window
  // (today through end-of-week + everything completed this week for stats).
  const { data: bookings } = await admin
    .from("bookings")
    .select("id, booking_date, booking_time, service_name, customer_name, customer_phone, service_address, vehicle_year, vehicle_make, vehicle_model, vehicle_size, total_price, addons_json, additional_vehicles_json, status, accepted_at, on_my_way_at, arrived_at, started_at, job_completed_at, photo_review_status, final_commission_cents, base_commission_cents, tip_cents")
    .eq("assigned_to", user.id)
    .neq("status", "cancelled")
    .gte("booking_date", weekStartStr)
    .lte("booking_date", next7EndStr)
    .order("booking_date", { ascending: true })
    .order("booking_time", { ascending: true });

  const commissionPct = Number((profile as any).commission_pct ?? 35);

  const mapBooking = (b: any): ContractorJob => {
    const totalPrice = Number(b.total_price ?? 0);
    const baseCents = b.base_commission_cents != null
      ? Number(b.base_commission_cents)
      : Math.round(totalPrice * commissionPct);  // cents = $price * pct (pct is 0-100)
    return {
      bookingId: b.id,
      date: b.booking_date,
      time: to12h(b.booking_time),
      serviceName: b.service_name ?? "Detailing Service",
      customerName: b.customer_name ?? "—",
      customerPhone: b.customer_phone ?? null,
      serviceAddress: b.service_address ?? "",
      vehicleYear: b.vehicle_year ?? "",
      vehicleMake: b.vehicle_make ?? "",
      vehicleModel: b.vehicle_model ?? "",
      vehicleSize: b.vehicle_size ?? "",
      totalPrice,
      addons: Array.isArray(b.addons_json) ? b.addons_json : [],
      hasAdditionalVehicles: Array.isArray(b.additional_vehicles_json) && b.additional_vehicles_json.length > 0,
      acceptedAt: b.accepted_at,
      onMyWayAt: b.on_my_way_at,
      arrivedAt: b.arrived_at,
      startedAt: b.started_at,
      jobCompletedAt: b.job_completed_at,
      photoReviewStatus: b.photo_review_status ?? "pending",
      estimatedCommissionCents: baseCents,
    };
  };

  const all = (bookings ?? []).map(mapBooking);

  const todayJobs    = all.filter(j => j.date === todayStr);
  const tomorrowJobs = all.filter(j => j.date === tomorrowStr);
  const upcomingThisWeek = all.filter(j =>
    j.date > tomorrowStr && j.date <= next7EndStr
  );

  // Week stats — completed jobs THIS week (Mon–Sun)
  const completedThisWeek = all.filter(j =>
    j.jobCompletedAt != null &&
    j.date >= weekStartStr &&
    j.date <= weekEndStr
  );
  // Sum final commission (or estimated if not yet locked), plus tips
  let weekEarningsCents = 0;
  let weekTipsCents = 0;
  for (const j of completedThisWeek) {
    weekEarningsCents += j.estimatedCommissionCents;
  }
  // Tip totals come from the raw booking rows
  for (const b of (bookings ?? []) as any[]) {
    if (!b.job_completed_at) continue;
    if (b.booking_date < weekStartStr || b.booking_date > weekEndStr) continue;
    weekTipsCents += Number(b.tip_cents ?? 0);
  }

  // Tier progress (display only — the system never auto-promotes)
  const ladder = DEFAULT_TIER_LADDER;
  const currentTier = Number((profile as any).commission_tier ?? 1);
  const next = ladder.find(t => t.tier > currentTier) ?? null;
  const completedJobsCount = Number((profile as any).completed_jobs_count ?? 0);
  const ratingAvg = (profile as any).rating_overall_avg != null
    ? Number((profile as any).rating_overall_avg)
    : null;
  const jobsToNext = next && next.minJobs > 0
    ? Math.max(0, next.minJobs - completedJobsCount)
    : null;
  const ratingNeededForNext = next?.minRating ?? null;
  const eligibleForNext = next != null
    && (next.minJobs === 0 || completedJobsCount >= next.minJobs)
    && (next.minRating == null || (ratingAvg ?? 0) >= next.minRating);

  return {
    profile: {
      id: profile.id as string,
      firstName: ((profile as any).first_name as string) ?? "",
      employmentStatus: ((profile as any).employment_status as string) ?? "pending",
      commissionTier: currentTier,
      commissionPct,
      dailyJobCap: Number((profile as any).daily_job_cap ?? 3),
      ratingOverallAvg: ratingAvg,
      ratingCount: Number((profile as any).rating_count ?? 0),
      completedJobsCount,
    },
    todayJobs,
    tomorrowJobs,
    upcomingThisWeek,
    weekStats: {
      jobsCompleted: completedThisWeek.length,
      estimatedEarnings: weekEarningsCents / 100,
      tipsReceived: weekTipsCents / 100,
      weekStart: weekStartStr,
      weekEnd: weekEndStr,
    },
    tierProgress: {
      currentTier,
      currentPct: commissionPct,
      nextTier: next?.tier ?? null,
      nextTierPct: next?.pct ?? null,
      jobsToNextTier: jobsToNext,
      ratingNeededForNext,
      eligibleForNext,
    },
  };
}
