/**
 * Cron: create the next booking for each due recurring plan.
 *
 * Runs daily. For each active, non-paused recurring row whose next_run_date
 * falls within the next 30 days AND hasn't already spawned a booking in the
 * last 20 days:
 *   1. Create a new bookings row snapshotting customer + selected items.
 *   2. Compute total from computeLightDetailPrice, then apply discount_pct.
 *   3. Advance recurring_bookings.next_run_date by interval_days and stamp
 *      last_booking_id / last_created_at.
 *   4. Fire off customer + admin confirmation emails (best-effort).
 *
 * Secured by CRON_SECRET header (matches other cron endpoints).
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { computeLightDetailPrice, LIGHT_DETAIL_ITEMS, type LightDetailSize } from "@/lib/lightDetailItems";
import { sendBookingEmails } from "@/lib/email";

const BOOKING_WINDOW_DAYS = 30;
const DEDUPE_DAYS = 20;
const DEFAULT_TIME = "10:00:00";

type RecurringRow = {
  id: string;
  user_id: string | null;
  vehicle_id: string | null;
  service_id: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  customer_email: string | null;
  service_address: string | null;
  vehicle_year: number | null;
  vehicle_make: string | null;
  vehicle_model: string | null;
  vehicle_size: string | null;
  selected_items: string[];
  item_prices: Record<string, number> | null;
  interval_days: number;
  preferred_time: string | null;
  next_run_date: string;
  last_created_at: string | null;
  discount_pct: number | null;
};

async function handle(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const windowEnd = new Date(now);
  windowEnd.setUTCDate(windowEnd.getUTCDate() + BOOKING_WINDOW_DAYS);
  const windowEndStr = windowEnd.toISOString().slice(0, 10);
  const dedupeCutoff = new Date(now.getTime() - DEDUPE_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const { data: rows, error: fetchErr } = await admin
    .from("recurring_bookings")
    .select("id, user_id, vehicle_id, service_id, customer_name, customer_phone, customer_email, service_address, vehicle_year, vehicle_make, vehicle_model, vehicle_size, selected_items, item_prices, interval_days, preferred_time, next_run_date, last_created_at, discount_pct, active, paused_until")
    .eq("active", true)
    .lte("next_run_date", windowEndStr);

  if (fetchErr) {
    console.error("[cron/recurring-bookings] fetch error:", fetchErr);
    return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  }

  const eligible: RecurringRow[] = (rows ?? []).filter((r: any) => {
    if (r.paused_until && r.paused_until >= todayStr) return false;
    if (r.last_created_at && r.last_created_at > dedupeCutoff) return false;
    return true;
  });

  const errors: Array<{ id: string; error: string }> = [];
  let created = 0;

  for (const r of eligible) {
    try {
      const size = ((r.vehicle_size ?? "sedan") as string).toLowerCase();
      const validSizes: LightDetailSize[] = ["sedan", "suv", "xl"];
      const sizeKey: LightDetailSize = (validSizes as string[]).includes(size)
        ? (size as LightDetailSize)
        : "sedan";

      const priced = computeLightDetailPrice(r.selected_items ?? [], sizeKey);
      const discount = Number(r.discount_pct ?? 0);
      const totalPrice = Math.round(priced.finalPrice * (1 - discount / 100) * 100) / 100;

      const itemById = new Map(LIGHT_DETAIL_ITEMS.map(i => [i.id, i.label] as const));
      const itemLabels = (r.selected_items ?? []).map(id => itemById.get(id) ?? id).join(", ");
      const notes = [
        `🔁 Recurring Light Detailing — auto-created from monthly plan.`,
        `Items: ${itemLabels || "—"}`,
        discount > 0 ? `Monthly discount: ${discount}% off` : null,
        r.service_address ? `📍 Service Location: ${r.service_address}` : null,
      ].filter(Boolean).join("\n\n");

      const bookingTime = r.preferred_time ?? DEFAULT_TIME;

      const { data: booking, error: insErr } = await admin
        .from("bookings")
        .insert({
          user_id:              r.user_id,
          vehicle_id:           r.vehicle_id,
          service_id:           r.service_id,
          booking_date:         r.next_run_date,
          booking_time:         bookingTime,
          status:               "confirmed",
          total_price:          totalPrice,
          notes,
          customer_name:        r.customer_name,
          customer_email:       r.customer_email,
          customer_phone:       r.customer_phone,
          service_address:      r.service_address,
          vehicle_make:         r.vehicle_make,
          vehicle_model:        r.vehicle_model,
          vehicle_year:         r.vehicle_year ? String(r.vehicle_year) : null,
          vehicle_size:         r.vehicle_size,
          service_name:         "Light Detailing",
          addons_json:          priced.itemsPriced,
          recurring_booking_id: r.id,
        })
        .select("id")
        .single();

      if (insErr || !booking) throw new Error(insErr?.message ?? "booking insert failed");

      // Advance schedule
      const nextBase = new Date(`${r.next_run_date}T00:00:00Z`);
      nextBase.setUTCDate(nextBase.getUTCDate() + r.interval_days);
      const newNext = nextBase.toISOString().slice(0, 10);

      await admin.from("recurring_bookings").update({
        last_booking_id: booking.id,
        last_created_at: new Date().toISOString(),
        next_run_date:   newNext,
        updated_at:      new Date().toISOString(),
      }).eq("id", r.id);

      created++;

      // Fire off emails — best effort
      if (r.customer_email) {
        const bookingTime12 = (() => {
          const [h, m] = bookingTime.split(":");
          const hn = parseInt(h, 10);
          const ampm = hn >= 12 ? "PM" : "AM";
          return `${hn % 12 || 12}:${m} ${ampm}`;
        })();

        sendBookingEmails({
          bookingId:     booking.id,
          customerName:  r.customer_name ?? "Valued Customer",
          customerEmail: r.customer_email,
          customerPhone: r.customer_phone ?? "",
          serviceName:   "Light Detailing (Monthly)",
          servicePrice:  totalPrice,
          bookingDate:   r.next_run_date,
          bookingTime:   bookingTime12,
          vehicleYear:   r.vehicle_year ? String(r.vehicle_year) : "",
          vehicleMake:   r.vehicle_make ?? "",
          vehicleModel:  r.vehicle_model ?? "",
          vehicleSize:   sizeKey,
          serviceAddress: r.service_address ?? undefined,
          notes,
        }).catch(err => console.error("[cron/recurring-bookings] email error:", err));
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[cron/recurring-bookings] row ${r.id} failed:`, message);
      errors.push({ id: r.id, error: message });
    }
  }

  const summary = { processed: eligible.length, created, errors };
  console.log("[cron/recurring-bookings] done —", JSON.stringify(summary));
  return NextResponse.json({ ok: true, ...summary });
}

export async function GET(req: NextRequest) { return handle(req); }
export async function POST(req: NextRequest) { return handle(req); }
