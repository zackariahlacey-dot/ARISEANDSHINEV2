"use client";

import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { getAllClients, getClientEmail, sendCustomEmailAction } from "@/app/actions/adminActions";
import { sendTestMonthlyEmail, type TestEmailType } from "@/app/actions/sendTestMonthlyEmail";
import { useToast } from "@/components/admin/Toast";
import { Mail, Search, Check, Send, Sparkles, Star, Tag, RefreshCcw, Car, Zap, Loader2, Navigation, Crown, FlaskConical } from "lucide-react";
import { cn } from "@/lib/utils";

const TEMPLATES = [
  {
    id: "review",
    icon: Star,
    label: "Review Request",
    color: "text-amber-500",
    bg: "bg-amber-500/10",
    subject: "How was your detail with Arise & Shine?",
    body: "Hi {name},\n\nThank you for trusting Arise & Shine with your vehicle! We hope you love the results.\n\nAs a local business, reviews mean the world to us. If you have 60 seconds, we'd be incredibly grateful if you could leave us a review here:\n[INSERT GOOGLE LINK]\n\nThanks again!\nZack"
  },
  {
    id: "promo",
    icon: Tag,
    label: "Promo Offer",
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    subject: "20% off your next detail! 🎁",
    body: "Hi {name},\n\nIt's been a while since we saw your {vehicle}! We're running a special promotion this month.\n\nBook your next detail using code SUMMER20 to get 20% off any service.\n\nBook here: https://ariseandshinevt.com\n\nHope to see you soon!\nZack"
  },
  {
    id: "fpf",
    icon: Zap,
    label: "Front Porch Forum",
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    subject: "Special Offer for Front Porch Forum!",
    body: "Hi {name},\n\nWord of mouth is how our business grows. If you post a short recommendation for Arise & Shine on your local Front Porch Forum, we'll give you 20% off your next detail!\n\nJust reply to this email with a screenshot of your post, and we'll apply the discount to your account.\n\nThank you for supporting local!\nZack"
  },
  {
    id: "followup",
    icon: RefreshCcw,
    label: "Follow-Up",
    color: "text-violet-500",
    bg: "bg-violet-500/10",
    subject: "Time for a maintenance detail?",
    body: "Hi {name},\n\nCan you believe it's been over 6 months since we last detailed your {vehicle}? To keep your paint protected and interior fresh, we recommend a maintenance detail every 4-6 months.\n\nLet's get you on the schedule!\nhttps://ariseandshinevt.com\n\nBest,\nZack"
  },
  {
    id: "thankyou",
    icon: Sparkles,
    label: "Thank You",
    color: "text-pink-500",
    bg: "bg-pink-500/10",
    subject: "Thank you for your business!",
    body: "Hi {name},\n\nJust wanted to send a quick note to say thank you for your business today. It was a pleasure working on your {vehicle}.\n\nYou've earned loyalty points for today's service which you can use for discounts in the future.\n\nIf you need anything else, just reply to this email!\nZack"
  },
  {
    id: "omw",
    icon: Navigation,
    label: "On My Way",
    color: "text-teal-500",
    bg: "bg-teal-500/10",
    subject: "Your Detailing Update - On My Way!",
    body: "Hi {name},\n\nJust a quick heads up that I am on my way to your location for your detailing appointment.\n\nSee you soon!\nZack"
  }
];

