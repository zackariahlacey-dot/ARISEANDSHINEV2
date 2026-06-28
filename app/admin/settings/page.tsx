"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { addDays, format } from "date-fns";
import {
  useOperatingHours,
  useUpdateOperatingHours,
  useBlockedDates,
  useToggleBlockedDate,
  useBulkBlockDateRange,
  useMonthlyGoal,
  useSetMonthlyGoal,
} from "@/hooks/use-admin-data";
import {
  getDiagnostics, sendTestEmailAction, triggerTestEmail,
  runTestBookingAction, getCouponStats, toggleCouponAction, deleteCouponAction,
  getTestPayUrl,
} from "@/app/actions/adminActions";
import {
  getLinkedCalendarSetting,
  setLinkedCalendarSetting,
} from "@/app/actions/linkedCalendar";
import { createCoupon } from "@/app/actions/createCoupon";
import { useToast } from "@/components/admin/Toast";
import { SubNav, BUSINESS_SUBNAV } from "@/components/admin/SubNav";
import {
  Clock, CalendarOff, Mail, Server, Activity, Check,
  AlertTriangle, CheckCircle2, Loader2, ChevronDown, ChevronUp,
  Send, Target, Zap, RefreshCw, FlaskConical, X, Ticket, Power, Trash2, Plus, ExternalLink, Link2,
} from "lucide-react";
import { cn } from "@/lib/utils";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// ── Email test definitions ────────────────────────────────────────────────
const EMAIL_TESTS = [
  { id: "confirmation",   label: "Booking Confirmation (Customer)",  icon: "📩", desc: "Full confirmation with prep tips" },
  { id: "on-my-way",      label: "On My Way",                        icon: "🚗", desc: "Heads-up before arrival" },
  { id: "completed",      label: "Job Completed",                    icon: "✅", desc: "Completion with loyalty tier update" },
  { id: "review",         label: "Review + Maintenance Upsell",      icon: "⭐", desc: "24h follow-up" },
  { id: "reschedule",     label: "Reschedule Notice",                icon: "📅", desc: "Date/time changed" },
  { id: "cancel",         label: "Cancellation",                     icon: "❌", desc: "Booking cancelled" },
];

