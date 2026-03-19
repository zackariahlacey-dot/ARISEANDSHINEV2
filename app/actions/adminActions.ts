"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { AdminBookingSchema } from "@/types/admin";
import { 
  sendOnMyWayEmailNotification, 
  sendBookingCancellationEmails,
  sendUpdatedBookingEmail,
  sendBookingEmails,
  sendJobCompletedEmail,
  sendReviewFollowupEmail
} from "@/lib/email";
import { sendBookingEmail } from "@/app/actions/sendBookingEmail";

// Maps our UI vehicle size slugs to the DB enum values
const VEHICLE_SIZE_MAP = {
  compact: "small",
  sedan: "medium",
  suv: "large",
  xl: "extra_large",
} as const;

function to24h(time12: string): string {
  const [timePart, period] = time12.split(" ");
  const [rawH, rawM = "00"] = timePart.split(":");
  let h = parseInt(rawH, 10);
  if (period === "AM" && h === 12) h = 0;
  if (period === "PM" && h !== 12) h += 12;
  return `${String(h).padStart(2, "0")}:${rawM}:00`;
}

/**
 * NEW: Admin Quick Book Action
 * Securely creates an Auth Account for the customer if one doesn't exist.
 */
export async function adminQuickBookAction(payload: any) {
  const supabase = createAdminClient();
  const email = payload.email?.toLowerCase().trim();
  const phoneDigits = payload.phone.replace(/\D/g, "").slice(0, 10);
  
  const parts = payload.name.trim().split(/\s+/);
  const firstName = parts[0] ?? "";
  const lastName = parts.slice(1).join(" ") || "";

  let targetUserId: string;

  // 1. Resolve by Phone FIRST to avoid unique constraint violations and attribute to existing profile
  const { data: existingByPhone } = await supabase
    .from("profiles")
    .select("id")
    .eq("phone", phoneDigits)
    .maybeSingle();

  if (existingByPhone) {
    targetUserId = existingByPhone.id;
  } else if (email) {
    // 2. Try to find existing auth user by email
    const { data: users, error: findError } = await supabase.auth.admin.listUsers();
    const existingUser = users.users.find(u => u.email?.toLowerCase() === email);

    if (existingUser) {
      targetUserId = existingUser.id;
    } else {
      // Create new auth user
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: { first_name: firstName, last_name: lastName },
      });

      if (createError || !newUser.user) {
        console.error("Auth Creation Error:", createError);
        targetUserId = crypto.randomUUID();
      } else {
        targetUserId = newUser.user.id;
      }
    }
  } else {
    // 3. No existing phone and no email, use new UUID
    targetUserId = crypto.randomUUID();
  }

  // 2. Ensure Profile exists and is updated
  await supabase.from("profiles").upsert({
    id: targetUserId,
    first_name: firstName,
    last_name: lastName,
    phone: phoneDigits,
  }, { onConflict: "id" });

  // 3. Insert Vehicle
  const { data: vehicle, error: vehicleErr } = await supabase
    .from("vehicles")
    .insert({
      user_id: targetUserId,
      make: payload.vehicleMake || "Unknown",
      model: payload.vehicleModel || "Unknown",
      year: parseInt(payload.vehicleYear) || new Date().getFullYear(),
      size: VEHICLE_SIZE_MAP[payload.vehicleSize as keyof typeof VEHICLE_SIZE_MAP] || "medium",
    })
    .select("id")
    .single();

  if (vehicleErr) throw new Error("Vehicle creation failed");

  // 4. Insert Booking
  const notesBody = [
    `💳 Payment: Pay at Arrival (Quick Book)`,
    payload.address ? `📍 Service Location: ${payload.address}` : null,
    payload.notes
  ].filter(Boolean).join("\n\n");

  const { data: booking, error: bookingErr } = await supabase
    .from("bookings")
    .insert({
      user_id: targetUserId,
      vehicle_id: vehicle.id,
      service_id: payload.serviceId,
      booking_date: payload.bookingDate,
      booking_time: to24h(payload.bookingTime),
      status: "confirmed",
      total_price: payload.totalPrice,
      notes: notesBody,
    })
    .select("id")
    .single();

  if (bookingErr) throw new Error("Booking creation failed");

  // 5. Send Confirmation Emails
  if (email) {
    await sendBookingEmail({
      customerEmail: email,
      bookingDetails: {
        customerName: payload.name,
        customerPhone: payload.phone,
        customerEmail: email,
        serviceAddress: payload.address,
        serviceName: payload.serviceName,
        vehicleYear: payload.vehicleYear,
        vehicleMake: payload.vehicleMake,
        vehicleModel: payload.vehicleModel,
        bookingDate: payload.bookingDate,
        bookingTime: payload.bookingTime,
        travelFee: 0,
        totalPrice: payload.totalPrice,
      },
      totalPrice: payload.totalPrice,
    }).catch(e => console.error("Customer Email Fail:", e));
  }

  // Admin Alert
  await sendBookingEmails({
    bookingId: booking.id,
    customerName: payload.name,
    customerEmail: email,
    customerPhone: phoneDigits,
    serviceName: payload.serviceName,
    servicePrice: payload.totalPrice,
    bookingDate: payload.bookingDate,
    bookingTime: payload.bookingTime,
    vehicleYear: payload.vehicleYear,
    vehicleMake: payload.vehicleMake,
    vehicleModel: payload.vehicleModel,
    vehicleSize: payload.vehicleSize,
    rewardPointsEarned: 0,
    serviceAddress: payload.address,
    notes: payload.notes,
  }, { skipCustomerEmail: true }).catch(e => console.error("Admin Email Fail:", e));

  return { success: true, bookingId: booking.id };
}

