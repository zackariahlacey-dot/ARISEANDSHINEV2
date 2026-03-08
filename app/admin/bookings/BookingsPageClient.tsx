"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, CheckCircle } from "lucide-react";
import { BookingsTable, type BookingRow } from "./BookingsTable";
import { NewBookingSheet, type ServiceOption } from "./NewBookingSheet";

export function BookingsPageClient({
  initialBookings,
  services,
}: {
  initialBookings: BookingRow[];
  services: ServiceOption[];
}) {
  const router = useRouter();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const handleSuccess = (_bookingId: string, invoiceSent: boolean) => {
    router.refresh();
    setToast(invoiceSent ? "Booking created and invoice sent!" : "Booking created!");
  };

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white">Bookings</h2>
          <p className="text-sm text-zinc-500 mt-0.5">
            All appointments — search, sort, and update status in real time
          </p>
        </div>
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-[#D4AF37] text-zinc-950 hover:bg-[#c9a227] transition-colors shrink-0"
        >
          <Plus size={18} />
          New Booking
        </button>
      </div>

      <BookingsTable initialBookings={initialBookings} />

      <NewBookingSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        services={services}
        onSuccess={handleSuccess}
      />

      {/* Success toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-[60] flex max-w-[calc(100vw-2rem)] items-center gap-3 rounded-2xl border border-yellow-500/30 bg-black/80 px-4 py-3 shadow-[0_0_20px_rgba(234,179,8,0.15)] backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 duration-300">
          <CheckCircle className="h-5 w-5 shrink-0 text-amber-400" aria-hidden />
          <p className="text-sm font-medium text-amber-200">{toast}</p>
        </div>
      )}
    </div>
  );
}
