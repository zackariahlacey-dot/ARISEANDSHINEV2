"use client";

import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listBookingVehicles,
  addBookingVehicle,
  updateBookingVehicle,
  removeBookingVehicle,
  setBookingVehicleStatus,
  type BookingVehicleRow,
  type Addon,
} from "@/app/actions/bookingVehicleActions";
import { useServices } from "@/hooks/use-admin-data";
import { ADMIN_ADDONS, getAddonPrice, getServiceBasePrice, type AdminAddon } from "@/lib/adminAddons";
import { useToast } from "@/components/admin/Toast";
import { Car, Plus, Pencil, Trash2, Check, Loader2, X, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

const VEHICLE_SIZE_OPTIONS = [
  { value: "medium",      label: "Sedan" },
  { value: "large",       label: "SUV" },
  { value: "extra_large", label: "3-Row / XL" },
] as const;

export function BookingVehiclesPanel({
  bookingId,
  onChange,
}: {
  bookingId: string;
  onChange?: () => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: rows, isLoading, refetch } = useQuery({
    queryKey: ["booking_vehicles", bookingId],
    queryFn: () => listBookingVehicles(bookingId),
    enabled: !!bookingId,
  });
  const { data: services } = useServices();
  const activeServices = useMemo(
    () => (services ?? []).filter((s: any) => s.is_active !== false),
    [services],
  );

  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);

  function bump() {
    refetch();
    queryClient.invalidateQueries({ queryKey: ["admin", "bookings"] });
    onChange?.();
  }

  async function handleAdd(input: any) {
    setBusy(true);
    const r = await addBookingVehicle(bookingId, input);
    setBusy(false);
    if (r.ok) { toast("Vehicle added"); setAdding(false); bump(); }
    else toast(r.error ?? "Failed to add", "error");
  }

  async function handleSave(id: string, patch: any) {
    setBusy(true);
    const r = await updateBookingVehicle(id, patch);
    setBusy(false);
    if (r.ok) { toast("Saved"); setEditingId(null); bump(); }
    else toast(r.error ?? "Failed", "error");
  }

  async function handleRemove(id: string) {
    if (!confirm("Remove this vehicle from the booking?")) return;
    setBusy(true);
    const r = await removeBookingVehicle(id);
    setBusy(false);
    if (r.ok) { toast("Removed"); bump(); }
    else toast(r.error ?? "Failed", "error");
  }

  async function handleStatus(id: string, status: "pending" | "in_progress" | "complete") {
    setBusy(true);
    const r = await setBookingVehicleStatus(id, status);
    setBusy(false);
    if (r.ok) { toast(status === "complete" ? "Marked complete" : "Status updated"); bump(); }
    else toast(r.error ?? "Failed", "error");
  }

  return (
    <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] overflow-hidden">
      <div className="px-4 py-2.5 border-b border-white/[0.04] flex items-center justify-between">
        <span className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">
          Vehicles & Pricing
        </span>
        <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/25">
          {rows?.length ?? 0} vehicle{rows?.length === 1 ? "" : "s"}
        </span>
      </div>

      {isLoading ? (
        <div className="px-4 py-6 flex justify-center">
          <Loader2 size={16} className="animate-spin text-amber-500" />
        </div>
      ) : (
        <div className="divide-y divide-white/[0.04]">
          {(rows ?? []).map((row, i) => (
            <VehicleRow
              key={row.id}
              row={row}
              index={i}
              editing={editingId === row.id}
              busy={busy}
              services={activeServices}
              onEdit={() => setEditingId(row.id)}
              onCancel={() => setEditingId(null)}
              onSave={(patch) => handleSave(row.id, patch)}
              onRemove={() => handleRemove(row.id)}
              onComplete={() => handleStatus(row.id, "complete")}
              onReopen={() => handleStatus(row.id, "pending")}
            />
          ))}
          {(rows?.length ?? 0) === 0 && (
            <div className="px-4 py-3 text-xs text-zinc-600 italic">No vehicles on this booking yet.</div>
          )}
        </div>
      )}

      {adding ? (
        <div className="px-4 py-3 border-t border-white/[0.04] bg-white/[0.02]">
          <VehicleEditor
            initial={{
              make: "", model: "", year: null, size: "medium",
              service_name: activeServices[0]?.name ?? "Full Detail", base_price: 0, addons_json: [],
            }}
            busy={busy}
            services={activeServices}
            onCancel={() => setAdding(false)}
            onSave={handleAdd}
          />
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="w-full px-4 py-3 border-t border-white/[0.04] flex items-center justify-center gap-2 text-xs font-black uppercase tracking-wider text-amber-400 hover:bg-amber-500/[0.06] transition-colors"
        >
          <Plus size={13} /> Add Vehicle
        </button>
      )}
    </div>
  );
}

