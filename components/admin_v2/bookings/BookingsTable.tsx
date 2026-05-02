"use client";

import { useState, useTransition } from "react";
import { useAdminBookings, useUpdateBookingStatus, useSendOnMyWay } from "@/hooks/use-admin-data";
import { sendTestReviewEmail } from "@/app/actions/sendTestReviewEmail";
import {
  CheckCircle2,
  XCircle,
  Clock,
  ChevronDown,
  User,
  Car,
  CalendarDays,
  Briefcase,
  MapPin,
  Mail,
  Phone,
  StickyNote,
  ShieldCheck,
  AlertCircle,
  Package,
  Navigation,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { AdminBooking } from "@/types/admin";

const STATUS_CONFIG = {
  confirmed:        { color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20", icon: CheckCircle2 },
  completed:        { color: "text-blue-400 bg-blue-500/10 border-blue-500/20",           icon: CheckCircle2 },
  cancelled:        { color: "text-rose-400 bg-rose-500/10 border-rose-500/20",           icon: XCircle },
  "no-show":        { color: "text-zinc-400 bg-zinc-500/10 border-zinc-500/20",           icon: Clock },
  pending_payment:  { color: "text-sky-400 bg-sky-500/10 border-sky-500/20",              icon: Clock },
};

/** Resolve a field: prefer the direct lead column, fall back to join */
function displayName(b: AdminBooking) {
  if (b.customer_name) return b.customer_name;
  const p = b.profiles;
  if (!p) return "—";
  return [p.first_name, p.last_name].filter(Boolean).join(" ") || "—";
}

function displayInitials(b: AdminBooking) {
  const name = displayName(b);
  const parts = name.split(" ").filter(Boolean);
  return parts.length >= 2
    ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
    : (parts[0]?.[0] ?? "?").toUpperCase();
}

function fmtPhone(p: string | null | undefined): string {
  if (!p) return "";
  let d = p.replace(/\D/g, "");
  if (d.length === 11 && d.startsWith("1")) d = d.slice(1);
  if (d.length !== 10) return p;
  return `(${d.slice(0,3)}) ${d.slice(3,6)}-${d.slice(6)}`;
}
function displayPhone(b: AdminBooking) {
  return b.customer_phone ?? b.profiles?.phone ?? null;
}

function displayEmail(b: AdminBooking) {
  return b.customer_email ?? null;
}

function displayVehicle(b: AdminBooking) {
  const year  = b.vehicle_year  ?? b.vehicles?.year  ?? "";
  const make  = b.vehicle_make  ?? b.vehicles?.make  ?? "";
  const model = b.vehicle_model ?? b.vehicles?.model ?? "";
  return [year, make, model].filter(Boolean).join(" ") || "—";
}

function displayService(b: AdminBooking) {
  return b.service_name ?? b.services?.name ?? "—";
}

function displayAddress(b: AdminBooking) {
  return b.service_address ?? null;
}

function hasLinkedAccount(b: AdminBooking) {
  return !!b.profiles;
}

export default function BookingsTable() {
  const { data: bookings, isLoading, error } = useAdminBookings();
  const updateStatus = useUpdateBookingStatus();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [testEmailPending, startTestEmail] = useTransition();
  const [testEmailMsg, setTestEmailMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function handleTestEmail() {
    setTestEmailMsg(null);
    startTestEmail(async () => {
      const result = await sendTestReviewEmail();
      setTestEmailMsg(
        result.success
          ? { ok: true,  text: "Test email sent to zackariahlacey@gmail.com!" }
          : { ok: false, text: result.error ?? "Failed to send." }
      );
      setTimeout(() => setTestEmailMsg(null), 5000);
    });
  }

  if (isLoading) return <BookingsSkeleton />;
  if (error) return <div className="text-rose-500 px-6 py-4">Failed to load bookings</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white tracking-tight">Recent Bookings</h1>
        <div className="flex items-center gap-2">
          {testEmailMsg && (
            <span className={cn("text-xs font-medium", testEmailMsg.ok ? "text-emerald-400" : "text-rose-400")}>
              {testEmailMsg.text}
            </span>
          )}
          <button
            onClick={handleTestEmail}
            disabled={testEmailPending}
            className="px-3 py-1.5 rounded-lg border border-[#D4AF37]/30 bg-[#D4AF37]/10 text-xs font-medium text-[#D4AF37] hover:bg-[#D4AF37]/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {testEmailPending ? "Sending…" : "✉ Test Review Email"}
          </button>
          <button className="px-3 py-1.5 rounded-lg border border-white/[0.06] bg-white/[0.02] text-xs font-medium text-zinc-400 hover:text-white transition-colors">
            Export CSV
          </button>
          <button className="px-3 py-1.5 rounded-lg bg-amber-500 text-black text-xs font-bold hover:bg-amber-400 transition-all">
            New Booking
          </button>
        </div>
      </div>

      <div className="border border-white/[0.06] rounded-2xl bg-[#050505] overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/[0.06] bg-white/[0.02]">
              <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Customer</th>
              <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Vehicle & Service</th>
              <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Date & Time</th>
              <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Status</th>
              <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-zinc-500 font-bold text-right">Price</th>
              <th className="px-6 py-4 w-10" />
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {bookings?.map((booking) => (
              <>
                {/* ── Main row ── */}
                <tr
                  key={booking.id}
                  className="group hover:bg-white/[0.01] transition-colors cursor-pointer"
                  onClick={() => setExpandedId(expandedId === booking.id ? null : booking.id)}
                >
                  {/* Customer */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="w-9 h-9 rounded-full bg-zinc-900 border border-white/[0.06] flex items-center justify-center text-[10px] font-bold text-zinc-400 shrink-0">
                          {displayInitials(booking)}
                        </div>
                        {hasLinkedAccount(booking) && (
                          <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-[#D4AF37]/20 border border-[#D4AF37]/40 flex items-center justify-center">
                            <ShieldCheck size={7} className="text-[#D4AF37]" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white truncate">
                          {displayName(booking)}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          {displayPhone(booking) && (
                            <span className="text-[10px] text-zinc-500 font-mono">
                              {fmtPhone(displayPhone(booking))}
                            </span>
                          )}
                          {displayEmail(booking) && (
                            <span className="text-[10px] text-zinc-600 truncate max-w-[160px]">
                              {displayEmail(booking)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Vehicle & Service */}
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <Car size={12} className="text-zinc-500 shrink-0" />
                        <span className="text-xs text-zinc-300 font-medium truncate">
                          {displayVehicle(booking)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Briefcase size={12} className="text-amber-500/60 shrink-0" />
                        <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-tight">
                          {displayService(booking)}
                        </span>
                      </div>
                      {displayAddress(booking) && (
                        <div className="flex items-center gap-1.5">
                          <MapPin size={11} className="text-zinc-600 shrink-0" />
                          <span className="text-[10px] text-zinc-600 truncate max-w-[180px]">
                            {displayAddress(booking)}
                          </span>
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Date & Time */}
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <CalendarDays size={12} className="text-zinc-500" />
                        <span className="text-xs text-zinc-300">
                          {format(new Date(booking.booking_date + "T12:00:00"), "MMM d, yyyy")}
                        </span>
                      </div>
                      <p className="text-[10px] text-zinc-500 pl-[18px] font-mono">
                        {booking.booking_time}
                      </p>
                    </div>
                  </td>

                  {/* Status */}
                  <td className="px-6 py-4">
                    <StatusBadge status={booking.status} />
                  </td>

                  {/* Price */}
                  <td className="px-6 py-4 text-right">
                    <span className="text-sm font-bold text-white">${booking.total_price}</span>
                  </td>

                  {/* Expand chevron */}
                  <td className="px-3 py-4 text-right">
                    <ChevronDown
                      size={16}
                      className={cn(
                        "text-zinc-600 transition-transform duration-200",
                        expandedId === booking.id && "rotate-180 text-zinc-400"
                      )}
                    />
                  </td>
                </tr>

                {/* ── Expanded detail row ── */}
                {expandedId === booking.id && (
                  <tr key={`${booking.id}-detail`} className="bg-white/[0.015]">
                    <td colSpan={6} className="px-6 py-5">
                      <BookingDetail booking={booking} onUpdateStatus={updateStatus.mutate} />
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>

        {bookings?.length === 0 && (
          <div className="text-center py-16 text-zinc-600">
            <CalendarDays size={28} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">No bookings yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Expanded detail panel ──────────────────────────────────────────────────────

function BookingDetail({
  booking,
  onUpdateStatus,
}: {
  booking: AdminBooking;
  onUpdateStatus: (args: { id: string; status: AdminBooking["status"] }) => void;
}) {
  const statuses: AdminBooking["status"][] = ["confirmed", "completed", "cancelled", "no-show"];
  const sendOnMyWay = useSendOnMyWay();
  const [onMyWayMsg, setOnMyWayMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const phone = fmtPhone(displayPhone(booking));
  const address = displayAddress(booking);
  const mapsUrl = address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
    : null;
  const additionalVehicles = booking.additional_vehicles_json ?? [];
  const totalVehicles = 1 + additionalVehicles.length;

  function handleOnMyWay() {
    setOnMyWayMsg(null);
    sendOnMyWay.mutate(booking.id, {
      onSuccess: () => setOnMyWayMsg({ ok: true, text: "On My Way email sent!" }),
      onError: () => setOnMyWayMsg({ ok: false, text: "Failed to send." }),
    });
    setTimeout(() => setOnMyWayMsg(null), 5000);
  }

  return (
    <div className="space-y-5">

      {/* ── Top strip: date/time + actions ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-white/[0.05]">
        <div className="flex items-center gap-5">
          <div>
            <p className="text-[9px] uppercase tracking-widest text-zinc-600 font-bold mb-0.5">Date</p>
            <p className="text-sm font-bold text-white">
              {format(new Date(booking.booking_date + "T12:00:00"), "EEE, MMM d, yyyy")}
            </p>
          </div>
          <div className="w-px h-8 bg-white/[0.06]" />
          <div>
            <p className="text-[9px] uppercase tracking-widest text-zinc-600 font-bold mb-0.5">Time</p>
            <p className="text-sm font-bold text-[#D4AF37]">{booking.booking_time}</p>
          </div>
          <div className="w-px h-8 bg-white/[0.06]" />
          <div>
            <p className="text-[9px] uppercase tracking-widest text-zinc-600 font-bold mb-0.5">Total</p>
            <p className="text-sm font-bold text-white">${booking.total_price}</p>
          </div>
          {totalVehicles > 1 && (
            <>
              <div className="w-px h-8 bg-white/[0.06]" />
              <div>
                <p className="text-[9px] uppercase tracking-widest text-zinc-600 font-bold mb-0.5">Vehicles</p>
                <p className="text-sm font-bold text-amber-400">{totalVehicles}</p>
              </div>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          {onMyWayMsg && (
            <span className={cn("text-[11px] font-medium", onMyWayMsg.ok ? "text-emerald-400" : "text-rose-400")}>
              {onMyWayMsg.text}
            </span>
          )}
          <button
            onClick={handleOnMyWay}
            disabled={sendOnMyWay.isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-sky-500/30 bg-sky-500/10 text-[11px] font-bold text-sky-400 hover:bg-sky-500/20 transition-colors disabled:opacity-50"
          >
            <Navigation size={11} />
            {sendOnMyWay.isPending ? "Sending…" : "On My Way"}
          </button>
        </div>
      </div>

      {/* ── Main 3-col grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

        {/* Column 1: Customer info */}
        <div className="space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600">Customer</p>
          <InfoRow icon={User} label="Name" value={displayName(booking)} />
          {phone && (
            <div className="flex items-start gap-2">
              <Phone size={12} className="text-zinc-600 mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="text-[9px] uppercase tracking-widest text-zinc-700 font-bold">Phone</p>
                <div className="flex items-center gap-2">
                  <a href={`tel:${phone}`} className="text-xs text-zinc-300 font-mono hover:text-white transition-colors">
                    {phone}
                  </a>
                  <a href={`sms:${phone}`} className="text-[10px] text-[#D4AF37] font-bold hover:text-amber-300 transition-colors">
                    Text
                  </a>
                </div>
              </div>
            </div>
          )}
          <InfoRow icon={Mail} label="Email" value={displayEmail(booking)} mono />
          {address && (
            <div className="flex items-start gap-2">
              <MapPin size={12} className="text-zinc-600 mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="text-[9px] uppercase tracking-widest text-zinc-700 font-bold">Address</p>
                {mapsUrl ? (
                  <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
                     className="text-xs text-[#D4AF37] hover:text-amber-300 transition-colors break-words">
                    {address}
                  </a>
                ) : (
                  <p className="text-xs text-zinc-300 break-words">{address}</p>
                )}
              </div>
            </div>
          )}
          {hasLinkedAccount(booking) ? (
            <div className="flex items-center gap-2 mt-1">
              <ShieldCheck size={12} className="text-[#D4AF37]" />
              <span className="text-[10px] text-[#D4AF37] font-bold">
                Linked Account · {booking.profiles?.loyalty_discount_pct ?? 0}% loyalty
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 mt-1">
              <AlertCircle size={12} className="text-zinc-600" />
              <span className="text-[10px] text-zinc-600">Guest — no account</span>
            </div>
          )}
        </div>

        {/* Column 2: Vehicles & services */}
        <div className="space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600">
            Services & Vehicles
          </p>

          {/* Vehicle 1 */}
          {(() => {
            const primaryAddonsTotal = (booking.addons_json ?? []).reduce((s, a) => s + a.price, 0);
            const avTotal = additionalVehicles.reduce((s, av) => {
              return s + (av.servicePrice ?? 0) + (av.selectedAddons ?? []).reduce((as, a) => as + a.price, 0);
            }, 0);
            const v1ServicePrice = booking.total_price - primaryAddonsTotal - avTotal;

            return (
              <>
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-600">
                      Vehicle {totalVehicles > 1 ? "1" : ""}
                    </span>
                    {booking.vehicle_size && (
                      <span className="text-[9px] text-zinc-600 capitalize">{booking.vehicle_size}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Car size={11} className="text-zinc-500 shrink-0" />
                    <span className="text-xs font-semibold text-zinc-200">{displayVehicle(booking)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Briefcase size={11} className="text-amber-500/60 shrink-0" />
                      <span className="text-[11px] text-zinc-400 font-medium">{displayService(booking)}</span>
                    </div>
                    {v1ServicePrice > 0 && (
                      <span className="text-[11px] text-emerald-400 font-mono font-semibold">${v1ServicePrice}</span>
                    )}
                  </div>
                  {booking.addons_json && booking.addons_json.length > 0 && (
                    <div className="pt-1.5 border-t border-white/[0.04] space-y-1">
                      <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-600 flex items-center gap-1">
                        <Package size={9} /> Add-ons
                      </p>
                      {booking.addons_json.map((a) => (
                        <div key={a.id} className="flex justify-between text-[11px]">
                          <span className="text-zinc-400">+ {a.label}</span>
                          <span className="text-zinc-500 font-mono">${a.price}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Additional vehicles */}
                {additionalVehicles.map((av, i) => (
                  <div key={i} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-600">
                        Vehicle {i + 2}
                      </span>
                      {av.vehicleSize && (
                        <span className="text-[9px] text-zinc-600 capitalize">{av.vehicleSize}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Car size={11} className="text-zinc-500 shrink-0" />
                      <span className="text-xs font-semibold text-zinc-200">
                        {[av.vehicleYear, av.vehicleMake, av.vehicleModel].filter(Boolean).join(" ") || "—"}
                      </span>
                    </div>
                    {av.serviceName && (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Briefcase size={11} className="text-amber-500/60 shrink-0" />
                          <span className="text-[11px] text-zinc-400 font-medium">{av.serviceName}</span>
                        </div>
                        {av.servicePrice != null && (
                          <span className="text-[11px] text-emerald-400 font-mono font-semibold">
                            ${av.servicePrice} <span className="text-zinc-600 text-[10px]">(-$25)</span>
                          </span>
                        )}
                      </div>
                    )}
                    {av.selectedAddons && av.selectedAddons.length > 0 && (
                      <div className="pt-1.5 border-t border-white/[0.04] space-y-1">
                        <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-600 flex items-center gap-1">
                          <Package size={9} /> Add-ons
                        </p>
                        {av.selectedAddons.map((a) => (
                          <div key={a.id} className="flex justify-between text-[11px]">
                            <span className="text-zinc-400">+ {a.label}</span>
                            <span className="text-zinc-500 font-mono">${a.price}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                {/* Price Breakdown */}
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 space-y-1">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-600 mb-2">Price Breakdown</p>

                  {/* Vehicle 1 */}
                  <div className="flex justify-between text-[11px]">
                    <span className="text-zinc-500">Vehicle 1{totalVehicles > 1 ? "" : ""} — {displayService(booking) || "Service"}</span>
                    <span className="text-zinc-400 font-mono">${v1ServicePrice}</span>
                  </div>
                  {(booking.addons_json ?? []).map((a) => (
                    <div key={a.id} className="flex justify-between text-[10px]">
                      <span className="text-zinc-600 pl-3">+ {a.label}</span>
                      <span className="text-zinc-600 font-mono">${a.price}</span>
                    </div>
                  ))}

                  {/* Additional vehicles */}
                  {additionalVehicles.map((av, i) => (
                    <div key={i}>
                      <div className="flex justify-between text-[11px] mt-1">
                        <span className="text-zinc-500">Vehicle {i + 2} — {av.serviceName || "Service"}</span>
                        <span className="text-zinc-400 font-mono">
                          ${av.servicePrice ?? 0}
                          <span className="text-zinc-700 ml-1">(-$25)</span>
                        </span>
                      </div>
                      {(av.selectedAddons ?? []).map((a) => (
                        <div key={a.id} className="flex justify-between text-[10px]">
                          <span className="text-zinc-600 pl-3">+ {a.label}</span>
                          <span className="text-zinc-600 font-mono">${a.price}</span>
                        </div>
                      ))}
                    </div>
                  ))}

                  <div className="border-t border-white/[0.06] pt-2 mt-1.5 flex justify-between text-sm font-bold">
                    <span className="text-zinc-300">Total</span>
                    <span className="text-white">${booking.total_price}</span>
                  </div>
                </div>
              </>
            );
          })()}
        </div>

        {/* Column 3: Notes + status update */}
        <div className="space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600">Notes & Status</p>
          {booking.notes ? (
            <div className="flex items-start gap-2">
              <StickyNote size={12} className="text-zinc-600 mt-0.5 shrink-0" />
              <pre className="text-[10px] text-zinc-500 leading-relaxed whitespace-pre-wrap font-sans">
                {booking.notes}
              </pre>
            </div>
          ) : (
            <p className="text-[10px] text-zinc-700 italic">No notes</p>
          )}

          <div className="pt-3 space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600">Update Status</p>
            <div className="flex flex-wrap gap-2">
              {statuses.map((s) => (
                <button
                  key={s}
                  onClick={() => onUpdateStatus({ id: booking.id, status: s })}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-tight border transition-all",
                    booking.status === s
                      ? STATUS_CONFIG[s].color + " opacity-100"
                      : "border-white/[0.06] text-zinc-600 hover:text-zinc-300"
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
  mono = false,
}: {
  icon: React.ElementType;
  label: string;
  value: string | null | undefined;
  mono?: boolean;
}) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2">
      <Icon size={12} className="text-zinc-600 mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-[9px] uppercase tracking-widest text-zinc-700 font-bold">{label}</p>
        <p className={cn("text-xs text-zinc-300 break-words", mono && "font-mono")}>{value}</p>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: AdminBooking["status"] }) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-tight border",
        config.color
      )}
    >
      <Icon size={12} />
      {status}
    </div>
  );
}

function BookingsSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 w-48 bg-zinc-900 rounded-lg" />
      <div className="h-[600px] bg-zinc-900/50 rounded-2xl" />
    </div>
  );
}
