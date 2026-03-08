"use client";

import { useState, useEffect } from "react";
import { Loader2, CheckCircle, Package } from "lucide-react";
import { updateService } from "@/app/actions/updateService";

export type ServiceRow = {
  id: string;
  name: string;
  description: string | null;
  price_small: number;
  price_medium: number;
  price_large: number;
  price_extra_large: number;
  is_subscription: boolean;
};

export function ServicesManager({ initialServices }: { initialServices: ServiceRow[] }) {
  const [services, setServices] = useState<ServiceRow[]>(initialServices);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ id: string; message: string } | null>(null);

  useEffect(() => {
    setServices(initialServices);
  }, [initialServices]);

  const handleChange = (
    id: string,
    field: keyof Omit<ServiceRow, "id" | "is_subscription" | "description">,
    value: string | number
  ) => {
    setServices((prev) =>
      prev.map((s) =>
        s.id === id
          ? {
              ...s,
              [field]: typeof value === "number" ? value : value,
            }
          : s
      )
    );
  };

  const handleSave = async (row: ServiceRow) => {
    setSavingId(row.id);
    setToast(null);
    const result = await updateService({
      id: row.id,
      name: row.name.trim() || undefined,
      price_small: Number(row.price_small),
      price_medium: Number(row.price_medium),
      price_large: Number(row.price_large),
      price_extra_large: Number(row.price_extra_large),
    });
    setSavingId(null);
    if (result.success) {
      setToast({ id: row.id, message: "Changes saved." });
      setTimeout(() => setToast(null), 3000);
    } else {
      setToast({ id: row.id, message: result.error ?? "Failed to save." });
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/[0.06] bg-zinc-900/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[720px]">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="text-left px-5 py-3.5 text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-500">
                  Service
                </th>
                <th className="text-left px-4 py-3.5 text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-500">
                  Small
                </th>
                <th className="text-left px-4 py-3.5 text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-500">
                  Medium
                </th>
                <th className="text-left px-4 py-3.5 text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-500">
                  Large
                </th>
                <th className="text-left px-4 py-3.5 text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-500">
                  Extra Large
                </th>
                <th className="text-left px-4 py-3.5 text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-500 w-32">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {services.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors"
                >
                  <td className="px-5 py-3">
                    <input
                      type="text"
                      value={row.name}
                      onChange={(e) => handleChange(row.id, "name", e.target.value)}
                      className="w-full min-w-[140px] bg-zinc-950/80 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-[#D4AF37]/50 focus:ring-1 focus:ring-[#D4AF37]/20 outline-none"
                      placeholder="Service name"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={row.price_small}
                      onChange={(e) =>
                        handleChange(row.id, "price_small", parseFloat(e.target.value) || 0)
                      }
                      className="w-20 bg-zinc-950/80 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white tabular-nums focus:border-[#D4AF37]/50 focus:ring-1 focus:ring-[#D4AF37]/20 outline-none"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={row.price_medium}
                      onChange={(e) =>
                        handleChange(row.id, "price_medium", parseFloat(e.target.value) || 0)
                      }
                      className="w-20 bg-zinc-950/80 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white tabular-nums focus:border-[#D4AF37]/50 focus:ring-1 focus:ring-[#D4AF37]/20 outline-none"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={row.price_large}
                      onChange={(e) =>
                        handleChange(row.id, "price_large", parseFloat(e.target.value) || 0)
                      }
                      className="w-20 bg-zinc-950/80 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white tabular-nums focus:border-[#D4AF37]/50 focus:ring-1 focus:ring-[#D4AF37]/20 outline-none"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={row.price_extra_large}
                      onChange={(e) =>
                        handleChange(row.id, "price_extra_large", parseFloat(e.target.value) || 0)
                      }
                      className="w-20 bg-zinc-950/80 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white tabular-nums focus:border-[#D4AF37]/50 focus:ring-1 focus:ring-[#D4AF37]/20 outline-none"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleSave(row)}
                        disabled={savingId === row.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#D4AF37] text-zinc-950 hover:bg-[#c9a227] disabled:opacity-60 transition-colors"
                      >
                        {savingId === row.id ? (
                          <>
                            <Loader2 size={12} className="animate-spin" />
                            Saving…
                          </>
                        ) : (
                          "Save Changes"
                        )}
                      </button>
                      {toast?.id === row.id && (
                        <span
                          className={`flex items-center gap-1 text-[10px] ${
                            toast.message.startsWith("Changes saved")
                              ? "text-emerald-400"
                              : "text-red-400"
                          }`}
                        >
                          {toast.message.startsWith("Changes saved") ? (
                            <CheckCircle size={12} />
                          ) : null}
                          {toast.message}
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {services.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 rounded-2xl border border-white/[0.06] bg-zinc-900/40 text-zinc-500">
          <Package size={32} className="mb-3 opacity-50" />
          <p className="text-sm font-medium">No services yet</p>
          <p className="text-xs mt-0.5">Add services in your Supabase dashboard.</p>
        </div>
      )}
    </div>
  );
}
