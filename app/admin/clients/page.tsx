"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getAllClients, updateCustomerProfile, sendCustomEmailAction, massEmailAction,
} from "@/app/actions/adminActions";
import { sendStripePaymentLink } from "@/app/actions/sendStripePaymentLink";
import { updateProfileFields } from "@/app/actions/clientCrmActions";
import { ClientCrmPanel } from "@/components/admin/ClientCrmPanel";
import { useToast } from "@/components/admin/Toast";
import { Modal } from "@/components/admin/Modal";
import { StatusBadge } from "@/components/admin/StatusBadge";
import {
  Users, Search, Phone, MessageSquare, Mail, Navigation,
  Car, Star, Crown, AlertTriangle,
  Save, CheckCircle2, ChevronRight, Pencil,
  Loader2, Send, X, ArrowLeft, UserCheck, UserX, CalendarPlus, Repeat,
} from "lucide-react";
import { sendMonthlyPlanInvite } from "@/app/actions/monthlySubscriptions";
import { format, differenceInMonths, differenceInDays, parseISO } from "date-fns";
import { useServices } from "@/hooks/use-admin-data";
import { NewBookingForm, type ClientPrefillForBooking } from "@/app/admin/schedule/page";
import { cn } from "@/lib/utils";
import { to12h } from "@/lib/availability";
import { SubNav, PEOPLE_SUBNAV } from "@/components/admin/SubNav";

// ── Email templates ─────────────────────────────────────────────────────────
const EMAIL_TEMPLATES = [
  {
    id: "review",
    label: "⭐ Google Review",
    subject: "How did we do? Leave us a review!",
    body: "Hi {{name}},\n\nThank you so much for choosing Arise & Shine VT! We hope your vehicle is looking absolutely perfect.\n\nIf you have a minute, we'd love it if you could leave us a Google review — it means the world to a small local business:\n\nhttps://g.page/r/YOUR_GOOGLE_REVIEW_LINK\n\nThank you!\n– Zack\nArise & Shine VT",
  },
  {
    id: "maintenance",
    label: "🔄 Maintenance Plan",
    subject: "Keep the shine — monthly maintenance plan",
    body: "Hi {{name}},\n\nWant to keep that showroom shine all year round? Our Monthly Maintenance Plan keeps your vehicle looking its best without the hassle.\n\n✅ Interior Monthly Plan — $75/mo\n✅ Basic Interior + Exterior Monthly Plan — $120/mo\n\nReply to this email or visit ariseandshinevt.com to sign up. First month is on us if you book this week!\n\n– Zack\nArise & Shine VT",
  },
  {
    id: "promo",
    label: "💰 Seasonal Promo",
    subject: "Exclusive offer just for you",
    body: "Hi {{name}},\n\nSpring is here and your car deserves a refresh! Book this month and save 15% on any detail service.\n\nUse code SPRING15 at checkout or reply to this email.\n\n– Zack\nArise & Shine VT",
  },
  {
    id: "winback",
    label: "👋 Win-Back",
    subject: "We miss you — come back for a detail!",
    body: "Hi {{name}},\n\nIt's been a while since we last detailed your vehicle, and we want to earn your business back!\n\nReply to this email to book, or visit ariseandshinevt.com. We'll take $20 off your next detail as a thank you.\n\n– Zack\nArise & Shine VT",
  },
  {
    id: "fpf",
    label: "📰 FPF Post",
    subject: "Book your spring detail!",
    body: "Hi {{name}},\n\nI'd love to come detail your vehicle this spring! I'm a mobile detailer serving all of Vermont — I come to you.\n\nBook online at ariseandshinevt.com or reply here.\n\n– Zack\nArise & Shine VT",
  },
  {
    id: "custom",
    label: "✏️ Custom",
    subject: "",
    body: "",
  },
];

function formatTime(t: string): string {
  if (!t) return "";
  return to12h(t.slice(0, 5));
}

function fmtPhone(p: string | null | undefined): string {
  if (!p) return "";
  let d = p.replace(/\D/g, "");
  if (d.length === 11 && d.startsWith("1")) d = d.slice(1);
  if (d.length !== 10) return p;
  return `(${d.slice(0,3)}) ${d.slice(3,6)}-${d.slice(6)}`;
}

/** Normalize stored phone for tel: / sms: (works on iOS & Android) */
function phoneToTelHref(phone: string): string {
  const d = phone.replace(/\D/g, "");
  if (d.length === 10) return `+1${d}`;
  if (d.length === 11 && d.startsWith("1")) return `+${d}`;
  if (d.length >= 10) return `+${d}`;
  return d ? `+${d}` : "";
}