export default function EmailPage() {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const preselectedClientId = searchParams.get("client");

  const { data: clients, isLoading } = useQuery({
    queryKey: ["admin", "clients"],
    queryFn: async () => await getAllClients(),
  });

  const [search, setSearch] = useState("");
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [selectorOpen, setSelectorOpen] = useState(false);

  // Monthly email test state
  const [testEmail, setTestEmail]       = useState("");
  const [testSending, setTestSending]   = useState<TestEmailType | null>(null);

  // Handle preselection from URL
  useEffect(() => {
    if (preselectedClientId && clients) {
      const c = clients.find((x: any) => x.id === preselectedClientId);
      if (c) setSelectedClient(c);
    }
  }, [preselectedClientId, clients]);

  const filteredClients = useMemo(() => {
    if (!clients) return [];
    if (!search) return clients.slice(0, 10);
    const q = search.toLowerCase();
    return clients.filter((c: any) => 
      `${c.first_name || ""} ${c.last_name || ""}`.toLowerCase().includes(q) ||
      c.phone?.includes(q)
    ).slice(0, 50);
  }, [clients, search]);

  const loadTemplate = (t: typeof TEMPLATES[0]) => {
    if (!selectedClient) { toast("Please select a client first", "error"); return; }
    const name = selectedClient.first_name || "there";
    const vehicle = selectedClient.vehicles?.[0] ? `${selectedClient.vehicles[0].year} ${selectedClient.vehicles[0].make} ${selectedClient.vehicles[0].model}` : "vehicle";
    
    setSubject(t.subject.replace(/{name}/g, name));
    setBody(t.body.replace(/{name}/g, name).replace(/{vehicle}/g, vehicle));
  };

  const handleTestMonthlyEmail = async (type: TestEmailType) => {
    const email = testEmail.trim();
    if (!email || !email.includes("@")) { toast("Enter a valid email address", "error"); return; }
    setTestSending(type);
    try {
      const res = await sendTestMonthlyEmail(email, type);
      if (res.ok) {
        toast(`Test ${type} email sent to ${email}!`);
      } else {
        toast("Failed: " + (res.error || "Unknown error"), "error");
      }
    } catch {
      toast("Error sending test email", "error");
    } finally {
      setTestSending(null);
    }
  };

  const handleSend = async () => {
    if (!selectedClient) { toast("Select a client first", "error"); return; }
    if (!subject || !body) { toast("Subject and body are required", "error"); return; }

    setSending(true);
    try {
      // Get the actual auth email first
      const email = await getClientEmail(selectedClient.id);
      if (!email) { toast("Client has no registered email account.", "error"); return; }

      // Convert newlines to HTML breaks for the email template
      const htmlBody = body.replace(/\n/g, '<br/>');

      const res = await sendCustomEmailAction(email, subject, htmlBody);
      if (res.success) {
        toast("Email sent successfully!");
        setSubject("");
        setBody("");
      } else {
        toast("Failed: " + (res.error || "Unknown error"), "error");
      }
    } catch {
      toast("Error sending email", "error");
    } finally {
      setSending(false);
    }
  };

  if (isLoading) return <div className="h-[80dvh] flex items-center justify-center"><Loader2 className="animate-spin text-amber-500" size={28} /></div>;

  return (
    <div className="flex flex-col h-full bg-[#050505] relative">
      <div className="shrink-0 p-3 md:p-6 border-b border-white/[0.03]">
        <h1 className="text-xl font-black uppercase tracking-tighter">Email HQ</h1>
        <p className="text-[8px] font-black text-zinc-600 uppercase tracking-[0.2em]">Comms Center</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6 space-y-6 max-w-3xl mx-auto w-full">

        {/* ── MONTHLY EMAIL TEST PANEL ─────────────────────────────────────── */}
        <div className="rounded-2xl border border-[#D4AF37]/20 bg-[#D4AF37]/5 p-4 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <Crown size={14} className="text-[#D4AF37]" />
            <span className="text-[9px] font-black uppercase tracking-widest text-[#D4AF37]">Monthly Email Preview</span>
            <span className="ml-auto text-[8px] text-zinc-600 uppercase tracking-widest">Demo data · real send</span>
          </div>
          <div className="flex gap-2">
            <input
              value={testEmail}
              onChange={e => setTestEmail(e.target.value)}
              placeholder="Send test to: you@example.com"
              type="email"
              className="flex-1 bg-white/[0.03] border border-white/[0.06] rounded-xl px-3 py-2 text-xs text-white outline-none focus:ring-1 ring-[#D4AF37]/40 placeholder:text-zinc-700"
            />
          </div>
          <div className="grid grid-cols-3 gap-2">
            {([
              { type: "invite" as TestEmailType, label: "Invite", desc: "Sent to new member" },
              { type: "confirmation" as TestEmailType, label: "Confirmation", desc: "After signup" },
              { type: "reminder" as TestEmailType, label: "Reminder", desc: "Monthly pick link" },
            ]).map(({ type, label, desc }) => (
              <button
                key={type}
                onClick={() => handleTestMonthlyEmail(type)}
                disabled={testSending !== null}
                className="flex flex-col items-center gap-1.5 rounded-xl border border-[#D4AF37]/20 bg-[#D4AF37]/5 p-3 hover:bg-[#D4AF37]/10 transition-all active:scale-95 disabled:opacity-50"
              >
                {testSending === type
                  ? <Loader2 size={14} className="animate-spin text-[#D4AF37]" />
                  : <FlaskConical size={14} className="text-[#D4AF37]" />}
                <span className="text-[9px] font-black uppercase tracking-widest text-[#D4AF37] text-center">{label}</span>
                <span className="text-[8px] text-zinc-600 text-center">{desc}</span>
              </button>
            ))}
          </div>
          <p className="text-[8px] text-zinc-700">
            Sends a real email with demo customer data (Sarah · Full Maintenance · Toyota RAV4). Active invite/reminder links are functional.
          </p>
        </div>
        {/* ─────────────────────────────────────────────────────────────────── */}
        
        {/* CLIENT SELECTOR */}
        <div className="space-y-1.5 relative z-20">
          <label className="text-[8px] font-black uppercase tracking-widest text-zinc-600 ml-1">Recipient</label>
          {selectedClient ? (
            <div className="flex items-center justify-between p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-amber-500 flex items-center justify-center text-black font-black text-xs">
                  {(selectedClient.first_name?.[0] || "?")}{(selectedClient.last_name?.[0] || "")}
                </div>
                <div>
                  <p className="font-black text-sm text-amber-500">{selectedClient.first_name} {selectedClient.last_name}</p>
                  <p className="text-[9px] font-mono text-amber-500/70">{selectedClient.phone || "No phone"}</p>
                </div>
              </div>
              <button onClick={() => setSelectedClient(null)} className="px-3 py-1.5 bg-amber-500/20 text-amber-500 rounded-lg text-[9px] font-black uppercase tracking-widest">Change</button>
            </div>
          ) : (
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
              <input value={search} onChange={e => { setSearch(e.target.value); setSelectorOpen(true); }} onFocus={() => setSelectorOpen(true)}
                placeholder="Search name or phone..."
                className="w-full bg-white/[0.03] border border-white/[0.06] rounded-2xl pl-9 pr-4 py-3 text-sm focus:ring-1 ring-amber-500/50 outline-none text-white placeholder:text-zinc-700 transition-all" />
              
              {selectorOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 p-1 bg-[#0A0A0A] border border-white/[0.06] rounded-2xl shadow-2xl max-h-60 overflow-y-auto z-50">
                  {filteredClients.map((c: any) => (
                    <button key={c.id} onClick={() => { setSelectedClient(c); setSelectorOpen(false); setSearch(""); }}
                      className="w-full text-left p-3 rounded-xl hover:bg-white/[0.03] transition-colors flex items-center justify-between group">
                      <div>
                        <p className="font-black text-sm">{c.first_name} {c.last_name}</p>
                        <p className="text-[9px] font-mono text-zinc-600">{c.phone}</p>
                      </div>
                      <ChevronRight size={14} className="text-zinc-800 group-hover:text-amber-500" />
                    </button>
                  ))}
                  {filteredClients.length === 0 && <p className="p-4 text-center text-[10px] font-black uppercase tracking-widest text-zinc-600">No clients found</p>}
                </div>
              )}
            </div>
          )}
        </div>

        {/* CLICK OUTSIDE OVERLAY */}
        {selectorOpen && <div className="fixed inset-0 z-10" onClick={() => setSelectorOpen(false)} />}

        {/* TEMPLATES GRID */}
        <div className="space-y-2 relative z-0">
          <label className="text-[8px] font-black uppercase tracking-widest text-zinc-600 ml-1">Quick Templates</label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {TEMPLATES.map(t => (
              <button key={t.id} onClick={() => loadTemplate(t)}
                className={cn("p-3 rounded-xl border border-white/[0.04] flex flex-col items-center gap-2 transition-all hover:scale-[1.02] active:scale-95 bg-white/[0.02]", t.bg)}>
                <t.icon size={18} className={t.color} />
                <span className={cn("text-[9px] font-black uppercase tracking-widest text-center", t.color)}>{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* COMPOSE */}
        <div className="space-y-3 relative z-0">
          <div className="space-y-1.5">
            <label className="text-[8px] font-black uppercase tracking-widest text-zinc-600 ml-1">Subject</label>
            <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Wait, you haven't booked yet?"
              className="w-full bg-white/[0.02] border border-white/[0.04] rounded-xl px-4 py-3 text-sm focus:ring-1 ring-amber-500/50 outline-none text-white focus:bg-white/[0.04] transition-colors" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[8px] font-black uppercase tracking-widest text-zinc-600 ml-1">Message Body</label>
            <textarea value={body} onChange={e => setBody(e.target.value)} rows={8} placeholder="Hi John..."
              className="w-full bg-white/[0.02] border border-white/[0.04] rounded-xl p-4 text-sm text-zinc-300 focus:ring-1 ring-amber-500/50 outline-none resize-none focus:bg-white/[0.04] transition-colors leading-relaxed" />
          </div>

          <button onClick={handleSend} disabled={sending || !selectedClient || !subject || !body}
            className="w-full py-4 rounded-xl bg-amber-500 text-black font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl shadow-amber-500/20 active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100">
            {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            {sending ? "Sending..." : "Send Email via Resend"}
          </button>
        </div>
      </div>
    </div>
  );
}

// Inline Icon since lucide-react chevron is missing in my import above
function ChevronRight(props: any) {
  return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="m9 18 6-6-6-6"/></svg>
}