export async function getAllServices() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("services")
    .select("*")
    .order("name", { ascending: true });

  if (error) throw new Error(error.message);
  return data || [];
}

export async function getAllBookings() {
  const supabase = createAdminClient();
  
  const { data, error } = await supabase
    .from("bookings")
    .select(`
      *,
      profiles:user_id(id, first_name, last_name, phone, reward_points),
      vehicles:vehicle_id(id, make, model, year, size),
      services:service_id(name, description)
    `)
    .order("booking_date", { ascending: false });

  if (error) {
    console.error("[adminActions] Fetch Error:", error);
    throw new Error(error.message);
  }

  return (data || []).map((b: any) => {
    try {
      const res = AdminBookingSchema.safeParse(b);
      return res.success ? res.data : b;
    } catch (e) {
      return b;
    }
  });
}

export async function getAllClients() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("profiles")
    .select(`
      *,
      vehicles(*),
      bookings:bookings(id, total_price, booking_date, booking_time, notes, status, services:service_id(name))
    `)
    .order("first_name", { ascending: true });

  if (error) throw new Error(error.message);

  return (data || []).map((client: any) => {
    // Sort bookings by date and time
    const sortedBookings = [...(client.bookings || [])].sort((a,b) => {
      const dateCompare = b.booking_date.localeCompare(a.booking_date);
      if (dateCompare !== 0) return dateCompare;
      return (b.booking_time || "").localeCompare(a.booking_time || "");
    });

    const ltv = client.bookings?.reduce((sum: number, b: any) => sum + (Number(b.total_price) || 0), 0) || 0;
    
    let lastAddress = "No address recorded";
    const latestWithNotes = sortedBookings.find(b => b.notes && b.notes.includes("📍 Service Location:"));
    if (latestWithNotes) {
      lastAddress = latestWithNotes.notes.split("📍 Service Location:")[1]?.trim() || "See Notes";
    }

    return {
      ...client,
      _ltv: ltv,
      _lastAddress: lastAddress,
      _lastService: sortedBookings[0]?.booking_date || null,
      _bookingCount: client.bookings?.length || 0,
      // Map bookings to ensure dates don't shift due to timezone
      bookings: sortedBookings.map(b => ({
        ...b,
        // Ensure date is treated as a local string YYYY-MM-DD
        display_date: b.booking_date 
      }))
    };
  });
}

async function getUserEmail(userId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase.auth.admin.getUserById(userId);
  if (error || !data.user) return null;
  return data.user.email;
}

export async function rescheduleBookingAction(id: string, date: string, time: string) {
  const supabase = createAdminClient();
  const { data: booking } = await supabase.from("bookings").select("*, profiles:user_id(id, first_name, last_name), services:service_id(name)").eq("id", id).single();
  const { error } = await supabase.from("bookings").update({ booking_date: date, booking_time: time }).eq("id", id);
  if (error) throw new Error(error.message);
  const email = booking?.user_id ? await getUserEmail(booking.user_id) : null;
  if (email && booking?.profiles) {
    await sendUpdatedBookingEmail({
      customerName: `${booking.profiles.first_name || ""} ${booking.profiles.last_name || ""}`.trim(),
      customerEmail: email,
      serviceName: booking.services?.name || "Detailing Service",
      newDate: date,
      newTime: time
    }).catch(e => console.error("Email fail:", e));
  }
  return { success: true };
}

export async function sendOnMyWayEmail(bookingId: string) {
  const supabase = createAdminClient();
  const { data: booking, error } = await supabase.from("bookings").select("*, profiles:user_id(id, first_name, last_name)").eq("id", bookingId).single();
  const email = booking?.user_id ? await getUserEmail(booking.user_id) : null;
  if (email && booking?.profiles) {
    await sendOnMyWayEmailNotification({ customerName: `${booking.profiles.first_name || ""} ${booking.profiles.last_name || ""}`.trim(), customerEmail: email });
    return { success: true };
  }
  return { success: false, error: "No email found" };
}

