"use client";

import { useState } from "react";
import { X, Loader2, User, Car, CalendarClock, CreditCard, Banknote } from "lucide-react";
import { createAdminBooking } from "@/app/actions/createAdminBooking";

const TIME_SLOTS = (() => {
  const out: string[] = [];
  for (let h = 8; h <= 17; h++) {
    for (const m of [0, 30]) {
      if (h === 17 && m === 30) break;
      const isPM = h >= 12;
      const displayH = h > 12 ? h - 12 : h === 0 ? 12 : h;
      out.push(`${displayH}:${m === 0 ? "00" : "30"} ${isPM ? "PM" : "AM"}`);
    }
  }
  return out;
})();

const VEHICLE_SIZES = [
  { id: "compact" as const, label: "Compact" },
  { id: "sedan" as const, label: "Sedan" },
  { id: "suv" as const, label: "SUV / Truck" },
  { id: "xl" as const, label: "Van / XL" },
];

export type ServiceOption = {
  id: string;
  name: string;
  price_small: number;
  price_medium: number;
  price_large: number;
  price_extra_large: number;
};

function getPriceForSize(service: ServiceOption, size: keyof typeof VEHICLE_SIZE_KEYS): number {
  switch (size) {
    case "compact":
      return service.price_small;
    case "sedan":
      return service.price_medium;
    case "suv":
      return service.price_large;
    case "xl":
      return service.price_extra_large;
    default:
      return service.price_medium;
  }
}

const VEHICLE_SIZE_KEYS = { compact: 0, sedan: 1, suv: 2, xl: 3 };