// ─────────────────────────────────────────────────────────────────────────────
export default function ClientsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: clients, isLoading } = useQuery({
    queryKey: ["admin", "clients"],
    queryFn: async () => await getAllClients(),
  });
  const { data: bookingServices } = useServices();

  const [search, setSearch]       = useState("");
  const [sort, setSort]           = useState<"recent" | "ltv" | "az">("recent");
  const [accountFilter, setAccountFilter] = useState<"all" | "signed_up" | "guest">("all");
  const [lapsedFilter, setLapsedFilter]   = useState<"all" | "30" | "60" | "90">("all");
  const [activeClient, setActiveClient]   = useState<any>(null);
  const [clientModalView, setClientModalView] = useState<"profile" | "book">("profile");
  const [clientTab, setClientTab]         = useState<"overview" | "history">("overview");
  const [editingNotes, setEditingNotes]   = useState(false);
  const [notesValue, setNotesValue]       = useState("");
  const [savingNotes, setSavingNotes]     = useState(false);
  const [sendingInvite, setSendingInvite] = useState(false);
  const [view, setView]           = useState<"list" | "email">("list");
  // Inline-edit profile
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileDraft, setProfileDraft] = useState<{ first_name: string; last_name: string; phone: string; email: string; address: string; loyalty_discount_pct: string }>({
    first_name: "", last_name: "", phone: "", email: "", address: "", loyalty_discount_pct: "",
  });
  const [savingProfile, setSavingProfile] = useState(false);

  // Email state
  const [emailMode, setEmailMode]   = useState<"individual" | "mass">("individual");
  const [selectedTemplate, setSelectedTemplate] = useState(EMAIL_TEMPLATES[0]);
  const [emailSubject, setEmailSubject] = useState(EMAIL_TEMPLATES[0].subject);
  const [emailBody, setEmailBody]   = useState(EMAIL_TEMPLATES[0].body);
  const [recipientSearch, setRecipientSearch] = useState("");
  const [selectedRecipients, setSelectedRecipients] = useState<Set<string>>(new Set());
  const [singleRecipient, setSingleRecipient] = useState<any>(null);
  const [sending, setSending]       = useState(false);
  const [massFilter, setMassFilter] = useState<"all" | "at_risk" | "vip">("all");

  const filteredClients = useMemo(() => {
    if (!clients) return [];
    const q = search.toLowerCase();
    let result = clients.filter((c: any) => {
      // Account type filter
      if (accountFilter === "signed_up" && !c._is_signed_up) return false;
      if (accountFilter === "guest" && c._is_signed_up) return false;
      // Lapsed filter — only show clients who haven't booked in N+ days
      if (lapsedFilter !== "all") {
        if (!c._lastService) return false;
        const days = differenceInDays(new Date(), parseISO(c._lastService + "T12:00:00"));
        if (days < Number(lapsedFilter)) return false;
      }
      // Search
      if (!q) return true;
      const name = (c._display_name ?? `${c.first_name ?? ""} ${c.last_name ?? ""}`).toLowerCase();
      return name.includes(q) || c.phone?.includes(q) || c.email?.toLowerCase().includes(q);
    });
    return result.sort((a: any, b: any) => {
      if (sort === "az") return (a._display_name ?? "").localeCompare(b._display_name ?? "");
      if (sort === "ltv") return (b._ltv ?? 0) - (a._ltv ?? 0);
      const da = a._lastService ? new Date(a._lastService).getTime() : 0;
      const db = b._lastService ? new Date(b._lastService).getTime() : 0;
      return db - da;
    });
  }, [clients, search, sort, accountFilter]);

  const clientBookPrefill: ClientPrefillForBooking | null = useMemo(() => {
    if (!activeClient || activeClient._is_orphan) return null;
    const name =
      activeClient._display_name?.trim() ||
      [activeClient.first_name, activeClient.last_name].filter(Boolean).join(" ").trim() ||
      "Customer";
    return {
      profileId: activeClient.id,
      name,
      phone: activeClient.phone ?? "",
      email: activeClient.email ?? "",
      address:
        activeClient._lastAddress && activeClient._lastAddress !== "No address recorded"
          ? activeClient._lastAddress
          : "",
      vehicles: (activeClient.vehicles ?? []).map((v: any) => ({
        id: v.id,
        year: v.year ?? null,
        make: v.make ?? "",
        model: v.model ?? "",
        size: v.size ?? "medium",
      })),
    };
  }, [activeClient]);

  const massRecipients = useMemo(() => {
    if (!clients) return [];
    return clients.filter((c: any) => {
      if (!c.email) return false;
      if (massFilter === "at_risk") {
        if (!c._lastService) return true;
        return differenceInMonths(new Date(), parseISO(c._lastService + "T12:00:00")) >= 3;
      }
      if (massFilter === "vip") return (c._ltv ?? 0) >= 500;
      return true;
    }).filter((c: any) => {
      if (!recipientSearch) return true;
      return `${c.first_name ?? ""} ${c.last_name ?? ""}`.toLowerCase().includes(recipientSearch.toLowerCase())
        || c.email?.toLowerCase().includes(recipientSearch.toLowerCase());
    });
  }, [clients, massFilter, recipientSearch]);

  function selectTemplate(t: typeof EMAIL_TEMPLATES[0]) {
    setSelectedTemplate(t);
    setEmailSubject(t.subject);
    setEmailBody(t.body);
  }

  async function handleSendSingle() {
    const to = singleRecipient?.email;
    if (!to) { toast("Select a recipient first", "error"); return; }
    if (!emailSubject || !emailBody) { toast("Subject and body required", "error"); return; }
    setSending(true);
    try {
      const first = singleRecipient.first_name ?? "there";
      const full = `${singleRecipient.first_name ?? ""} ${singleRecipient.last_name ?? ""}`.trim() || first;
      const personalised = emailBody
        .replace(/{{firstName}}/g, first)
        .replace(/{{fullName}}/g, full)
        .replace(/{{name}}/g, first);
      const r = await sendCustomEmailAction(to, emailSubject, personalised);
      if (r.success) toast("Email sent! ✅");
      else toast(r.error ?? "Failed", "error");
    } catch (e: any) { toast(e?.message ?? "Failed to send", "error"); }
    setSending(false);
  }

  async function handleSendMass() {
    const recipients = massRecipients.filter((c: any) =>
      selectedRecipients.size === 0 ? true : selectedRecipients.has(c.id)
    );
    if (recipients.length === 0) { toast("No recipients selected", "error"); return; }
    if (!emailSubject || !emailBody) { toast("Subject and body required", "error"); return; }
    if (!confirm(`Send to ${recipients.length} client${recipients.length !== 1 ? "s" : ""}?`)) return;
    setSending(true);
    try {
      const res = await massEmailAction(
        recipients.map((c: any) => ({ email: c.email, name: `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim() })),
        emailSubject,
        emailBody,
      );
      toast(`Sent to ${res.sent} clients${res.failed > 0 ? ` (${res.failed} failed)` : ""}!`);
      setSelectedRecipients(new Set());
    } catch { toast("Failed", "error"); }
    setSending(false);
  }

  async function saveNotes() {
    if (!activeClient) return;
    setSavingNotes(true);
    try {
      await updateCustomerProfile(activeClient.id, { notes: notesValue });
      toast("Notes saved");
      setEditingNotes(false);
      queryClient.invalidateQueries({ queryKey: ["admin", "clients"] });
    } catch (e: any) { toast(e?.message ?? "Failed", "error"); }
    setSavingNotes(false);
  }

  function openProfileEdit(c: any) {
    setProfileDraft({
      first_name: c.first_name ?? "",
      last_name:  c.last_name  ?? "",
      phone:      c.phone      ?? "",
      email:      c.email      ?? "",
      address:    c.address    ?? c._lastAddress ?? "",
      loyalty_discount_pct: String(c.loyalty_discount_pct ?? 0),
    });
    setEditingProfile(true);
  }

  async function saveProfileEdits() {
    if (!activeClient || activeClient._is_orphan) return;
    setSavingProfile(true);
    const loyalty = Number(profileDraft.loyalty_discount_pct);
    const r = await updateProfileFields(activeClient.id, {
      first_name: profileDraft.first_name.trim() || null,
      last_name:  profileDraft.last_name.trim()  || null,
      phone:      profileDraft.phone.trim()      || null,
      email:      profileDraft.email.trim()      || null,
      address:    profileDraft.address.trim()    || null,
      loyalty_discount_pct: isNaN(loyalty) ? 0 : Math.max(0, Math.min(100, loyalty)),
    });
    setSavingProfile(false);
    if (r.ok) {
      toast("Profile saved ✅");
      setEditingProfile(false);
      setActiveClient({
        ...activeClient,
        first_name: profileDraft.first_name,
        last_name:  profileDraft.last_name,
        phone:      profileDraft.phone,
        email:      profileDraft.email,
        address:    profileDraft.address,
        loyalty_discount_pct: isNaN(loyalty) ? 0 : Math.max(0, Math.min(100, loyalty)),
      });
      queryClient.invalidateQueries({ queryKey: ["admin", "clients"] });
    } else {
      toast(r.error ?? "Failed", "error");
    }
  }

  const isAtRisk = (c: any) => {
    if (!c._lastService) return c._bookingCount > 0;
    return differenceInMonths(new Date(), parseISO(c._lastService + "T12:00:00")) >= 3;
  };
  const isVIP = (c: any) => (c._ltv ?? 0) >= 500;

  // ── Email view ────────────────────────────────────────────────────────────
  if (view === "email") {
    return (
      <div className="px-4 pt-4 pb-6 max-w-2xl mx-auto space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={() => setView("list")}
            className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.07] transition-all active:scale-90">
            <ArrowLeft size={16} />
          </button>
          <h1 className="text-xl font-black">Email Marketing</h1>
        </div>

        {/* Mode toggle */}
        <div className="flex gap-1 bg-white/[0.03] rounded-xl p-1">
          <button onClick={() => setEmailMode("individual")}
            className={cn("flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all",
              emailMode === "individual" ? "bg-amber-500 text-black" : "text-zinc-500")}>Individual</button>
          <button onClick={() => setEmailMode("mass")}
            className={cn("flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all",
              emailMode === "mass" ? "bg-amber-500 text-black" : "text-zinc-500")}>Mass Send</button>
        </div>

        {/* Template picker */}
        <div>
          <p className="text-[9px] font-black uppercase tracking-widest text-zinc-600 mb-2">Template</p>
          <div className="grid grid-cols-2 gap-1.5">
            {EMAIL_TEMPLATES.map(t => (
              <button key={t.id} onClick={() => selectTemplate(t)}
                className={cn("py-2 px-3 rounded-xl border text-xs font-bold text-left transition-all",
                  selectedTemplate.id === t.id ? "bg-amber-500/10 border-amber-500/40 text-amber-400" : "border-white/[0.08] text-zinc-500")}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Recipient section */}
        {emailMode === "individual" ? (
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-zinc-600 mb-2">Recipient</p>
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
              <input
                value={recipientSearch}
                onChange={e => setRecipientSearch(e.target.value)}
                placeholder="Search client…"
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-8 pr-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500/50"
              />
            </div>
            {recipientSearch && (
              <div className="mt-1 bg-zinc-900 border border-white/[0.08] rounded-xl overflow-hidden">
                {filteredClients.filter((c: any) => c.email).slice(0, 5).map((c: any) => (
                  <button key={c.id} onClick={() => { setSingleRecipient(c); setRecipientSearch(`${c.first_name ?? ""} ${c.last_name ?? ""} <${c.email}>`); }}
                    className="w-full text-left px-3 py-2.5 hover:bg-white/[0.04] border-b border-white/[0.04] last:border-0 text-sm text-zinc-300">
                    {c.first_name} {c.last_name} <span className="text-zinc-600 text-xs">· {c.email}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-[9px] font-black uppercase tracking-widest text-zinc-600 mb-1">Audience</p>
            <div className="flex gap-1.5">
              {(["all", "at_risk", "vip"] as const).map(f => (
                <button key={f} onClick={() => setMassFilter(f)}
                  className={cn("flex-1 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-all",
                    massFilter === f ? "bg-amber-500 border-amber-500 text-black" : "border-white/[0.08] text-zinc-500")}>
                  {f === "all" ? "All" : f === "at_risk" ? "At Risk" : "VIP"}
                </button>
              ))}
            </div>
            <p className="text-xs text-zinc-600">{massRecipients.filter((c: any) => c.email).length} recipients with email</p>
          </div>
        )}

        {/* Subject */}
        <div>
          <p className="text-[9px] font-black uppercase tracking-widest text-zinc-600 mb-1">Subject</p>
          <input value={emailSubject} onChange={e => setEmailSubject(e.target.value)} placeholder="Subject line…"
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500/50" />
        </div>

        {/* Body */}
        <div>
          <p className="text-[9px] font-black uppercase tracking-widest text-zinc-600 mb-1">Body <span className="text-zinc-700 normal-case font-medium">· use {`{{name}}`} for first name</span></p>
          <textarea value={emailBody} onChange={e => setEmailBody(e.target.value)} rows={8} placeholder="Email body…"
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500/50 resize-none" />
        </div>

        <button
          onClick={emailMode === "individual" ? handleSendSingle : handleSendMass}
          disabled={sending}
          className="w-full flex items-center justify-center gap-2 bg-amber-500 text-black font-black text-sm uppercase tracking-wider py-4 rounded-xl active:scale-95 transition-all disabled:opacity-50"
        >
          {sending ? <Loader2 className="animate-spin" size={18} /> : <><Send size={16} /> {emailMode === "individual" ? "Send Email" : `Send to ${massRecipients.length} Clients`}</>}
        </button>
      </div>
    );
  }

  // ── Client list view ──────────────────────────────────────────────────────
  return (
    <div className="px-4 pt-4 pb-6 max-w-2xl mx-auto space-y-4">

      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-600 mb-1">People</p>
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-black">Clients</h1>
          <button
            onClick={() => setView("email")}
            className="flex items-center gap-1.5 bg-white/[0.04] border border-white/[0.08] text-zinc-300 text-xs font-black uppercase tracking-wider px-3 py-2 rounded-xl hover:bg-white/[0.07] transition-all active:scale-95"
          >
            <Mail size={13} /> Email
          </button>
        </div>
        <SubNav items={PEOPLE_SUBNAV} />
      </div>

      {/* Search + sort */}
      <div className="space-y-2">
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, phone…"
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-8 pr-3 py-2.5 text-sm text-white placeholder:text-zinc-700 focus:outline-none focus:border-amber-500/50"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-white">
              <X size={13} />
            </button>
          )}
        </div>

        {/* Account type filter */}
        <div className="flex gap-1.5">
          {([
            { id: "all",       label: "All" },
            { id: "signed_up", label: "Signed Up" },
            { id: "guest",     label: "Guest" },
          ] as const).map(f => (
            <button key={f.id} onClick={() => setAccountFilter(f.id)}
              className={cn("flex-1 py-1.5 rounded-xl border text-[9px] font-black uppercase tracking-wider transition-all",
                accountFilter === f.id ? "bg-amber-500 border-amber-500 text-black" : "border-white/[0.08] text-zinc-600")}>
              {f.label}
              {clients && f.id !== "all" && (
                <span className="ml-1 opacity-60">
                  {f.id === "signed_up"
                    ? clients.filter((c: any) => c._is_signed_up).length
                    : clients.filter((c: any) => !c._is_signed_up).length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Lapsed filter */}
        <div className="flex gap-1.5">
          {([
            { id: "all", label: "All" },
            { id: "30",  label: "30d+" },
            { id: "60",  label: "60d+" },
            { id: "90",  label: "90d+" },
          ] as const).map(f => (
            <button key={f.id} onClick={() => setLapsedFilter(f.id)}
              className={cn("flex-1 py-1.5 rounded-xl border text-[9px] font-black uppercase tracking-wider transition-all",
                lapsedFilter === f.id ? "bg-orange-500/20 border-orange-500/40 text-orange-400" : "border-white/[0.08] text-zinc-600")}>
              {f.label}
              {clients && f.id !== "all" && (
                <span className="ml-1 opacity-60">
                  {clients.filter((c: any) => {
                    if (!c._lastService) return false;
                    return differenceInDays(new Date(), parseISO(c._lastService + "T12:00:00")) >= Number(f.id);
                  }).length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Sort */}
        <div className="flex gap-1.5">
          {(["recent", "ltv", "az"] as const).map(s => (
            <button key={s} onClick={() => setSort(s)}
              className={cn("flex-1 py-1.5 rounded-xl border text-[9px] font-black uppercase tracking-wider transition-all",
                sort === s ? "bg-white/[0.12] border-white/[0.15] text-white" : "border-white/[0.06] text-zinc-600")}>
              {s === "recent" ? "Recent" : s === "ltv" ? "VIP $" : "A–Z"}
            </button>
          ))}
        </div>
      </div>

      {/* Stats strip */}
      {clients && (
        <div className="grid grid-cols-4 gap-2 text-center">
          <MiniStat label="Total" value={String(clients.length)} />
          <MiniStat label="Accounts" value={String(clients.filter((c: any) => c._is_signed_up).length)} color="text-emerald-400" />
          <MiniStat label="VIP" value={String(clients.filter((c: any) => isVIP(c)).length)} color="text-amber-400" />
          <MiniStat label="At Risk" value={String(clients.filter((c: any) => isAtRisk(c)).length)} color="text-orange-400" />
        </div>
      )}

      {/* List */}
      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="animate-spin text-amber-500" size={24} /></div>
      ) : filteredClients.length === 0 ? (
        <p className="text-sm text-zinc-600 text-center py-6">No clients found.</p>
      ) : (
        <div className="space-y-2">
          {filteredClients.map((c: any) => {
            const vip = isVIP(c);
            const atRisk = isAtRisk(c);
            return (
              <button
                key={c.id}
                onClick={() => {
                  setActiveClient(c);
                  setClientModalView("profile");
                  setClientTab("overview");
                  setNotesValue(c.notes ?? "");
                  setEditingNotes(false);
                }}
                className="w-full text-left bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-3 flex items-center gap-3 transition-all active:scale-[0.98]"
              >
                {/* Avatar */}
                <div className={cn("w-10 h-10 rounded-full flex items-center justify-center text-sm font-black shrink-0",
                  vip ? "bg-amber-500/20 text-amber-400" : "bg-white/[0.06] text-zinc-400")}>
                  {((c._display_name ?? c.first_name ?? "")[0] ?? "?").toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-sm font-bold truncate">{c._display_name ?? `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim()}</span>
                    {vip && <Crown size={11} className="text-amber-500 shrink-0" />}
                    {atRisk && <AlertTriangle size={11} className="text-orange-400 shrink-0" />}
                    {c._is_signed_up
                      ? <span className="flex items-center gap-0.5 text-[8px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full">
                          <UserCheck size={8} /> Account
                        </span>
                      : <span className="flex items-center gap-0.5 text-[8px] font-black uppercase tracking-wider text-zinc-500 bg-white/[0.04] px-1.5 py-0.5 rounded-full">
                          <UserX size={8} /> Guest
                        </span>
                    }
                  </div>
                  <p className="text-xs text-zinc-500">{c._bookingCount} job{c._bookingCount !== 1 ? "s" : ""}{c._lastService ? ` · Last: ${format(parseISO(c._lastService + "T12:00:00"), "MMM d")}` : ""}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-black text-amber-500">${(c._ltv ?? 0).toFixed(0)}</p>
                  <p className="text-[9px] text-zinc-600">lifetime</p>
                </div>
                <ChevronRight size={14} className="text-zinc-700 shrink-0" />
              </button>
            );
          })}
        </div>
      )}

      {/* ── Client Detail Modal ─────────────────────────────────────────────── */}
      <Modal
        open={!!activeClient}
        onClose={() => {
          setActiveClient(null);
          setClientModalView("profile");
        }}
        fullScreen
      >
        {activeClient && clientModalView === "book" && clientBookPrefill && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setClientModalView("profile")}
                className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-zinc-400 hover:text-white transition-colors"
              >
                <ArrowLeft size={16} />
                Back
              </button>
            </div>
            {!bookingServices ? (
              <div className="flex justify-center py-12">
                <Loader2 className="animate-spin text-amber-500" size={28} />
              </div>
            ) : (
              <NewBookingForm
                defaultDate={format(new Date(), "yyyy-MM-dd")}
                services={bookingServices}
                clientPrefill={clientBookPrefill}
                onSuccess={() => {
                  setClientModalView("profile");
                  queryClient.invalidateQueries({ queryKey: ["admin", "clients"] });
                }}
                onCancel={() => setClientModalView("profile")}
              />
            )}
          </div>
        )}
        {activeClient && clientModalView === "profile" && (
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-start gap-3">
              <div className={cn("w-12 h-12 rounded-full flex items-center justify-center text-base font-black shrink-0",
                isVIP(activeClient) ? "bg-amber-500/20 text-amber-400" : "bg-white/[0.06] text-zinc-400")}>
                {((activeClient.first_name?.[0] ?? "") + (activeClient.last_name?.[0] ?? "")).toUpperCase() || "?"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h2 className="text-lg font-black">{activeClient._display_name ?? `${activeClient.first_name ?? ""} ${activeClient.last_name ?? ""}`.trim()}</h2>
                  {isVIP(activeClient) && <Crown size={14} className="text-amber-500" />}
                  {isAtRisk(activeClient) && <AlertTriangle size={14} className="text-orange-400" />}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-xs text-zinc-500">{activeClient._bookingCount} job{activeClient._bookingCount !== 1 ? "s" : ""} · LTV: <span className="text-amber-500 font-black">${(activeClient._ltv ?? 0).toFixed(0)}</span></p>
                  {activeClient._is_signed_up
                    ? <span className="flex items-center gap-0.5 text-[8px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full">
                        <UserCheck size={8} /> Account
                      </span>
                    : <span className="flex items-center gap-0.5 text-[8px] font-black uppercase tracking-wider text-zinc-500 bg-white/[0.04] px-1.5 py-0.5 rounded-full">
                        <UserX size={8} /> Guest Booking
                      </span>
                  }
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-white/[0.03] rounded-xl p-1">
              <button onClick={() => setClientTab("overview")}
                className={cn("flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all",
                  clientTab === "overview" ? "bg-amber-500 text-black" : "text-zinc-500")}>Overview</button>
              <button onClick={() => setClientTab("history")}
                className={cn("flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all",
                  clientTab === "history" ? "bg-amber-500 text-black" : "text-zinc-500")}>History</button>
            </div>

            {clientBookPrefill && (
              <button
                type="button"
                onClick={() => setClientModalView("book")}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-400 text-sm font-black uppercase tracking-wider active:scale-[0.98] transition-all"
              >
                <CalendarPlus size={18} />
                Book appointment
              </button>
            )}

            {activeClient?.email && (
              <button
                type="button"
                disabled={sendingInvite}
                onClick={async () => {
                  setSendingInvite(true);
                  try {
                    const r = await sendMonthlyPlanInvite(activeClient.id);
                    if (r.ok) toast("Monthly plan invite sent! ✅");
                    else toast(r.error ?? "Failed to send invite", "error");
                  } catch { toast("Failed to send invite", "error"); }
                  setSendingInvite(false);
                }}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#D4AF37] text-sm font-black uppercase tracking-wider active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {sendingInvite
                  ? <Loader2 size={16} className="animate-spin" />
                  : <Repeat size={16} />
                }
                Send Monthly Plan Invite
              </button>
            )}

            {clientTab === "overview" && (
              <div className="space-y-3">
                {/* Inline-edit profile */}
                {editingProfile && !activeClient._is_orphan ? (
                  <div className="bg-white/[0.02] border border-amber-500/30 rounded-xl p-3 space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-amber-400">Edit Profile</p>
                    <div className="grid grid-cols-2 gap-1.5">
                      <input value={profileDraft.first_name} onChange={e => setProfileDraft(d => ({ ...d, first_name: e.target.value }))} placeholder="First" className="bg-white/[0.05] border border-white/[0.08] rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500/50" />
                      <input value={profileDraft.last_name}  onChange={e => setProfileDraft(d => ({ ...d, last_name: e.target.value }))}  placeholder="Last"  className="bg-white/[0.05] border border-white/[0.08] rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500/50" />
                    </div>
                    <input value={profileDraft.phone}   onChange={e => setProfileDraft(d => ({ ...d, phone: e.target.value }))}   placeholder="Phone"   className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500/50" />
                    <input value={profileDraft.email}   onChange={e => setProfileDraft(d => ({ ...d, email: e.target.value }))}   placeholder="Email"   className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500/50" />
                    <input value={profileDraft.address} onChange={e => setProfileDraft(d => ({ ...d, address: e.target.value }))} placeholder="Address" className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500/50" />
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Loyalty %</span>
                      <input type="number" min="0" max="100" value={profileDraft.loyalty_discount_pct} onChange={e => setProfileDraft(d => ({ ...d, loyalty_discount_pct: e.target.value }))} className="w-20 bg-white/[0.05] border border-white/[0.08] rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500/50" />
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button onClick={() => setEditingProfile(false)} className="flex-1 py-2 rounded-lg border border-white/[0.08] text-zinc-400 text-xs font-black uppercase tracking-wider">Cancel</button>
                      <button onClick={saveProfileEdits} disabled={savingProfile} className="flex-1 py-2 rounded-lg bg-amber-500 text-black text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5">
                        {savingProfile ? <Loader2 size={11} className="animate-spin" /> : <><Save size={11} /> Save</>}
                      </button>
                    </div>
                  </div>
                ) : !activeClient._is_orphan && (
                  <button
                    onClick={() => openProfileEdit(activeClient)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-zinc-300 text-xs font-black uppercase tracking-wider active:scale-[0.98]"
                  >
                    <Pencil size={12} /> Edit Profile
                  </button>
                )}

                {/* CRM panel — tags, lifecycle, DNC, subs, tasks, emails */}
                {!activeClient._is_orphan && (
                  <ClientCrmPanel
                    profileId={activeClient.id}
                    initialTags={Array.isArray(activeClient.tags) ? activeClient.tags : []}
                    initialDnc={!!activeClient.do_not_contact}
                    initialLifecycle={activeClient._lifecycle ?? "lead"}
                    email={activeClient.email ?? null}
                    onChange={() => queryClient.invalidateQueries({ queryKey: ["admin", "clients"] })}
                  />
                )}

                {/* Contact */}
                <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-3 space-y-2">
                  {activeClient.phone && (() => {
                    const tel = phoneToTelHref(activeClient.phone);
                    return (
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 text-sm text-zinc-300 min-w-0 flex-1">
                          <Phone size={13} className="text-zinc-600 shrink-0" />
                          {tel ? (
                            <a
                              href={`tel:${tel}`}
                              className="truncate font-medium text-white underline-offset-2 hover:underline active:opacity-80"
                            >
                              {fmtPhone(activeClient.phone)}
                            </a>
                          ) : (
                            <span>{fmtPhone(activeClient.phone)}</span>
                          )}
                        </div>
                        {tel ? (
                          <div className="flex gap-2 shrink-0">
                            <a
                              href={`tel:${tel}`}
                              className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/35 text-amber-400 hover:bg-amber-500/25 transition-colors active:scale-95"
                              aria-label="Call client"
                            >
                              <Phone size={16} />
                            </a>
                            <a
                              href={`sms:${tel}`}
                              className="p-2.5 rounded-xl bg-white/[0.06] border border-white/[0.1] text-zinc-300 hover:bg-white/[0.1] transition-colors active:scale-95"
                              aria-label="Text client"
                            >
                              <MessageSquare size={16} />
                            </a>
                          </div>
                        ) : null}
                      </div>
                    );
                  })()}
                  {activeClient.email && (
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-sm text-zinc-300 min-w-0 flex-1">
                        <Mail size={13} className="text-zinc-600 shrink-0" />
                        <a
                          href={`mailto:${encodeURIComponent(activeClient.email)}`}
                          className="truncate text-sky-400/90 underline-offset-2 hover:underline active:opacity-80"
                        >
                          {activeClient.email}
                        </a>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <a
                          href={`mailto:${encodeURIComponent(activeClient.email)}`}
                          className="p-2.5 rounded-xl bg-white/[0.06] border border-white/[0.1] text-zinc-300 hover:bg-white/[0.1] transition-colors active:scale-95"
                          aria-label="Open email"
                        >
                          <Mail size={16} />
                        </a>
                        <button
                          type="button"
                          onClick={() => { setSingleRecipient(activeClient); setView("email"); setActiveClient(null); }}
                          className="p-2.5 rounded-xl bg-white/[0.06] border border-white/[0.1] text-zinc-300 hover:bg-white/[0.1] transition-colors active:scale-95"
                          aria-label="Compose in Email Marketing"
                        >
                          <Send size={16} />
                        </button>
                      </div>
                    </div>
                  )}
                  {activeClient._lastAddress && activeClient._lastAddress !== "No address recorded" && (
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-sm text-zinc-300 min-w-0 flex-1">
                        <Navigation size={13} className="text-zinc-600 shrink-0" />
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(activeClient._lastAddress)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="truncate text-xs text-sky-400/90 underline-offset-2 hover:underline active:opacity-80 text-left"
                        >
                          {activeClient._lastAddress}
                        </a>
                      </div>
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(activeClient._lastAddress)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2.5 rounded-xl bg-white/[0.06] border border-white/[0.1] text-zinc-300 hover:bg-white/[0.1] shrink-0 transition-colors active:scale-95"
                        aria-label="Open in Maps"
                      >
                        <Navigation size={16} />
                      </a>
                    </div>
                  )}
                </div>

                {/* Loyalty tier */}
                <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Star size={13} className="text-amber-500" />
                      <span className="text-sm font-bold">Loyalty Tier</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-amber-500 font-black text-base">
                        {(activeClient.loyalty_discount_pct ?? 0) > 0
                          ? `${activeClient.loyalty_discount_pct}% off`
                          : "No tier yet"}
                      </span>
                    </div>
                  </div>
                  <p className="text-[11px] text-zinc-600 mt-1.5">
                    {activeClient._is_signed_up
                      ? `${activeClient.completed_detail_count ?? 0} qualifying vehicle detail${(activeClient.completed_detail_count ?? 0) !== 1 ? "s" : ""} completed`
                      : "Guest booking — loyalty tracks on signed-up accounts only."}
                  </p>
                </div>

                {/* Vehicles */}
                {activeClient.vehicles?.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-[9px] font-black uppercase tracking-widest text-zinc-600">Garage</p>
                    {activeClient.vehicles.map((v: any) => (
                      <div key={v.id} className="flex items-center gap-2 text-sm text-zinc-300">
                        <Car size={13} className="text-zinc-600 shrink-0" />
                        <span>{[v.year, v.make, v.model].filter(Boolean).join(" ")}</span>
                        <span className="text-zinc-600 text-xs capitalize">{v.size?.replace("_", " ")}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Notes */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <p className="text-[9px] font-black uppercase tracking-widest text-zinc-600">Notes</p>
                    <button onClick={() => { setNotesValue(activeClient.notes ?? ""); setEditingNotes(!editingNotes); }}
                      className="text-[9px] font-black uppercase tracking-widest text-zinc-600 hover:text-amber-500">
                      {editingNotes ? "Cancel" : "Edit"}
                    </button>
                  </div>
                  {editingNotes ? (
                    <div className="space-y-2">
                      <textarea value={notesValue} onChange={e => setNotesValue(e.target.value)} rows={4}
                        className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500/50 resize-none" />
                      <button onClick={saveNotes} disabled={savingNotes}
                        className="w-full py-2.5 rounded-xl bg-amber-500 text-black text-sm font-black uppercase tracking-wider active:scale-95 flex items-center justify-center gap-2">
                        {savingNotes ? <Loader2 className="animate-spin" size={14} /> : <><Save size={13} /> Save Notes</>}
                      </button>
                    </div>
                  ) : (
                    <p className="text-sm text-zinc-500 italic">{activeClient.notes || "No notes yet."}</p>
                  )}
                </div>
              </div>
            )}

            {clientTab === "history" && (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {!activeClient.bookings?.length ? (
                  <p className="text-sm text-zinc-600 text-center py-4">No bookings yet.</p>
                ) : [...activeClient.bookings].sort((a: any, b: any) => (b.booking_date ?? "").localeCompare(a.booking_date ?? "")).map((b: any) => {
                  const addons: any[] = (() => { try { return Array.isArray(b.addons_json) ? b.addons_json : []; } catch { return []; } })();
                  const vehicleStr = [b.vehicle_year, b.vehicle_make, b.vehicle_model].filter(Boolean).join(" ");
                  const isPaid = !!b.stripe_checkout_session_id || b.payment_method === "pay_now" || (b.notes ?? "").includes("Pay Now (Stripe)");
                  return (
                    <div key={b.id} className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-3 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-black text-amber-500">{b.display_date ?? b.booking_date}</p>
                          <p className="text-sm font-bold truncate">{b._service_name ?? b.services?.name ?? b.service_name ?? "Detail"}</p>
                          {vehicleStr && <p className="text-xs text-zinc-600 truncate">{vehicleStr}</p>}
                        </div>
                        <div className="text-right shrink-0 space-y-1">
                          <p className="text-sm font-black">${Number(b.total_price ?? 0).toFixed(0)}</p>
                          <div className="flex items-center justify-end gap-1">
                            <span className={`inline-flex items-center text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full border ${isPaid ? "bg-sky-500/10 text-sky-400 border-sky-500/20" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"}`}>
                              {isPaid ? "Stripe" : "Cash"}
                            </span>
                            <StatusBadge status={b.status} />
                          </div>
                        </div>
                      </div>
                      {addons.length > 0 && (
                        <div className="pt-1.5 border-t border-white/[0.05]">
                          {addons.map((a: any) => (
                            <span key={a.id} className="inline-block text-[9px] text-zinc-600 bg-white/[0.03] border border-white/[0.05] rounded px-1.5 py-0.5 mr-1 mb-1">
                              + {a.label}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

function MiniStat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl py-2 px-3 text-center">
      <p className={cn("text-lg font-black", color ?? "text-white")}>{value}</p>
      <p className="text-[9px] font-black uppercase tracking-wider text-zinc-600 mt-0.5">{label}</p>
    </div>
  );
}
