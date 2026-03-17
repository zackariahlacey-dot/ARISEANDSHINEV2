"use client";

import { useState, useEffect } from "react";
import { Loader2, CheckCircle, Package, Plus, Trash2, Tag } from "lucide-react";
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

export type AddonRow = {
  id: string;
  name: string;
  price: number;
};

export function ServicesManager({ initialServices }: { initialServices: ServiceRow[] }) {
  const [services, setServices] = useState<ServiceRow[]>(initialServices);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ id: string; message: string } | null>(null);

  // Simplified Addons state (Mocking for now, can be linked to service_addons table)
  const [addons, setAddons] = useState<AddonRow[]>([
    { id: '1', name: 'Pet Hair Removal', price: 30 },
    { id: '2', name: 'Engine Bay Detail', price: 50 },
    { id: '3', name: 'Ceramic Coating (Wheels)', price: 100 },
  ]);

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

  const addAddon = () => {
    const name = prompt("Add-on Name:");
    const price = parseFloat(prompt("Price ($):") || "0");
    if (name && !isNaN(price)) {
      setAddons([...addons, { id: Math.random().toString(), name, price }]);
    }
  };

  const removeAddon = (id: string) => {
    if (confirm("Remove this add-on?")) {
      setAddons(addons.filter(a => a.id !== id));
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Main Packages */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Package size={18} className="text-[#D4AF37]" />
          <h3 className="text-lg font-bold text-white">Main Service Packages</h3>
        </div>
        
        {/* Desktop Table View */}
        <div className="hidden md:block rounded-2xl border border-white/[0.06] bg-zinc-900/60 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[720px]">
              <thead>
                <tr className="border-b border-white/[0.06] bg-zinc-950/40">
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
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 text-xs">$</span>
                        <input
                          type="number"
                          min={0}
                          step={0.01}
                          value={row.price_small}
                          onChange={(e) =>
                            handleChange(row.id, "price_small", parseFloat(e.target.value) || 0)
                          }
                          className="w-20 bg-zinc-950/80 border border-zinc-800 rounded-lg pl-6 pr-3 py-2 text-sm text-white tabular-nums focus:border-[#D4AF37]/50 focus:ring-1 focus:ring-[#D4AF37]/20 outline-none"
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 text-xs">$</span>
                        <input
                          type="number"
                          min={0}
                          step={0.01}
                          value={row.price_medium}
                          onChange={(e) =>
                            handleChange(row.id, "price_medium", parseFloat(e.target.value) || 0)
                          }
                          className="w-20 bg-zinc-950/80 border border-zinc-800 rounded-lg pl-6 pr-3 py-2 text-sm text-white tabular-nums focus:border-[#D4AF37]/50 focus:ring-1 focus:ring-[#D4AF37]/20 outline-none"
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 text-xs">$</span>
                        <input
                          type="number"
                          min={0}
                          step={0.01}
                          value={row.price_large}
                          onChange={(e) =>
                            handleChange(row.id, "price_large", parseFloat(e.target.value) || 0)
                          }
                          className="w-20 bg-zinc-950/80 border border-zinc-800 rounded-lg pl-6 pr-3 py-2 text-sm text-white tabular-nums focus:border-[#D4AF37]/50 focus:ring-1 focus:ring-[#D4AF37]/20 outline-none"
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 text-xs">$</span>
                        <input
                          type="number"
                          min={0}
                          step={0.01}
                          value={row.price_extra_large}
                          onChange={(e) =>
                            handleChange(row.id, "price_extra_large", parseFloat(e.target.value) || 0)
                          }
                          className="w-20 bg-zinc-950/80 border border-zinc-800 rounded-lg pl-6 pr-3 py-2 text-sm text-white tabular-nums focus:border-[#D4AF37]/50 focus:ring-1 focus:ring-[#D4AF37]/20 outline-none"
                        />
                      </div>
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
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            "Save"
                          )}
                        </button>
                        {toast?.id === row.id && (
                          <CheckCircle size={14} className="text-emerald-400 animate-in fade-in zoom-in duration-300" />
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden flex flex-col gap-4">
          {services.map((row) => (
            <div key={row.id} className="bg-zinc-900/60 border border-white/[0.06] rounded-2xl p-4 flex flex-col gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5">Service Name</label>
                <input
                  type="text"
                  value={row.name}
                  onChange={(e) => handleChange(row.id, "name", e.target.value)}
                  className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-[#D4AF37]/50 transition-all"
                  placeholder="Service name"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5">Small</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 text-xs">$</span>
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={row.price_small}
                      onChange={(e) => handleChange(row.id, "price_small", parseFloat(e.target.value) || 0)}
                      className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl pl-7 pr-3 py-2.5 text-sm text-white tabular-nums outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5">Medium</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 text-xs">$</span>
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={row.price_medium}
                      onChange={(e) => handleChange(row.id, "price_medium", parseFloat(e.target.value) || 0)}
                      className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl pl-7 pr-3 py-2.5 text-sm text-white tabular-nums outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5">Large</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 text-xs">$</span>
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={row.price_large}
                      onChange={(e) => handleChange(row.id, "price_large", parseFloat(e.target.value) || 0)}
                      className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl pl-7 pr-3 py-2.5 text-sm text-white tabular-nums outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5">Extra Large</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 text-xs">$</span>
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={row.price_extra_large}
                      onChange={(e) => handleChange(row.id, "price_extra_large", parseFloat(e.target.value) || 0)}
                      className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl pl-7 pr-3 py-2.5 text-sm text-white tabular-nums outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => handleSave(row)}
                  disabled={savingId === row.id}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold bg-[#D4AF37] text-zinc-950 hover:bg-[#c9a227] transition-all disabled:opacity-60"
                >
                  {savingId === row.id ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </button>
                {toast?.id === row.id && (
                  <div className="ml-3">
                    <CheckCircle size={20} className="text-emerald-400 animate-in fade-in zoom-in duration-300" />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Service Add-ons (New Section) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <Tag size={18} className="text-[#D4AF37]" />
            <h3 className="text-lg font-bold text-white">Service Add-ons</h3>
          </div>
          <button 
            onClick={addAddon}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-white/[0.05] border border-white/[0.08] text-zinc-300 hover:text-white hover:bg-white/[0.08] transition-all"
          >
            <Plus size={14} /> Add Option
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {addons.map((addon) => (
            <div key={addon.id} className="bg-zinc-900/60 border border-white/[0.06] rounded-2xl p-4 flex items-center justify-between group">
              <div>
                <p className="text-sm font-bold text-zinc-200">{addon.name}</p>
                <p className="text-xs font-black text-[#D4AF37] mt-1">+${addon.price.toFixed(2)}</p>
              </div>
              <button 
                onClick={() => removeAddon(addon.id)}
                className="p-2 rounded-lg text-zinc-600 hover:text-rose-400 hover:bg-rose-500/10 transition-all opacity-0 group-hover:opacity-100"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </section>

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