export function NewBookingSheet({
  open,
  onClose,
  services,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  services: ServiceOption[];
  onSuccess: (bookingId: string, invoiceSent: boolean) => void;
}) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [vehicleYear, setVehicleYear] = useState("");
  const [vehicleMake, setVehicleMake] = useState("");
  const [vehicleModel, setVehicleModel] = useState("");
  const [vehicleSize, setVehicleSize] = useState<keyof typeof VEHICLE_SIZE_KEYS>("sedan");
  const [serviceId, setServiceId] = useState("");
  const [bookingDate, setBookingDate] = useState("");
  const [bookingTime, setBookingTime] = useState("");
  const [paymentOption, setPaymentOption] = useState<"pay_at_arrival" | "send_invoice">("pay_at_arrival");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedService = services.find((s) => s.id === serviceId);
  const totalPrice = selectedService ? getPriceForSize(selectedService, vehicleSize) : 0;

  const resetForm = () => {
    setFirstName("");
    setLastName("");
    setEmail("");
    setPhone("");
    setVehicleYear("");
    setVehicleMake("");
    setVehicleModel("");
    setVehicleSize("sedan");
    setServiceId("");
    setBookingDate("");
    setBookingTime("");
    setPaymentOption("pay_at_arrival");
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedService) {
      setError("Please select a service.");
      return;
    }
    setSubmitting(true);
    setError(null);
    const result = await createAdminBooking({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      phone: phone.trim(),
      vehicleYear: vehicleYear.trim(),
      vehicleMake: vehicleMake.trim(),
      vehicleModel: vehicleModel.trim(),
      vehicleSize,
      serviceId: selectedService.id,
      serviceName: selectedService.name,
      totalPrice,
      bookingDate,
      bookingTime,
      paymentOption,
    });
    setSubmitting(false);
    if (result.success) {
      resetForm();
      onSuccess(result.bookingId, result.invoiceUrl != null);
      onClose();
    } else {
      setError(result.error);
    }
  };

  if (!open) return null;

  const minDate = new Date().toISOString().split("T")[0];

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        aria-hidden
        onClick={onClose}
      />
      <div
        className="fixed top-0 right-0 z-50 h-full w-full max-w-lg bg-zinc-900 border-l border-white/10 shadow-2xl flex flex-col"
        role="dialog"
        aria-labelledby="new-booking-title"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <h2 id="new-booking-title" className="text-lg font-bold text-white">
            New Booking
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-5 space-y-4">
            {/* Customer */}
            <div className="space-y-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                <User size={12} /> Customer
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-medium text-zinc-400 mb-1">First name</label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-zinc-400 mb-1">Last name</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-medium text-zinc-400 mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-zinc-400 mb-1">Phone</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white"
                  required
                />
              </div>
            </div>

            {/* Vehicle */}
            <div className="space-y-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                <Car size={12} /> Vehicle
              </p>
              <div className="grid grid-cols-4 gap-2">
                <div className="col-span-1">
                  <label className="block text-[10px] font-medium text-zinc-400 mb-1">Year</label>
                  <input
                    type="text"
                    value={vehicleYear}
                    onChange={(e) => setVehicleYear(e.target.value)}
                    placeholder="2024"
                    className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white"
                    required
                  />
                </div>
                <div className="col-span-1">
                  <label className="block text-[10px] font-medium text-zinc-400 mb-1">Make</label>
                  <input
                    type="text"
                    value={vehicleMake}
                    onChange={(e) => setVehicleMake(e.target.value)}
                    className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white"
                    required
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-[10px] font-medium text-zinc-400 mb-1">Model</label>
                  <input
                    type="text"
                    value={vehicleModel}
                    onChange={(e) => setVehicleModel(e.target.value)}
                    className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-medium text-zinc-400 mb-1">Size</label>
                <div className="flex flex-wrap gap-2">
                  {VEHICLE_SIZES.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setVehicleSize(s.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        vehicleSize === s.id
                          ? "bg-[#D4AF37] text-zinc-950"
                          : "bg-zinc-800/80 text-zinc-400 hover:bg-zinc-800"
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Service */}
            <div>
              <label className="block text-[10px] font-medium text-zinc-400 mb-1">Service</label>
              <select
                value={serviceId}
                onChange={(e) => setServiceId(e.target.value)}
                className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white"
                required
              >
                <option value="">Select service</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} — ${getPriceForSize(s, vehicleSize).toFixed(2)}
                  </option>
                ))}
              </select>
            </div>

            {/* Date & Time */}
            <div className="space-y-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                <CalendarClock size={12} /> Schedule
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-medium text-zinc-400 mb-1">Date</label>
                  <input
                    type="date"
                    value={bookingDate}
                    onChange={(e) => setBookingDate(e.target.value)}
                    min={minDate}
                    className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-zinc-400 mb-1">Time</label>
                  <select
                    value={bookingTime}
                    onChange={(e) => setBookingTime(e.target.value)}
                    className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white"
                    required
                  >
                    <option value="">Select time</option>
                    {TIME_SLOTS.map((slot) => (
                      <option key={slot} value={slot}>
                        {slot}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Payment option */}
            <div className="space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                <CreditCard size={12} /> Payment
              </p>
              <div className="flex rounded-xl bg-zinc-950/80 border border-zinc-800 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setPaymentOption("pay_at_arrival")}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
                    paymentOption === "pay_at_arrival"
                      ? "bg-[#D4AF37] text-zinc-950"
                      : "text-zinc-400 hover:bg-zinc-800/50"
                  }`}
                >
                  <Banknote size={14} />
                  Pay at Arrival
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentOption("send_invoice")}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
                    paymentOption === "send_invoice"
                      ? "bg-[#D4AF37] text-zinc-950"
                      : "text-zinc-400 hover:bg-zinc-800/50"
                  }`}
                >
                  <CreditCard size={14} />
                  Send Stripe Invoice
                </button>
              </div>
            </div>

            {totalPrice > 0 && (
              <p className="text-sm font-bold text-[#D4AF37]">
                Total: ${totalPrice.toFixed(2)}
              </p>
            )}

            {error && (
              <p className="text-xs text-red-400">{error}</p>
            )}
          </div>

          <div className="sticky bottom-0 px-5 py-4 border-t border-white/10 bg-zinc-900">
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-xl text-sm font-bold bg-[#D4AF37] text-zinc-950 hover:bg-[#c9a227] disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Creating…
                </>
              ) : (
                "Create Booking"
              )}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