export async function handleNoShowAction(bookingId: string) {
  const supabase = createAdminClient();
  const { data: booking } = await supabase.from("bookings").select("*, profiles:user_id(id, first_name, last_name), services:service_id(name)").eq("id", bookingId).single();
  
  await supabase.from("bookings").update({ status: "no-show" }).eq("id", bookingId);
  
  const email = booking?.user_id ? await getUserEmail(booking.user_id) : null;
  if (email && booking?.profiles) {
    await sendBookingCancellationEmails({
      customerName: `${booking.profiles.first_name || ""} ${booking.profiles.last_name || ""}`.trim(),
      customerEmail: email,
      bookingDate: booking.booking_date,
      bookingTime: booking.booking_time,
      serviceName: `NO-SHOW: ${booking.services?.name || "Detailing Service"}`
    }).catch(e => console.error("No-show email fail:", e));
  }
  return { success: true };
}

export async function updateBookingStatusAction(id: string, status: string) {
  const supabase = createAdminClient();
  
  // Fetch details BEFORE update to have info for email if needed
  const { data: booking } = await supabase
    .from("bookings")
    .select("*, profiles:user_id(id, first_name, last_name, reward_points), services:service_id(name)")
    .eq("id", id)
    .single();

  const { error } = await supabase.from("bookings").update({ status }).eq("id", id);
  if (error) throw new Error(error.message);

  const email = booking?.user_id ? await getUserEmail(booking.user_id) : null;
  
  if (status === "completed" && booking && booking.profiles) {
    const pointsAwarded = Math.floor(Math.max(0, Number(booking.total_price)));
    
    // Award Points
    await supabase.from("profiles").update({ 
      reward_points: (booking.profiles.reward_points || 0) + pointsAwarded 
    }).eq("id", booking.user_id);

    if (email) {
      await sendJobCompletedEmail({
        customerName: `${booking.profiles.first_name || ""} ${booking.profiles.last_name || ""}`.trim(),
        customerEmail: email,
        serviceName: booking.services?.name || "Detailing Service",
        amountPaid: Number(booking.total_price),
        pointsEarned: pointsAwarded,
      }).catch(e => console.error("Completion email fail:", e));

      // 24 Hour Follow-up Review Request
      setTimeout(() => {
        sendReviewFollowupEmail({
          customerName: `${booking.profiles.first_name || ""} ${booking.profiles.last_name || ""}`.trim(),
          customerEmail: email
        }).catch(e => console.error("Follow-up email fail:", e));
      }, 24 * 60 * 60 * 1000);
    }
  } else if (status === "cancelled" && booking && booking.profiles) {
    if (email) {
      await sendBookingCancellationEmails({
        customerName: `${booking.profiles.first_name || ""} ${booking.profiles.last_name || ""}`.trim(),
        customerEmail: email,
        bookingDate: booking.booking_date,
        bookingTime: booking.booking_time,
        serviceName: booking.services?.name || "Detailing Service"
      }).catch(e => console.error("Cancel email fail:", e));
    }
  }

  return { success: true };
}

export async function deleteBookingAction(id: string) {
  const supabase = createAdminClient();
  const { data: booking } = await supabase.from("bookings").select("*, profiles:user_id(id, first_name, last_name), services:service_id(name)").eq("id", id).single();
  const { error } = await supabase.from('bookings').delete().eq('id', id);
  if (error) throw new Error(error.message);
  const email = booking?.user_id ? await getUserEmail(booking.user_id) : null;
  if (email && booking?.profiles) {
    await sendBookingCancellationEmails({
      customerName: `${booking.profiles.first_name || ""} ${booking.profiles.last_name || ""}`.trim(),
      customerEmail: email,
      bookingDate: booking.booking_date,
      bookingTime: booking.booking_time,
      serviceName: booking.services?.name || "Detailing Service"
    }).catch(e => console.error("Email fail:", e));
  }
  return { success: true };
}

export async function getOperatingHours() {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("operating_hours").select("*").order("day_of_week", { ascending: true });
  if (error) throw error;
  return data;
}

export async function updateOperatingHoursAction(hours: any[]) {
  const supabase = createAdminClient();
  for (const h of hours) {
    const { error } = await supabase.from("operating_hours").upsert(h);
    if (error) throw error;
  }
  return { success: true };
}

export async function getBlockedDates() {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("blocked_dates").select("*").order("blocked_date", { ascending: true });
  if (error) throw error;
  return data;
}

