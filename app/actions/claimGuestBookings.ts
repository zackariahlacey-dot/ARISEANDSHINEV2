"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Email-merge for guest bookings.
 *
 * When a customer books as a guest, their email is captured on a "guest"
 * profile row (random UUID, no auth.users link). If they later sign up
 * with the same email, this action runs on first dashboard visit and:
 *
 *   1. Finds any guest profile rows with the same email as the auth user
 *      (excludes the auth user's own profile by ID).
 *   2. Re-points every booking from that guest profile to the auth user.
 *   3. Re-points reward_points and vehicles too.
 *   4. Recomputes completed_detail_count for the auth user based on
 *      completed bookings of qualifying services, then writes the
 *      matching loyalty_discount_pct.
 *   5. Deletes the now-empty guest profile.
 *
 * Safe to call multiple times — does nothing if no guest profile to merge.
 */
export async function claimGuestBookings(): Promise<{
  claimed: boolean;
  bookingsMerged?: number;
  newDetailCount?: number;
  newDiscountPct?: number;
}> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user?.id || !auth.user.email) return { claimed: false };

  const authUserId = auth.user.id;
  const authEmail = auth.user.email.trim().toLowerCase();
  const admin = createAdminClient();

  // 1. Find guest profile(s) with matching email but different ID
  const { data: guestProfiles } = await admin
    .from("profiles")
    .select("id, reward_points, lifetime_points, completed_detail_count")
    .eq("email", authEmail)
    .neq("id", authUserId);

  if (!guestProfiles || guestProfiles.length === 0) return { claimed: false };

  let bookingsMerged = 0;
  let mergedPoints = 0;
  let mergedLifetimePoints = 0;

  for (const guest of guestProfiles) {
    const guestId = guest.id as string;
    // Re-point all bookings, vehicles, point_transactions to auth user.
    // Two-step: count guest bookings first, then update them.
    const { count: guestBookingCount } = await admin
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("user_id", guestId);
    await admin.from("bookings").update({ user_id: authUserId }).eq("user_id", guestId);
    bookingsMerged += guestBookingCount ?? 0;

    await admin.from("vehicles").update({ user_id: authUserId }).eq("user_id", guestId);
    await admin.from("point_transactions").update({ user_id: authUserId }).eq("user_id", guestId);

    mergedPoints += Number(guest.reward_points ?? 0);
    mergedLifetimePoints += Number(guest.lifetime_points ?? 0);

    // Delete the empty guest profile
    await admin.from("profiles").delete().eq("id", guestId);
  }

  // 2. Merge points into the auth user's profile
  if (mergedPoints > 0 || mergedLifetimePoints > 0) {
    const { data: authProfile } = await admin
      .from("profiles")
      .select("reward_points, lifetime_points")
      .eq("id", authUserId)
      .maybeSingle();
    const newRewardPoints = (Number(authProfile?.reward_points ?? 0)) + mergedPoints;
    const newLifetimePoints = (Number(authProfile?.lifetime_points ?? 0)) + mergedLifetimePoints;
    await admin
      .from("profiles")
      .update({
        reward_points: newRewardPoints,
        lifetime_points: newLifetimePoints,
      })
      .eq("id", authUserId);
  }

  // 3. Recompute completed_detail_count from the auth user's bookings
  //    (now includes formerly-guest bookings). Counts confirmed/completed
  //    bookings of qualifying car services.
  const { CAR_DETAIL_SERVICES, getDiscountPct } = await import("@/lib/loyalty");
  const qualifyingSet = CAR_DETAIL_SERVICES;
  const { data: userBookings } = await admin
    .from("bookings")
    .select("service_name, status")
    .eq("user_id", authUserId)
    .in("status", ["confirmed", "completed"]);

  const detailCount = (userBookings ?? []).filter(
    (b: any) => b.service_name && qualifyingSet.has(b.service_name as string)
  ).length;
  const newDiscountPct = getDiscountPct(detailCount);

  await admin
    .from("profiles")
    .update({
      completed_detail_count: detailCount,
      loyalty_discount_pct: newDiscountPct,
    })
    .eq("id", authUserId);

  return {
    claimed: true,
    bookingsMerged,
    newDetailCount: detailCount,
    newDiscountPct,
  };
}