function VehicleRow({
  row, index, editing, busy, services, onEdit, onCancel, onSave, onRemove, onComplete, onReopen,
}: {
  row: BookingVehicleRow;
  index: number;
  editing: boolean;
  busy: boolean;
  services: any[];
  onEdit: () => void;
  onCancel: () => void;
  onSave: (patch: any) => void;
  onRemove: () => void;
  onComplete: () => void;
  onReopen: () => void;
}) {
  const vehicleText = [row.year, row.make, row.model].filter(Boolean).join(" ").trim() || "Vehicle";
  const isComplete = row.status === "complete";

  if (editing) {
    return (
      <div className="px-4 py-3 bg-white/[0.02]">
        <VehicleEditor initial={row as any} busy={busy} services={services} onCancel={onCancel} onSave={onSave} />
      </div>
    );
  }

  return (
    <div className={cn("px-4 py-3", isComplete && "opacity-70")}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/25">
              Vehicle {index + 1}
            </span>
            {isComplete && (
              <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 flex items-center gap-0.5">
                <CheckCircle2 size={9} /> Done
              </span>
            )}
          </div>
          <p className="text-sm font-bold text-zinc-100 truncate">{vehicleText}</p>
          <p className="text-xs text-zinc-500 mt-0.5">{row.service_name ?? "—"}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm font-black text-zinc-200 tabular-nums">${Number(row.line_total ?? 0).toFixed(0)}</p>
          <div className="flex gap-1 mt-1 justify-end">
            <button onClick={onEdit} className="w-7 h-7 rounded-lg bg-white/[0.05] text-zinc-400 hover:text-amber-400 active:scale-90 transition-all flex items-center justify-center" title="Edit">
              <Pencil size={11} />
            </button>
            <button onClick={onRemove} className="w-7 h-7 rounded-lg bg-white/[0.05] text-zinc-400 hover:text-red-400 active:scale-90 transition-all flex items-center justify-center" title="Remove">
              <Trash2 size={11} />
            </button>
          </div>
        </div>
      </div>

      {(row.addons_json?.length ?? 0) > 0 && (
        <ul className="mt-2 space-y-1">
          {row.addons_json.map((a, i) => (
            <li key={i} className="flex items-center justify-between gap-2 text-xs">
              <span className="text-zinc-400 truncate">+ {a.label}</span>
              <span className="text-zinc-300 tabular-nums shrink-0">${Number(a.price ?? 0).toFixed(0)}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-2.5 flex gap-1.5">
        {isComplete ? (
          <button
            onClick={onReopen}
            disabled={busy}
            className="flex-1 text-[10px] font-black uppercase tracking-wider py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.07] text-zinc-400 hover:text-amber-400 transition-colors active:scale-95"
          >
            Reopen
          </button>
        ) : (
          <button
            onClick={onComplete}
            disabled={busy}
            className="flex-1 text-[10px] font-black uppercase tracking-wider py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25 transition-colors active:scale-95 flex items-center justify-center gap-1"
          >
            <Check size={11} /> Mark Done
          </button>
        )}
      </div>
    </div>
  );
}

function VehicleEditor({
  initial, busy, services, onSave, onCancel,
}: {
  initial: {
    make: string | null; model: string | null; year: number | null;
    size: string | null; service_name: string | null; service_id?: string | null;
    base_price: number; addons_json: Addon[];
  };
  busy: boolean;
  services: any[];
  onSave: (patch: any) => void;
  onCancel: () => void;
}) {
  const [make,  setMake]  = useState(initial.make  ?? "");
  const [model, setModel] = useState(initial.model ?? "");
  const [year,  setYear]  = useState<string>(initial.year != null ? String(initial.year) : "");
  const [size,  setSize]  = useState<string>(initial.size ?? "medium");
  const [service, setService] = useState<string>(initial.service_name ?? (services[0]?.name ?? ""));
  const [serviceId, setServiceId] = useState<string | null>(initial.service_id ?? services.find(s => s.name === initial.service_name)?.id ?? null);
  const [basePrice, setBasePrice] = useState<string>(String(Number(initial.base_price ?? 0) || ""));
  const [addons, setAddons] = useState<Addon[]>(Array.isArray(initial.addons_json) ? initial.addons_json : []);
  const [showCustomAddon, setShowCustomAddon] = useState(false);
  const [customLabel, setCustomLabel] = useState("");
  const [customPrice, setCustomPrice] = useState("");

  // Auto-recompute base price when service or size changes
  function pickService(svcName: string) {
    setService(svcName);
    const svc = services.find(s => s.name === svcName);
    setServiceId(svc?.id ?? null);
    if (svc) setBasePrice(String(getServiceBasePrice(svc, size as any)));
  }
  function pickSize(nextSize: string) {
    setSize(nextSize);
    const svc = services.find(s => s.name === service);
    if (svc) setBasePrice(String(getServiceBasePrice(svc, nextSize as any)));
    // Recompute size-dependent addon prices in place
    setAddons(prev => prev.map(a => {
      const cat = ADMIN_ADDONS.find(x => x.id === a.id);
      if (!cat) return a;
      return { ...a, price: getAddonPrice(a.id, nextSize) };
    }));
  }

  function toggleAddon(cat: AdminAddon) {
    setAddons(prev => {
      const exists = prev.find(a => a.id === cat.id);
      if (exists) return prev.filter(a => a.id !== cat.id);
      return [...prev, { id: cat.id, label: cat.label, price: getAddonPrice(cat.id, size) }];
    });
  }
  function addCustomAddon() {
    const label = customLabel.trim();
    const price = Number(customPrice);
    if (!label || isNaN(price)) return;
    setAddons(prev => [...prev, { id: `custom-${crypto.randomUUID()}`, label, price }]);
    setCustomLabel(""); setCustomPrice(""); setShowCustomAddon(false);
  }
  function removeAddonAt(i: number) {
    setAddons(prev => prev.filter((_, j) => j !== i));
  }

  function handleSubmit() {
    const baseNum = Number(basePrice);
    if (isNaN(baseNum) || baseNum < 0) {
      alert("Base price must be a non-negative number.");
      return;
    }
    onSave({
      make: make.trim(),
      model: model.trim(),
      year: year ? parseInt(year, 10) || null : null,
      size,
      service_id: serviceId,
      service_name: service,
      base_price: baseNum,
      addons_json: addons,
    });
  }

  const lineTotal = (Number(basePrice) || 0) + addons.reduce((s, a) => s + (Number(a.price) || 0), 0);
  const selectedIds = new Set(addons.map(a => a.id));

  return (
    <div className="space-y-2.5">
      {/* Vehicle ID */}
      <div className="grid grid-cols-3 gap-1.5">
        <input placeholder="Year"  value={year}  onChange={e => setYear(e.target.value)}
          className="bg-white/[0.05] border border-white/[0.08] rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500/50" />
        <input placeholder="Make"  value={make}  onChange={e => setMake(e.target.value)}
          className="bg-white/[0.05] border border-white/[0.08] rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500/50" />
        <input placeholder="Model" value={model} onChange={e => setModel(e.target.value)}
          className="bg-white/[0.05] border border-white/[0.08] rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500/50" />
      </div>

      {/* Size — drives service + addon price refresh */}
      <div className="grid grid-cols-3 gap-1.5">
        {VEHICLE_SIZE_OPTIONS.map(opt => (
          <button key={opt.value} onClick={() => pickSize(opt.value)}
            className={cn(
              "py-1.5 rounded-lg border text-[10px] font-black uppercase tracking-wider transition-all",
              size === opt.value ? "bg-amber-500 border-amber-500 text-black" : "border-white/[0.08] text-zinc-500"
            )}>
            {opt.label}
          </button>
        ))}
      </div>

      {/* Service — pulled from DB */}
      <div>
        <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-1">Service</p>
        <select value={service} onChange={e => pickService(e.target.value)}
          className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-2 py-2 text-xs text-white focus:outline-none focus:border-amber-500/50">
          {services.length === 0 && <option value="">— no services —</option>}
          {services.map((s: any) => (
            <option key={s.id} value={s.name} className="bg-zinc-900">{s.name}</option>
          ))}
        </select>
      </div>

      {/* Base price — overrideable */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500">Base</span>
        <span className="text-zinc-400">$</span>
        <input type="number" step="1" min="0" value={basePrice} onChange={e => setBasePrice(e.target.value)}
          className="flex-1 bg-white/[0.05] border border-white/[0.08] rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500/50" />
      </div>

      {/* Addons — chip picker. Only shows currently active add-ons (legacy
          items retired in July 2026 v5 stay in the ADMIN_ADDONS array so
          historical bookings still render their line items, but they never
          surface in the "add new" picker). Anything already selected on
          this booking still shows below in the selected list even if it's a
          legacy item. Custom add-ons (id starts with "custom-") are handled
          in the section below this. */}
      <div className="rounded-lg bg-white/[0.02] border border-white/[0.04] p-2 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Add-ons · tap to toggle</p>
          <button onClick={() => setShowCustomAddon(s => !s)} className="text-[9px] font-black text-amber-400 uppercase tracking-wider">
            {showCustomAddon ? "Cancel" : "+ Custom"}
          </button>
        </div>

        <div className="flex flex-wrap gap-1">
          {ADMIN_ADDONS.filter(cat => !cat.label.startsWith("[legacy]")).map(cat => {
            const on = selectedIds.has(cat.id);
            const price = getAddonPrice(cat.id, size);
            return (
              <button key={cat.id} onClick={() => toggleAddon(cat)}
                className={cn(
                  "px-2 py-1 rounded-full text-[10px] font-bold border transition-all flex items-center gap-1",
                  on ? "bg-amber-500/20 border-amber-500/40 text-amber-300" : "border-white/[0.08] text-zinc-500 hover:text-zinc-300"
                )}>
                {on && <Check size={9} />}
                <span>{cat.label}</span>
                <span className="opacity-60">${price}</span>
              </button>
            );
          })}
        </div>

        {/* Custom add-on row */}
        {showCustomAddon && (
          <div className="flex gap-1 pt-1.5 border-t border-white/[0.04]">
            <input placeholder="Custom label" value={customLabel} onChange={e => setCustomLabel(e.target.value)}
              className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded px-2 py-1 text-[11px] text-white focus:outline-none focus:border-amber-500/50" />
            <input type="number" placeholder="$" value={customPrice} onChange={e => setCustomPrice(e.target.value)}
              className="w-16 bg-white/[0.04] border border-white/[0.08] rounded px-2 py-1 text-[11px] text-white focus:outline-none focus:border-amber-500/50" />
            <button onClick={addCustomAddon}
              className="px-2 py-1 rounded bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[10px] font-black">
              Add
            </button>
          </div>
        )}

        {/* Custom add-ons we've added (not in catalogue) */}
        {addons.filter(a => a.id.startsWith("custom-")).length > 0 && (
          <div className="pt-1.5 border-t border-white/[0.04] space-y-1">
            {addons.map((a, i) => a.id.startsWith("custom-") ? (
              <div key={i} className="flex items-center gap-2 text-xs">
                <span className="text-zinc-300 flex-1 truncate">{a.label}</span>
                <span className="text-zinc-400 tabular-nums">${Number(a.price).toFixed(0)}</span>
                <button onClick={() => removeAddonAt(i)} className="text-zinc-500 hover:text-red-400">
                  <X size={11} />
                </button>
              </div>
            ) : null)}
          </div>
        )}
      </div>

      {/* Line total */}
      <div className="flex items-center justify-between px-1 pt-1">
        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Line Total</span>
        <span className="text-base font-black text-emerald-400 tabular-nums">${lineTotal.toFixed(0)}</span>
      </div>

      <div className="flex gap-2 pt-1">
        <button onClick={onCancel} className="flex-1 py-2 rounded-lg border border-white/[0.08] text-zinc-400 text-xs font-black uppercase tracking-wider">
          Cancel
        </button>
        <button onClick={handleSubmit} disabled={busy} className="flex-1 py-2 rounded-lg bg-amber-500 text-black text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5">
          {busy ? <Loader2 size={11} className="animate-spin" /> : <><Check size={11} /> Save</>}
        </button>
      </div>
    </div>
  );
}