export async function getFinancialStats() {
  const supabase = createAdminClient();
  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const lastOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

  // 1. Fetch all bookings for the current month
  const { data: monthBookings, error: bookingsErr } = await supabase
    .from("bookings")
    .select("total_price, status, booking_date")
    .gte("booking_date", firstOfMonth)
    .lte("booking_date", lastOfMonth);

  if (bookingsErr) throw new Error(bookingsErr.message);

  const mtdRevenue = monthBookings
    ?.filter(b => b.status === 'completed' || b.status === 'confirmed') // Treating confirmed as revenue for HUD simplicity, or just completed
    .reduce((sum, b) => sum + (Number(b.total_price) || 0), 0) || 0;

  const completedBookings = monthBookings?.filter(b => b.status === 'completed') || [];
  const avgDetail = completedBookings.length > 0 
    ? completedBookings.reduce((sum, b) => sum + (Number(b.total_price) || 0), 0) / completedBookings.length 
    : 0;

  // 2. Fetch Coupon Usage
  const { data: coupons, error: couponsErr } = await supabase
    .from("coupons")
    .select(`
      *,
      bookings:bookings(id, total_price)
    `);

  if (couponsErr) throw new Error(couponsErr.message);

  const couponStats = (coupons || []).map(c => ({
    ...c,
    usageCount: c.bookings?.length || 0,
    revenueGenerated: c.bookings?.reduce((sum: number, b: any) => sum + (Number(b.total_price) || 0), 0) || 0
  }));

  return {
    mtdRevenue,
    avgDetail,
    couponStats,
    bookingCount: monthBookings?.length || 0
  };
}

export async function deleteCouponAction(id: string) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("coupons").delete().eq("id", id);
  if (error) throw new Error(error.message);
  return { success: true };
}

export async function toggleBlockedDateAction(date: string, isBlocked: boolean, reason?: string) {
  const supabase = createAdminClient();
  if (isBlocked) {
    const { error } = await supabase.from("blocked_dates").insert([{ blocked_date: date, reason }]);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("blocked_dates").delete().eq("blocked_date", date);
    if (error) throw error;
  }
  return { success: true };
}

export async function triggerTestEmail(type: string, targetEmail: string) {
  const adminEmail = process.env.ADMIN_EMAIL || "zackariahlacey04@gmail.com";
  const email = targetEmail || adminEmail;
  
  const sampleData = {
    customerName: "Test Customer",
    customerEmail: email,
    customerPhone: "802-555-0123",
    serviceName: "Full Interior Detail",
    servicePrice: 250,
    bookingDate: new Date().toISOString().split('T')[0],
    bookingTime: "10:00 AM",
    vehicleYear: "2024",
    vehicleMake: "Tesla",
    vehicleModel: "Model Y",
    vehicleSize: "suv",
    rewardPointsEarned: 250,
    serviceAddress: "123 Maple St, Burlington, VT",
    bookingId: "test-uuid-12345",
  };

  try {
    switch (type) {
      case 'confirmation':
        await sendBookingEmails(sampleData);
        break;
      case 'on-my-way':
        await sendOnMyWayEmailNotification({ customerName: sampleData.customerName, customerEmail: email });
        break;
      case 'completed':
        await sendJobCompletedEmail({
          customerName: sampleData.customerName,
          customerEmail: email,
          serviceName: sampleData.serviceName,
          amountPaid: sampleData.servicePrice,
          pointsEarned: sampleData.rewardPointsEarned,
        });
        break;
      case 'review':
        await sendReviewFollowupEmail({ customerName: sampleData.customerName, customerEmail: email });
        break;
      case 'reschedule':
        await sendUpdatedBookingEmail({
          customerName: sampleData.customerName,
          customerEmail: email,
          serviceName: sampleData.serviceName,
          newDate: sampleData.bookingDate,
          newTime: "02:00 PM"
        });
        break;
      case 'cancel':
        await sendBookingCancellationEmails({
          customerName: sampleData.customerName,
          customerEmail: email,
          bookingDate: sampleData.bookingDate,
          bookingTime: sampleData.bookingTime,
          serviceName: sampleData.serviceName
        });
        break;
      default:
        throw new Error("Unknown email type");
    }
    return { success: true };
  } catch (err: any) {
    console.error("Test Email Fail:", err);
    return { success: false, error: err.message };
  }
}

export async function getDiagnostics() {
  return {
    env: {
      supabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      supabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      resendKey: !!process.env.RESEND_API_KEY,
      stripeKey: !!process.env.STRIPE_SECRET_KEY,
      stripeWebhook: !!process.env.STRIPE_WEBHOOK_SECRET,
      adminEmail: process.env.ADMIN_EMAIL || "zackariahlacey04@gmail.com",
    },
    timestamp: new Date().toISOString(),
  };
}
