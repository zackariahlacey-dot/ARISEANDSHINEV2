"use client";

import { useState, useEffect, useRef } from "react";
import {
  Plus, Trash2, Pencil, Download, Loader2, Sparkles,
  Upload, X, ExternalLink, Check, RefreshCw,
} from "lucide-react";
import {
  getExpenses, createExpense, updateExpense, deleteExpense,
  uploadReceipt, type Expense,
} from "@/app/actions/taxActions";
import { EXPENSE_CATEGORIES, getCategoryMeta, type ExpenseCategoryId } from "@/lib/mileage";
import { cn } from "@/lib/utils";
import { Modal } from "@/components/admin/Modal";
import { useToast } from "@/components/admin/Toast";

// ── CSV export ────────────────────────────────────────────────────────────────
function exportCsv(expenses: Expense[], year: number) {
  const rows = [
    ["Date", "Category", "Vendor", "Description", "Amount", "Notes"],
    ...expenses.map(e => [
      e.date,
      e.category,
      e.vendor ?? "",
      e.description ?? "",
      e.amount.toFixed(2),
      e.notes ?? "",
    ]),
  ];
  const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url;
  a.download = `expenses-${year}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Blank form ─────────────────────────────────────────────────────────────────
const blankForm = () => ({
  date:        new Date().toISOString().slice(0, 10),
  category:    "fuel" as ExpenseCategoryId,
  amount:      "",
  vendor:      "",
  description: "",
  notes:       "",
});

type FormState = ReturnType<typeof blankForm>;

// ── Category dot ──────────────────────────────────────────────────────────────
function CatDot({ category }: { category: string }) {
  const meta = getCategoryMeta(category);
  return (
    <span
      className="inline-block w-2 h-2 rounded-full shrink-0"
      style={{ backgroundColor: meta.color }}
    />
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export function ExpensesTab() {
  const { toast } = useToast();
  const currentYear = new Date().getFullYear();

  const [year,        setYear]        = useState(currentYear);
  const [catFilter,   setCatFilter]   = useState("all");
  const [expenses,    setExpenses]    = useState<Expense[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [showForm,    setShowForm]    = useState(false);
  const [editId,      setEditId]      = useState<string | null>(null);
  const [form,        setForm]        = useState<FormState>(blankForm());
  const [saving,      setSaving]      = useState(false);

  // Receipt state
  const [receiptFile,    setReceiptFile]    = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [parsing,        setParsing]        = useState(false);
  const [uploading,      setUploading]      = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function load() {
    setLoading(true);
    const data = await getExpenses(year, undefined, catFilter === "all" ? undefined : catFilter);
    setExpenses(data);
    setLoading(false);
  }

  useEffect(() => { load(); }, [year, catFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  const total = expenses.reduce((s, e) => s + Number(e.amount), 0);

  // Category totals
  const catTotals = EXPENSE_CATEGORIES.map(cat => ({
    ...cat,
    total: expenses.filter(e => e.category === cat.id).reduce((s, e) => s + Number(e.amount), 0),
  })).filter(c => c.total > 0);

  function openAdd() {
    setForm(blankForm());
    setEditId(null);
    setReceiptFile(null);
    setReceiptPreview(null);
    setShowForm(true);
  }

  function openEdit(e: Expense) {
    setForm({
      date:        e.date,
      category:    e.category,
      amount:      String(e.amount),
      vendor:      e.vendor ?? "",
      description: e.description ?? "",
      notes:       e.notes ?? "",
    });
    setEditId(e.id);
    setReceiptFile(null);
    setReceiptPreview(e.receipt_url ?? null);
    setShowForm(true);
  }

  function onFileChange(file: File | null) {
    if (!file) return;
    setReceiptFile(file);
    const reader = new FileReader();
    reader.onload = ev => setReceiptPreview(ev.target?.result as string ?? null);
    reader.readAsDataURL(file);
  }

  async function handleAiScan() {
    if (!receiptFile) return;
    setParsing(true);
    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((res, rej) => {
        reader.onload = ev => {
          const result = ev.target?.result as string;
          // Strip data:...;base64, prefix
          res(result.split(",")[1] ?? "");
        };
        reader.onerror = rej;
        reader.readAsDataURL(receiptFile);
      });

      const resp = await fetch("/api/receipt-parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64, mimeType: receiptFile.type }),
      });
      const data = await resp.json();

      if (!resp.ok || !data.ok) {
        toast(data.error ?? "Could not parse receipt", "error");
        return;
      }

      setForm(prev => ({
        ...prev,
        ...(data.amount   ? { amount:      String(data.amount)   } : {}),
        ...(data.date     ? { date:        data.date             } : {}),
        ...(data.vendor   ? { vendor:      data.vendor           } : {}),
        ...(data.category ? { category:    data.category as ExpenseCategoryId } : {}),
        ...(data.description ? { description: data.description   } : {}),
      }));
      toast("Receipt scanned — review and save");
    } catch {
      toast("AI scan failed", "error");
    } finally {
      setParsing(false);
    }
  }

  async function handleSave() {
    if (!form.amount || isNaN(Number(form.amount))) {
      toast("Enter a valid amount", "error");
      return;
    }
    setSaving(true);
    try {
      let receiptUrl: string | undefined;
      let receiptFilename: string | undefined;

      // Upload new receipt if a file was selected
      if (receiptFile) {
        setUploading(true);
        const fd = new FormData();
        fd.append("file", receiptFile);
        const up = await uploadReceipt(fd);
        setUploading(false);
        if (!up.ok) { toast(up.error ?? "Upload failed", "error"); setSaving(false); return; }
        receiptUrl      = up.url;
        receiptFilename = up.filename;
      }

      if (editId) {
        const r = await updateExpense(editId, {
          date:        form.date,
          category:    form.category,
          amount:      Number(form.amount),
          vendor:      form.vendor || undefined,
          description: form.description || undefined,
          notes:       form.notes || undefined,
        });
        if (!r.ok) { toast(r.error ?? "Failed", "error"); return; }
        toast("Expense updated");
      } else {
        const r = await createExpense({
          date:             form.date,
          category:         form.category,
          amount:           Number(form.amount),
          vendor:           form.vendor || undefined,
          description:      form.description || undefined,
          receipt_url:      receiptUrl,
          receipt_filename: receiptFilename,
          notes:            form.notes || undefined,
        });
        if (!r.ok) { toast(r.error ?? "Failed", "error"); return; }
        toast("Expense added");
      }

      setShowForm(false);
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this expense?")) return;
    const r = await deleteExpense(id);
    if (r.ok) { toast("Deleted"); await load(); }
    else toast(r.error ?? "Failed", "error");
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <select
            value={year}
            onChange={e => setYear(Number(e.target.value))}
            className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-sm text-white focus:outline-none"
          >
            {[currentYear, currentYear - 1, currentYear - 2].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <select
            value={catFilter}
            onChange={e => setCatFilter(e.target.value)}
            className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-sm text-white focus:outline-none"
          >
            <option value="all">All categories</option>
            {EXPENSE_CATEGORIES.map(c => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
          <button onClick={load} className="rounded-lg border border-white/[0.08] p-1.5 text-zinc-500 hover:text-white transition-colors">
            <RefreshCw size={13} />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => exportCsv(expenses, year)}
            disabled={!expenses.length}
            className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] px-3 py-1.5 text-xs font-bold text-zinc-500 hover:text-white transition-colors disabled:opacity-30"
          >
            <Download size={12} /> CSV
          </button>
          <button
            onClick={openAdd}
            className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-black text-black"
          >
            <Plus size={12} /> Add
          </button>
        </div>
      </div>

      {/* Category summary pills */}
      {catTotals.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {catTotals.map(c => (
            <button
              key={c.id}
              onClick={() => setCatFilter(catFilter === c.id ? "all" : c.id)}
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold transition-all",
                catFilter === c.id
                  ? "border-amber-500 bg-amber-500/10 text-amber-400"
                  : "border-white/[0.08] text-zinc-500 hover:text-zinc-300"
              )}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: c.color }} />
              {c.label}
              <span className="text-zinc-400">${c.total.toFixed(0)}</span>
            </button>
          ))}
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 size={22} className="animate-spin text-amber-500" />
        </div>
      ) : !expenses.length ? (
        <div className="py-10 text-center">
          <p className="text-sm text-zinc-600">No expenses for this period.</p>
          <button onClick={openAdd} className="mt-3 text-xs text-amber-500 font-bold">+ Add first expense</button>
        </div>
      ) : (
        <div className="space-y-1.5">
          {expenses.map(e => {
            const meta = getCategoryMeta(e.category);
            return (
              <div
                key={e.id}
                className="flex items-center gap-3 rounded-xl border border-white/[0.05] bg-white/[0.02] px-3 py-2.5"
              >
                <CatDot category={e.category} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold text-zinc-200">
                    {e.vendor ?? meta.label} · {e.date}
                  </p>
                  <p className="truncate text-[10px] text-zinc-600">
                    {e.description ?? meta.label}
                  </p>
                </div>
                {e.receipt_url && (
                  <a
                    href={e.receipt_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 text-zinc-600 hover:text-zinc-400"
                    title="View receipt"
                  >
                    <ExternalLink size={11} />
                  </a>
                )}
                <p className="shrink-0 text-sm font-black text-white">${Number(e.amount).toFixed(2)}</p>
                <button onClick={() => openEdit(e)} className="shrink-0 text-zinc-600 hover:text-zinc-400 transition-colors">
                  <Pencil size={12} />
                </button>
                <button onClick={() => handleDelete(e.id)} className="shrink-0 text-zinc-700 hover:text-red-400 transition-colors">
                  <Trash2 size={12} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer total */}
      {!loading && expenses.length > 0 && (
        <div className="flex items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3">
          <p className="text-xs font-black uppercase tracking-widest text-zinc-500">
            Total {catFilter !== "all" ? getCategoryMeta(catFilter).label : year}
          </p>
          <p className="text-xl font-black text-amber-500">${total.toFixed(2)}</p>
        </div>
      )}

      {/* Add / Edit modal */}
      <Modal open={showForm} onClose={() => setShowForm(false)}>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-black">{editId ? "Edit Expense" : "Add Expense"}</h2>
            <button onClick={() => setShowForm(false)} className="text-zinc-600 hover:text-white">
              <X size={16} />
            </button>
          </div>

          {/* Receipt upload / AI scan */}
          <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3 space-y-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Receipt (optional)</p>

            {receiptPreview ? (
              <div className="flex items-center gap-3">
                {receiptFile ? (
                  <img src={receiptPreview} alt="Receipt" className="h-16 w-16 rounded-lg object-cover border border-white/[0.08]" />
                ) : (
                  <a href={receiptPreview} target="_blank" rel="noopener noreferrer"
                    className="flex h-16 w-16 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.04] text-zinc-500 hover:text-zinc-300">
                    <ExternalLink size={16} />
                  </a>
                )}
                <div className="flex flex-col gap-1.5">
                  {receiptFile && (
                    <button
                      onClick={handleAiScan}
                      disabled={parsing}
                      className="flex items-center gap-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 px-2.5 py-1.5 text-xs font-black text-amber-400 disabled:opacity-60"
                    >
                      {parsing ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
                      {parsing ? "Scanning…" : "Scan with AI"}
                    </button>
                  )}
                  <button
                    onClick={() => { setReceiptFile(null); setReceiptPreview(null); }}
                    className="text-[10px] text-zinc-600 hover:text-red-400 transition-colors"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => fileRef.current?.click()}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-white/[0.10] py-3 text-xs text-zinc-500 hover:text-zinc-300 hover:border-white/[0.20] transition-all"
              >
                <Upload size={13} /> Upload receipt image
              </button>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => onFileChange(e.target.files?.[0] ?? null)}
            />
          </div>

          {/* Form fields */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-zinc-500">Date</p>
              <input
                type="date"
                value={form.date}
                onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white focus:border-amber-500/50 focus:outline-none"
              />
            </div>
            <div>
              <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-zinc-500">Amount ($)</p>
              <input
                type="number"
                step="0.01"
                value={form.amount}
                onChange={e => setForm(p => ({ ...p, amount: e.target.value }))}
                placeholder="0.00"
                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white focus:border-amber-500/50 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-zinc-500">Category</p>
            <div className="grid grid-cols-3 gap-1.5">
              {EXPENSE_CATEGORIES.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setForm(p => ({ ...p, category: c.id as ExpenseCategoryId }))}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-[10px] font-bold transition-all",
                    form.category === c.id
                      ? "border-amber-500 bg-amber-500/10 text-amber-400"
                      : "border-white/[0.08] text-zinc-500"
                  )}
                >
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                  <span className="truncate">{c.label.split(" ")[0]}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-zinc-500">Vendor</p>
            <input
              value={form.vendor}
              onChange={e => setForm(p => ({ ...p, vendor: e.target.value }))}
              placeholder="Shell, Amazon, AutoZone…"
              className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white focus:border-amber-500/50 focus:outline-none"
            />
          </div>

          <div>
            <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-zinc-500">Description</p>
            <input
              value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              placeholder="What was purchased"
              className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white focus:border-amber-500/50 focus:outline-none"
            />
          </div>

          <div>
            <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-zinc-500">Notes (optional)</p>
            <input
              value={form.notes}
              onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
              placeholder="Any additional notes"
              className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white focus:border-amber-500/50 focus:outline-none"
            />
          </div>

          <div className="flex gap-2 pt-1">
            <button
              onClick={() => setShowForm(false)}
              className="flex-1 rounded-xl border border-white/[0.08] py-3 text-sm font-black text-zinc-400"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-amber-500 py-3 text-sm font-black text-black disabled:opacity-60"
            >
              {saving ? (
                <><Loader2 size={14} className="animate-spin" /> {uploading ? "Uploading…" : "Saving…"}</>
              ) : (
                <><Check size={14} /> {editId ? "Update" : "Save"}</>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