// ─────────────────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: opHours, isLoading: ohLoading } = useOperatingHours();
  const { data: blockedDates, isLoading: bdLoading } = useBlockedDates();
  const { data: diagnostics, isLoading: dLoading } = useQuery({
    queryKey: ["admin", "diagnostics"],
    queryFn: async () => await getDiagnostics(),
  });
  const { data: goal } = useMonthlyGoal();
  const setGoal = useSetMonthlyGoal();

  const updateHours = useUpdateOperatingHours();
  const toggleBlock = useToggleBlockedDate();
  const bulkBlock = useBulkBlockDateRange();

  const [hoursState, setHoursState]     = useState<any[]>([]);
  const [newBlockDate, setNewBlockDate] = useState(format(addDays(new Date(), 1), "yyyy-MM-dd"));
  const [newBlockEndDate, setNewBlockEndDate] = useState("");
  const [newBlockReason, setNewBlockReason] = useState("");

  // Settings sections expand/collapse
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(["health"]));
  const toggle = (s: string) => setOpenSections(p => {
    const n = new Set(p);
    n.has(s) ? n.delete(s) : n.add(s);
    return n;
  });

  // Email tests
  const [testEmail, setTestEmail] = useState("");
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, "ok" | "err">>({});

  // Test booking
  const [runningTestBooking, setRunningTestBooking] = useState(false);
  const [testBookingLog, setTestBookingLog]         = useState<string[]>([]);

  // Pay page preview
  const [loadingPayPreview, setLoadingPayPreview] = useState(false);

  // Goal
  const [goalInput, setGoalInput] = useState("");
  useEffect(() => { if (goal !== undefined) setGoalInput(String(goal)); }, [goal]);

  useEffect(() => {
    if (opHours) {
      setHoursState(DAYS.map((_, i) => {
        const found = opHours.find((h: any) => h.day_of_week === i);
        return found ?? { day_of_week: i, is_open: i > 0 && i < 6, start_time: "09:00", end_time: "17:00" };
      }));
    }
  }, [opHours]);

  async function handleSaveHours() {
    try {
      await updateHours.mutateAsync(hoursState);
      toast("Hours saved!");
    } catch { toast("Failed to save hours", "error"); }
  }

  async function handleAddBlock() {
    if (!newBlockDate) return;
    try {
      if (newBlockEndDate && newBlockEndDate !== newBlockDate) {
        const res = await bulkBlock.mutateAsync({
          startDate: newBlockDate,
          endDate: newBlockEndDate,
          reason: newBlockReason || undefined,
        });
        if (!res.success) { toast(res.error ?? "Failed", "error"); return; }
        toast(`Blocked ${res.inserted} day${res.inserted === 1 ? "" : "s"}!`);
      } else {
        await toggleBlock.mutateAsync({ date: newBlockDate, isBlocked: true, reason: newBlockReason || undefined });
        toast("Date blocked!");
      }
      setNewBlockDate(format(addDays(new Date(), 1), "yyyy-MM-dd"));
      setNewBlockEndDate("");
      setNewBlockReason("");
    } catch { toast("Failed", "error"); }
  }

  async function handleRemoveBlock(date: string) {
    try {
      await toggleBlock.mutateAsync({ date, isBlocked: false });
      toast("Block removed");
    } catch { toast("Failed", "error"); }
  }

  async function handleTestEmail(type: string) {
    const to = testEmail || diagnostics?.env?.adminEmail;
    if (!to) { toast("Enter test email address", "error"); return; }
    setTestingId(type);
    try {
      const r = await triggerTestEmail(type, to);
      setTestResults(p => ({ ...p, [type]: r.success ? "ok" : "err" }));
      if (r.success) toast(`${type} email sent to ${to}!`);
      else toast(r.error ?? "Failed", "error");
    } catch { setTestResults(p => ({ ...p, [type]: "err" })); toast("Error", "error"); }
    setTestingId(null);
  }

  async function handleTestBooking() {
    const to = testEmail || diagnostics?.env?.adminEmail;
    if (!to) { toast("Enter a test email address first", "error"); return; }
    setRunningTestBooking(true);
    setTestBookingLog([]);
    try {
      const r = await runTestBookingAction(to);
      setTestBookingLog(r.log);
      toast("Test booking run complete!");
    } catch (e: any) { toast(e.message ?? "Error", "error"); }
    setRunningTestBooking(false);
  }

  async function handlePreviewPayPage() {
    setLoadingPayPreview(true);
    try {
      const r = await getTestPayUrl();
      if ("bookingId" in r) {
        window.open(`/pay/${r.bookingId}`, "_blank");
      } else {
        toast(r.error ?? "No bookings found", "error");
      }
    } catch { toast("Error fetching booking", "error"); }
    setLoadingPayPreview(false);
  }

  const Section = ({ id, title, icon, children }: { id: string; title: string; icon: React.ReactNode; children: React.ReactNode }) => {
    const open = openSections.has(id);
    return (
      <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl overflow-hidden">
        <button
          onClick={() => toggle(id)}
          className="w-full flex items-center justify-between px-4 py-4 text-left"
        >
          <div className="flex items-center gap-2.5">
            <span className="text-amber-500">{icon}</span>
            <span className="text-sm font-black uppercase tracking-widest">{title}</span>
          </div>
          {open ? <ChevronUp size={15} className="text-zinc-600" /> : <ChevronDown size={15} className="text-zinc-600" />}
        </button>
        {open && <div className="px-4 pb-4 border-t border-white/[0.04] pt-4">{children}</div>}
      </div>
    );
  };

  return (
    <div className="px-4 pt-4 pb-6 max-w-2xl mx-auto space-y-4">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-600 mb-1">Business</p>
        <h1 className="text-xl font-black mb-3">Setup</h1>
        <SubNav items={BUSINESS_SUBNAV} />
      </div>

      {/* ── Quick links ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-2">
        <a
          href="/admin/audit"
          className="rounded-2xl border border-white/[0.06] bg-zinc-900/40 hover:border-amber-500/30 px-4 py-3 transition-colors active:scale-[0.99]"
        >
          <p className="text-[10px] font-black uppercase tracking-widest text-amber-500">Audit log →</p>
          <p className="text-[11px] text-zinc-500 mt-0.5">Every admin action, timestamped + IP.</p>
        </a>
        <a
          href="/admin/contractors"
          className="rounded-2xl border border-white/[0.06] bg-zinc-900/40 hover:border-amber-500/30 px-4 py-3 transition-colors active:scale-[0.99]"
        >
          <p className="text-[10px] font-black uppercase tracking-widest text-amber-500">Contractors →</p>
          <p className="text-[11px] text-zinc-500 mt-0.5">Invite, promote, deactivate.</p>
        </a>
      </div>

      {/* ── Site Health ──────────────────────────────────────────────────── */}
      <Section id="health" title="Site Health" icon={<Activity size={16} />}>
        {dLoading ? (
          <div className="flex justify-center py-4"><Loader2 className="animate-spin text-amber-500" size={20} /></div>
        ) : diagnostics && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              {[
                { key: "supabaseUrl",    label: "Supabase URL",    ok: diagnostics.env.supabaseUrl },
                { key: "supabaseKey",    label: "Supabase Key",    ok: diagnostics.env.supabaseKey },
                { key: "resendKey",      label: "Resend API",      ok: diagnostics.env.resendKey },
                { key: "stripeKey",      label: "Stripe API",      ok: diagnostics.env.stripeKey },
                { key: "stripeWebhook",  label: "Stripe Webhook",  ok: diagnostics.env.stripeWebhook },
              ].map(({ key, label, ok }) => (
                <div key={key} className={cn("flex items-center gap-2 p-2.5 rounded-xl border text-xs font-bold",
                  ok ? "border-emerald-500/20 bg-emerald-500/[0.04] text-emerald-400"
                     : "border-red-500/20 bg-red-500/[0.04] text-red-400"
                )}>
                  {ok ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}
                  <span className="truncate">{label}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between text-xs text-zinc-600">
              <span>Last checked: {new Date(diagnostics.timestamp).toLocaleTimeString()}</span>
              <button onClick={() => queryClient.invalidateQueries({ queryKey: ["admin", "diagnostics"] })}
                className="flex items-center gap-1 hover:text-white transition-colors">
                <RefreshCw size={11} /> Refresh
              </button>
            </div>
            <div className="bg-white/[0.03] rounded-xl px-3 py-2 text-xs text-zinc-500">
              Admin email: <span className="text-zinc-300">{diagnostics.env.adminEmail}</span>
            </div>
          </div>
        )}
      </Section>

      {/* ── Email Tests ───────────────────────────────────────────────────── */}
      <Section id="email" title="Email Tests" icon={<Mail size={16} />}>
        <div className="space-y-3">
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-zinc-600 mb-1">Send test emails to</p>
            <input
              type="email"
              value={testEmail}
              onChange={e => setTestEmail(e.target.value)}
              placeholder={diagnostics?.env?.adminEmail ?? "your@email.com"}
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-zinc-700 focus:outline-none focus:border-amber-500/50"
            />
            <p className="text-[10px] text-zinc-600 mt-1.5">Both the customer template and the owner-alert copy route here — nothing reaches the live admin inbox during testing.</p>
          </div>

          <div className="space-y-2">
            {EMAIL_TESTS.map(et => (
              <div key={et.id} className="flex items-center gap-3 bg-white/[0.02] border border-white/[0.06] rounded-xl px-3 py-2.5">
                <span className="text-lg shrink-0">{et.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-zinc-200">{et.label}</p>
                  <p className="text-[10px] text-zinc-600">{et.desc}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {testResults[et.id] === "ok" && <CheckCircle2 size={14} className="text-emerald-500" />}
                  {testResults[et.id] === "err" && <AlertTriangle size={14} className="text-red-400" />}
                  <button
                    onClick={() => handleTestEmail(et.id)}
                    disabled={testingId !== null}
                    className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-black uppercase tracking-wider px-2.5 py-1.5 rounded-lg hover:bg-amber-500/20 transition-all active:scale-90 disabled:opacity-40"
                  >
                    {testingId === et.id ? <Loader2 className="animate-spin" size={12} /> : <Send size={12} />}
                    Send
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Test booking */}
          <div className="border border-dashed border-amber-500/20 rounded-xl p-3 space-y-3">
            <div className="flex items-center gap-2">
              <FlaskConical size={14} className="text-amber-500" />
              <p className="text-xs font-black uppercase tracking-widest text-amber-500">Full Test Booking</p>
            </div>
            <p className="text-[11px] text-zinc-500">Runs through every email in the booking lifecycle and delivers them to your test address. Nothing gets saved to the database.</p>
            <button
              onClick={handleTestBooking}
              disabled={runningTestBooking}
              className="w-full flex items-center justify-center gap-2 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-black uppercase tracking-wider py-3 rounded-xl hover:bg-amber-500/20 transition-all active:scale-95 disabled:opacity-50"
            >
              {runningTestBooking ? <Loader2 className="animate-spin" size={14} /> : <><Zap size={13} /> Run Full Test</>}
            </button>
            {testBookingLog.length > 0 && (
              <div className="bg-black/40 rounded-xl p-3 space-y-1.5">
                {testBookingLog.map((line, i) => (
                  <p key={i} className={cn("text-xs font-mono", line.startsWith("✅") ? "text-emerald-400" : "text-red-400")}>{line}</p>
                ))}
              </div>
            )}
          </div>

          {/* Pay page preview */}
          <div className="border border-dashed border-sky-500/20 rounded-xl p-3 space-y-3">
            <div className="flex items-center gap-2">
              <ExternalLink size={14} className="text-sky-400" />
              <p className="text-xs font-black uppercase tracking-widest text-sky-400">Preview Pay Page</p>
            </div>
            <p className="text-[11px] text-zinc-500">Opens the customer-facing payment page using your most recent real booking — tip selector, live total, and Stripe checkout. No charge is made until a customer actually clicks Pay.</p>
            <button
              onClick={handlePreviewPayPage}
              disabled={loadingPayPreview}
              className="w-full flex items-center justify-center gap-2 bg-sky-500/10 border border-sky-500/30 text-sky-400 text-xs font-black uppercase tracking-wider py-3 rounded-xl hover:bg-sky-500/20 transition-all active:scale-95 disabled:opacity-50"
            >
              {loadingPayPreview ? <Loader2 className="animate-spin" size={14} /> : <><ExternalLink size={13} /> Preview Pay Page</>}
            </button>
          </div>
        </div>
      </Section>

      {/* ── Operating Hours ───────────────────────────────────────────────── */}
      <Section id="hours" title="Operating Hours" icon={<Clock size={16} />}>
        {ohLoading ? (
          <div className="flex justify-center py-4"><Loader2 className="animate-spin text-amber-500" size={20} /></div>
        ) : (
          <div className="space-y-3">
            {hoursState.map((day, i) => (
              <div key={i} className="flex items-center gap-3">
                <button
                  onClick={() => setHoursState(p => p.map((d, j) => j === i ? { ...d, is_open: !d.is_open } : d))}
                  className={cn("w-20 shrink-0 py-1.5 rounded-lg border text-[10px] font-black uppercase tracking-wider transition-all",
                    day.is_open ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" : "border-white/[0.06] text-zinc-600"
                  )}
                >
                  {day.is_open ? "Open" : "Closed"}
                </button>
                <span className="text-xs font-bold text-zinc-400 w-10 shrink-0">{DAYS[i].slice(0, 3)}</span>
                {day.is_open && (
                  <div className="flex items-center gap-2 flex-1">
                    <input
                      type="time"
                      value={day.start_time ?? "09:00"}
                      onChange={e => setHoursState(p => p.map((d, j) => j === i ? { ...d, start_time: e.target.value } : d))}
                      className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500/50"
                    />
                    <span className="text-zinc-600 text-xs">–</span>
                    <input
                      type="time"
                      value={day.end_time ?? "17:00"}
                      onChange={e => setHoursState(p => p.map((d, j) => j === i ? { ...d, end_time: e.target.value } : d))}
                      className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500/50"
                    />
                  </div>
                )}
              </div>
            ))}
            <button
              onClick={handleSaveHours}
              disabled={updateHours.isPending}
              className="w-full flex items-center justify-center gap-2 bg-amber-500 text-black font-black text-xs uppercase tracking-wider py-3 rounded-xl active:scale-95 transition-all"
            >
              {updateHours.isPending ? <Loader2 className="animate-spin" size={14} /> : <><Check size={13} /> Save Hours</>}
            </button>
          </div>
        )}
      </Section>

      {/* ── Blocked Dates ─────────────────────────────────────────────────── */}
      <Section id="blocked" title="Blocked Dates" icon={<CalendarOff size={16} />}>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">From</p>
              <input
                type="date"
                value={newBlockDate}
                onChange={e => setNewBlockDate(e.target.value)}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500/50"
              />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">To (optional)</p>
              <input
                type="date"
                value={newBlockEndDate}
                onChange={e => setNewBlockEndDate(e.target.value)}
                min={newBlockDate || undefined}
                placeholder="Leave blank for single day"
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500/50"
              />
            </div>
          </div>
          <input
            value={newBlockReason}
            onChange={e => setNewBlockReason(e.target.value)}
            placeholder="Reason (optional) — e.g. Holiday closure, vacation"
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white placeholder:text-zinc-700 focus:outline-none focus:border-amber-500/50"
          />
          <button
            onClick={handleAddBlock}
            disabled={toggleBlock.isPending || bulkBlock.isPending}
            className="w-full inline-flex items-center justify-center gap-1.5 bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-black uppercase tracking-wider px-3 py-2.5 rounded-xl hover:bg-red-500/20 transition-all active:scale-95 disabled:opacity-50"
          >
            {bulkBlock.isPending || toggleBlock.isPending
              ? <Loader2 size={13} className="animate-spin" />
              : <CalendarOff size={13} />}
            {newBlockEndDate && newBlockEndDate !== newBlockDate ? "Block Date Range" : "Block Date"}
          </button>

          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {bdLoading ? (
              <div className="flex justify-center py-3"><Loader2 className="animate-spin text-amber-500" size={18} /></div>
            ) : !blockedDates?.length ? (
              <p className="text-xs text-zinc-600 py-2">No blocked dates.</p>
            ) : blockedDates
              .filter((b: any) => b.blocked_date >= format(new Date(), "yyyy-MM-dd"))
              .sort((a: any, b: any) => a.blocked_date.localeCompare(b.blocked_date))
              .map((b: any) => (
                <div key={b.blocked_date} className="flex items-center justify-between bg-red-500/[0.04] border border-red-500/10 rounded-xl px-3 py-2">
                  <div>
                    <p className="text-xs font-bold text-red-300">{b.blocked_date}</p>
                    {b.reason && <p className="text-[10px] text-zinc-600">{b.reason}</p>}
                  </div>
                  <button onClick={() => handleRemoveBlock(b.blocked_date)}
                    className="p-1.5 rounded-lg hover:bg-red-500/10 text-zinc-600 hover:text-red-400 transition-all">
                    <X size={13} />
                  </button>
                </div>
              ))}
          </div>
        </div>
      </Section>

      {/* ── Monthly Goal ──────────────────────────────────────────────────── */}
      <Section id="goal" title="Monthly Revenue Goal" icon={<Target size={16} />}>
        <div className="space-y-3">
          <p className="text-xs text-zinc-500">Sets the goal bar on the Money tab.</p>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm font-bold">$</span>
              <input
                type="number"
                value={goalInput}
                onChange={e => setGoalInput(e.target.value)}
                placeholder="5000"
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-7 pr-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500/50"
              />
            </div>
            <button
              onClick={async () => {
                if (!goalInput) return;
                await setGoal.mutateAsync(Number(goalInput));
                toast("Goal updated!");
              }}
              disabled={setGoal.isPending}
              className="flex items-center gap-1.5 bg-amber-500 text-black text-xs font-black uppercase tracking-wider px-4 py-2.5 rounded-xl active:scale-95 transition-all"
            >
              {setGoal.isPending ? <Loader2 className="animate-spin" size={14} /> : <><Check size={13} /> Save</>}
            </button>
          </div>
          {goal !== undefined && (
            <p className="text-[10px] text-zinc-600">Current goal: <span className="text-amber-500 font-black">${goal.toLocaleString()}/mo</span></p>
          )}
        </div>
      </Section>

      {/* ── Linked Calendars (cross-business) ──────────────────────────────── */}
      <LinkedCalendarsSection />

      {/* ── Discount Codes ────────────────────────────────────────────────── */}
      <CouponsSection />
    </div>
  );
}

// ── Linked Calendars section ───────────────────────────────────────────────
// Shared single toggle stored on the exterior site's settings table.
// When ON, days with an exterior job render as fully blocked here and
// vice versa. Flipping from here writes through to the exterior dashboard.
function LinkedCalendarsSection() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: linked, isLoading } = useQuery({
    queryKey: ["admin", "linked-calendar"],
    queryFn: getLinkedCalendarSetting,
    // Refresh when the section opens — admin may have just toggled on the exterior side.
    staleTime: 30_000,
  });

  const [saving, setSaving] = useState(false);

  async function handleToggle(next: boolean) {
    setSaving(true);
    try {
      const r = await setLinkedCalendarSetting(next);
      if (!r.ok) {
        toast(r.error ?? "Failed to update setting", "error");
        return;
      }
      toast(next
        ? "Linked — detailing and exterior now block each other's days."
        : "Independent — both businesses schedule on their own again.");
      // Invalidate every cache that depends on the merged blocked-date set
      // so the calendar grids and date pickers pick up the change immediately.
      queryClient.invalidateQueries({ queryKey: ["admin", "linked-calendar"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "exterior-blocked-dates"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "bookings"] });
    } catch (e: any) {
      toast(e?.message ?? "Failed to update setting", "error");
    }
    setSaving(false);
  }

  const isLinked = linked ?? true;

  return (
    <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen(p => !p)}
        className="w-full flex items-center justify-between px-4 py-4 text-left"
      >
        <div className="flex items-center gap-2.5">
          <span className="text-amber-500"><Link2 size={16} /></span>
          <span className="text-sm font-black uppercase tracking-widest">Linked Calendars</span>
          {!isLoading && (
            <span className={cn(
              "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full",
              isLinked
                ? "bg-amber-500/15 border border-amber-500/30 text-amber-400"
                : "bg-zinc-800 border border-white/10 text-zinc-500"
            )}>
              {isLinked ? "Linked" : "Independent"}
            </span>
          )}
        </div>
        {open ? <ChevronUp size={15} className="text-zinc-600" /> : <ChevronDown size={15} className="text-zinc-600" />}
      </button>

      {open && (
        <div className="px-4 pb-4 border-t border-white/[0.04] pt-4 space-y-4">
          {isLoading ? (
            <div className="flex justify-center py-4"><Loader2 className="animate-spin text-amber-500" size={20} /></div>
          ) : (
            <>
              <p className="text-xs text-zinc-400 leading-relaxed">
                When linked, detailing bookings are blocked on days that have exterior jobs,
                and exterior bookings are blocked on days that have detailing jobs.
                Recommended while you&apos;re solo — the same toggle exists on the exterior
                site and changes here apply there too. Flip <strong>OFF</strong> once you
                hire separate crews so each business schedules independently.
              </p>

              <button
                type="button"
                role="switch"
                aria-checked={isLinked}
                onClick={() => handleToggle(!isLinked)}
                disabled={saving}
                className={cn(
                  "w-full flex items-center justify-between px-4 py-3.5 rounded-2xl border transition-all active:scale-[0.99]",
                  isLinked
                    ? "border-amber-500/40 bg-amber-500/[0.06]"
                    : "border-white/[0.08] bg-white/[0.02]",
                  saving && "opacity-60"
                )}
              >
                <div className="flex flex-col items-start gap-0.5">
                  <span className="text-sm font-black text-white">
                    Link calendars with exterior site
                  </span>
                  <span className="text-[11px] text-zinc-500">
                    {isLinked
                      ? "Detailing + exterior are blocking each other's days."
                      : "Each business schedules independently."}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {saving && <Loader2 size={13} className="animate-spin text-amber-400" />}
                  <span className={cn(
                    "relative inline-flex h-6 w-11 rounded-full border transition-colors",
                    isLinked
                      ? "bg-amber-500 border-amber-500"
                      : "bg-zinc-800 border-white/10"
                  )}>
                    <span className={cn(
                      "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
                      isLinked ? "translate-x-5" : "translate-x-0.5"
                    )} />
                  </span>
                </div>
              </button>

              <div className={cn(
                "rounded-xl border px-3.5 py-3 flex items-start gap-2.5 text-[11px] leading-relaxed",
                isLinked
                  ? "border-amber-500/15 bg-amber-500/[0.04] text-amber-300/90"
                  : "border-white/[0.06] bg-white/[0.02] text-zinc-500"
              )}>
                <span className="shrink-0">{isLinked ? "🔗" : "⚙️"}</span>
                <span>
                  {isLinked
                    ? "Shared setting — the exterior admin sees the same switch and can flip it back. Last-write wins."
                    : "Heads-up: while OFF, the same customer could book both services on the same day. Only safe once you have separate crews."}
                </span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── Coupons section (isolated to keep settings page clean) ───────────────────
function CouponsSection() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [open, setOpen] = useState(false);

  const { data: coupons, isLoading } = useQuery({
    queryKey: ["admin", "coupons"],
    queryFn: getCouponStats,
  });

  const [code,        setCode]        = useState("");
  const [type,        setType]        = useState<"amount" | "percentage">("amount");
  const [value,       setValue]       = useState("");
  const [maxUses,     setMaxUses]     = useState("");
  const [creating,    setCreating]    = useState(false);
  const [togglingId,  setTogglingId]  = useState<string | null>(null);
  const [deletingId,  setDeletingId]  = useState<string | null>(null);

  async function handleCreate() {
    const v = Number(value);
    if (!code.trim()) { toast("Enter a code", "error"); return; }
    if (!v || v <= 0) { toast("Enter a valid discount value", "error"); return; }
    const trimmedMax = maxUses.trim();
    let parsedMaxUses: number | null = null;
    if (trimmedMax) {
      const m = Number(trimmedMax);
      if (!Number.isFinite(m) || m < 1) {
        toast("Max uses must be 1 or greater (or leave blank for unlimited)", "error");
        return;
      }
      parsedMaxUses = Math.floor(m);
    }
    setCreating(true);
    try {
      const r = await createCoupon({ code, discountType: type, discountValue: v, isActive: true, maxUses: parsedMaxUses });
      if (!r.success) { toast(r.error ?? "Failed", "error"); }
      else {
        toast(`Code ${r.coupon?.code} created!`);
        setCode(""); setValue(""); setMaxUses("");
        queryClient.invalidateQueries({ queryKey: ["admin", "coupons"] });
      }
    } catch (e: any) { toast(e.message ?? "Error", "error"); }
    setCreating(false);
  }

  async function handleToggle(id: string, current: boolean) {
    setTogglingId(id);
    try {
      await toggleCouponAction(id, !current);
      queryClient.invalidateQueries({ queryKey: ["admin", "coupons"] });
    } catch { toast("Failed to update", "error"); }
    setTogglingId(null);
  }

  async function handleDelete(id: string, code: string) {
    if (!confirm(`Delete code "${code}"? This cannot be undone.`)) return;
    setDeletingId(id);
    try {
      await deleteCouponAction(id);
      toast(`Deleted ${code}`);
      queryClient.invalidateQueries({ queryKey: ["admin", "coupons"] });
    } catch { toast("Failed to delete", "error"); }
    setDeletingId(null);
  }

  // Reuse the Section styling via a plain card
  return (
    <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen(p => !p)}
        className="w-full flex items-center justify-between px-4 py-4 text-left"
      >
        <div className="flex items-center gap-2.5">
          <span className="text-amber-500"><Ticket size={16} /></span>
          <span className="text-sm font-black uppercase tracking-widest">Discount Codes</span>
        </div>
        {open ? <ChevronUp size={15} className="text-zinc-600" /> : <ChevronDown size={15} className="text-zinc-600" />}
      </button>

      {open && <div className="px-4 pb-4 border-t border-white/[0.04] pt-4 space-y-4">
        {/* Create new code */}
        <div className="space-y-2.5">
          <p className="text-[9px] font-black uppercase tracking-widest text-zinc-600">New Code</p>
          <input
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase())}
            placeholder="e.g. SUMMER20"
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-zinc-700 focus:outline-none focus:border-amber-500/50 font-mono tracking-wider"
          />
          <div className="flex gap-2">
            {/* Type toggle */}
            <div className="flex rounded-xl border border-white/[0.08] overflow-hidden shrink-0">
              <button
                onClick={() => setType("amount")}
                className={cn("px-3 py-2 text-xs font-black transition-colors", type === "amount" ? "bg-amber-500 text-black" : "text-zinc-500 hover:text-white")}
              >$ Off</button>
              <button
                onClick={() => setType("percentage")}
                className={cn("px-3 py-2 text-xs font-black transition-colors", type === "percentage" ? "bg-amber-500 text-black" : "text-zinc-500 hover:text-white")}
              >% Off</button>
            </div>
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm font-bold">
                {type === "amount" ? "$" : "%"}
              </span>
              <input
                type="number"
                value={value}
                onChange={e => setValue(e.target.value)}
                placeholder={type === "amount" ? "10" : "15"}
                min="1"
                max={type === "percentage" ? "100" : undefined}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-7 pr-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500/50"
              />
            </div>
          </div>
          {/* Usage limit (optional) */}
          <div className="flex gap-2 items-center">
            <input
              type="number"
              value={maxUses}
              onChange={e => setMaxUses(e.target.value)}
              placeholder="Max uses (blank = unlimited)"
              min="1"
              className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-zinc-700 focus:outline-none focus:border-amber-500/50"
            />
            <button
              onClick={handleCreate}
              disabled={creating}
              className="flex items-center gap-1.5 bg-amber-500 text-black text-xs font-black uppercase tracking-wider px-4 py-2.5 rounded-xl active:scale-95 transition-all disabled:opacity-60 shrink-0"
            >
              {creating ? <Loader2 className="animate-spin" size={13} /> : <><Plus size={12} /> Create</>}
            </button>
          </div>
          <p className="text-[10px] text-zinc-600 leading-snug">
            Optional: cap the code at N redemptions. It auto-deactivates when the limit is hit.
          </p>
        </div>

        {/* Existing codes */}
        <div className="space-y-1.5">
          {isLoading ? (
            <div className="flex justify-center py-4"><Loader2 className="animate-spin text-amber-500" size={18} /></div>
          ) : !coupons?.length ? (
            <p className="text-xs text-zinc-600 py-2">No discount codes yet.</p>
          ) : coupons.map((c: any) => (
            <div key={c.id} className={cn(
              "flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-opacity",
              c.is_active ? "border-white/[0.06] bg-white/[0.02]" : "border-white/[0.03] bg-white/[0.01] opacity-50"
            )}>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black text-white font-mono tracking-wider">{c.code}</p>
                <p className="text-[10px] text-zinc-500">
                  {c.discount_amount != null ? `$${c.discount_amount} off` : `${c.discount_percentage}% off`}
                  {c.max_uses != null && c.max_uses > 0
                    ? ` · ${c.usage_count ?? 0}/${c.max_uses} used`
                    : c.usage_count > 0 && ` · used ${c.usage_count}×`}
                </p>
              </div>
              <span className={cn(
                "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full",
                c.is_active ? "bg-emerald-500/10 text-emerald-400" : "bg-zinc-800 text-zinc-600"
              )}>
                {c.is_active ? "Active" : "Off"}
              </span>
              <button
                onClick={() => handleToggle(c.id, c.is_active)}
                disabled={togglingId === c.id}
                title={c.is_active ? "Deactivate" : "Activate"}
                className="p-1.5 rounded-lg hover:bg-white/[0.06] text-zinc-500 hover:text-white transition-all"
              >
                {togglingId === c.id ? <Loader2 size={13} className="animate-spin" /> : <Power size={13} />}
              </button>
              <button
                onClick={() => handleDelete(c.id, c.code)}
                disabled={deletingId === c.id}
                title="Delete"
                className="p-1.5 rounded-lg hover:bg-red-500/10 text-zinc-600 hover:text-red-400 transition-all"
              >
                {deletingId === c.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
              </button>
            </div>
          ))}
        </div>
      </div>}
    </div>
  );
}
