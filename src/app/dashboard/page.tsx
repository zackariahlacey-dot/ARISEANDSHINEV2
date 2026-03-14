import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Section } from "@/components/ui/Section";
import { GlassCard } from "@/components/ui/GlassCard";
import { PrismButton } from "@/components/ui/PrismButton";
import { LightLeak } from "@/components/ui/LightLeak";
import { 
  Trophy, 
  Zap, 
  Clock, 
  ChevronRight, 
  LogOut,
  Star,
  TrendingUp,
  Wallet,
  Car,
  Gift,
  ShieldCheck,
  MapPin
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  // Fetch complete member profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  // Fetch all bookings associated with this user
  const { data: bookings } = await supabase
    .from("bookings")
    .select("*, services(*)")
    .eq("user_id", user.id)
    .order("scheduled_at", { ascending: false });

  // Also fetch any guest leads that match this user's email (to ensure full history)
  const { data: leads } = await supabase
    .from("leads")
    .select("*")
    .eq("email", user.email)
    .order("preferred_date", { ascending: false });

  // Merge and deduplicate sessions for the Ledger
  // In a production app, we'd ensure these are unified in the DB, but this ensures they see everything now.
  const unifiedSessions = [
    ...(bookings || []).map(b => ({
      id: b.id,
      date: b.scheduled_at,
      service: b.services?.name || "Premium Detail",
      vehicle: b.vehicle,
      address: b.address,
      status: b.status,
      price: b.price_paid,
      xp: b.xp_earned,
      saved: b.amount_saved,
      type: 'booking'
    })),
    ...(leads || []).map(l => ({
      id: l.id,
      date: `${l.preferred_date}T${l.preferred_time || '12:30'}:00`,
      service: l.service,
      vehicle: l.vehicle,
      address: l.address,
      status: l.status,
      price: l.total_price,
      xp: l.total_price,
      saved: 0,
      type: 'lead'
    }))
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const xp = profile?.xp || 0;
  
  const getTier = (xp: number) => {
    if (xp >= 2000) return { name: "Diamond", color: "#e2e8f0", discount: 20, next: null, minXp: 2000 };
    if (xp >= 1500) return { name: "Gold", color: "#fbbf24", discount: 15, next: "Diamond", nextXp: 2000, minXp: 1500 };
    if (xp >= 1000) return { name: "Silver", color: "#94a3b8", discount: 10, next: "Gold", nextXp: 1500, minXp: 1000 };
    if (xp >= 500) return { name: "Bronze", color: "#cd7f32", discount: 5, next: "Silver", nextXp: 1000, minXp: 500 };
    return { name: "Member", color: "#ffffff", discount: 0, next: "Bronze", nextXp: 500, minXp: 0 };
  };

  const tier = getTier(xp);
  const progress = tier.nextXp ? ((xp - tier.minXp) / (tier.nextXp - tier.minXp)) * 100 : 100;

  return (
    <main className="min-h-screen bg-[#050505] relative overflow-hidden">
      <div className="fixed inset-0 gradient-mesh opacity-20 pointer-events-none" />
      <LightLeak color="violet" intensity="medium" className="-top-1/4 -right-1/4 opacity-30" />

      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-black/40 backdrop-blur-2xl">
        <div className="max-w-7xl mx-auto px-6 h-24 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-4 group">
            <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:border-[#fbbf24]/50 transition-all">
              <img src="/e.png" alt="Logo" className="w-6 h-6 object-contain" />
            </div>
            <span className="text-2xl font-black tracking-tighter text-white uppercase">ARISE <span className="text-[#fbbf24]">&</span> SHINE</span>
          </Link>
          
          <div className="flex items-center gap-4">
            <form action="/auth/signout" method="post">
              <button type="submit" className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/40 hover:text-[#fbbf24] transition-all">
                <LogOut className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Terminate Session</span>
              </button>
            </form>
          </div>
        </div>
      </nav>

      <Section spacing="large" className="pt-32">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          <div className="lg:col-span-4 space-y-6">
            <GlassCard glowColor="amber" className="p-10 border-white/5 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-40 h-40 bg-[#fbbf24]/10 blur-3xl rounded-full" />
              <div className="relative z-10 flex flex-col items-center text-center">
                <div className="w-28 h-24 flex items-center justify-center relative mb-6">
                  <Trophy className="w-16 h-16" style={{ color: tier.color }} />
                  <div className="absolute inset-0 blur-2xl opacity-20" style={{ backgroundColor: tier.color }} />
                </div>
                <h2 className="text-white font-black text-3xl tracking-tighter uppercase mb-1">{profile?.full_name || "Prestige Member"}</h2>
                <p className="text-[10px] font-black uppercase tracking-[0.4em] mb-8" style={{ color: tier.color }}>{tier.name} Status • {tier.discount}% Lifetime Unlock</p>
                <div className="w-full space-y-4">
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-4 relative group">
                    <p className="text-white/30 text-[10px] font-black uppercase tracking-widest mb-1">Redeemable Credit</p>
                    <div className="flex items-center justify-between">
                      <p className="text-[#fbbf24] text-3xl font-black tracking-tighter">${Math.floor(xp / 10)}</p>
                      {xp >= 10 && (
                        <Link href="/#booking?redeem=true">
                          <button className="px-4 py-2 rounded-lg bg-[#fbbf24] text-black text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-[0_0_15px_rgba(251,191,36,0.3)]">
                            Redeem Now
                          </button>
                        </Link>
                      )}
                    </div>
                    <p className="text-[9px] text-white/20 uppercase font-bold mt-2 italic">Ready for your next session</p>
                  </div>

                  <div className="flex justify-between items-end">
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30">{xp} XP Banked</span>
                    {tier.next && <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#fbbf24]">Next: {tier.next}</span>}
                  </div>
                  <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-linear-to-r from-[#fbbf24] to-[#8b5cf6] shadow-[0_0_15px_#fbbf24] transition-all duration-1000" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              </div>
            </GlassCard>

            <div className="p-8 rounded-[32px] bg-white/[0.02] border border-white/5 space-y-6">
              <div className="flex items-center gap-3">
                <Gift className="w-4 h-4 text-[#fbbf24]" />
                <h4 className="text-white font-black uppercase tracking-widest text-[10px]">Rewards Economy</h4>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-4 rounded-2xl bg-white/5 border border-white/5">
                  <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Exchange Rate</span>
                  <span className="text-xs font-bold text-white">10 Points = $1 Discount</span>
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] font-black text-[#fbbf24] uppercase tracking-widest mb-3">Membership Tiers</p>
                  {[
                    { label: "Bronze (500 XP)", value: "5% Off Life" },
                    { label: "Silver (1000 XP)", value: "10% Off Life" },
                    { label: "Gold (1500 XP)", value: "15% Off Life" },
                    { label: "Diamond (2000 XP)", value: "20% Off Life" },
                  ].map(t => (
                    <div key={t.label} className="flex justify-between text-[9px] font-bold uppercase tracking-widest text-white/30">
                      <span>{t.label}</span>
                      <span className="text-white/60">{t.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-6 rounded-[32px] bg-white/[0.02] border border-white/5">
                <TrendingUp className="w-4 h-4 text-[#fbbf24] mb-4" />
                <p className="text-[9px] font-black uppercase tracking-widest text-white/20 mb-1">Lifetime Spent</p>
                <p className="text-xl font-black text-white">${profile?.lifetime_spent || 0}</p>
              </div>
              <div className="p-6 rounded-[32px] bg-white/[0.02] border border-white/5">
                <Wallet className="w-4 h-4 text-green-500 mb-4" />
                <p className="text-[9px] font-black uppercase tracking-widest text-white/20 mb-1">Total Saved</p>
                <p className="text-xl font-black text-white">${profile?.lifetime_saved || 0}</p>
              </div>
            </div>

            <div className="p-8 rounded-[32px] bg-white/[0.02] border border-white/5">
              <div className="flex items-center justify-between mb-6 px-2">
                <h4 className="text-white font-black uppercase tracking-widest text-[10px]">Member Vault</h4>
                <Car className="w-4 h-4 text-white/20" />
              </div>
              <div className="space-y-3">
                {profile?.saved_vehicles?.length > 0 ? (
                  profile.saved_vehicles.map((v: string) => (
                    <div key={v} className="p-4 rounded-2xl bg-white/5 border border-white/5 flex items-center gap-3 group transition-all hover:bg-white/10">
                      <div className="w-2 h-2 rounded-full bg-[#fbbf24]" />
                      <span className="text-xs font-bold text-white/70">{v}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-[10px] text-white/20 italic px-2 text-center py-4">Vault empty.</p>
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-8 space-y-8">
            <div className="flex items-end justify-between px-2">
              <div>
                <h3 className="text-4xl font-black text-white tracking-tighter uppercase mb-2">Service Ledger</h3>
                <p className="text-white/30 text-[10px] font-black uppercase tracking-[0.3em]">Your Detailing Chronicle</p>
              </div>
              <Link href="/#booking">
                <PrismButton variant="gold" className="text-[10px] px-8">Schedule Session</PrismButton>
              </Link>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {unifiedSessions.length > 0 ? (
                unifiedSessions.map((session, idx) => (
                  <GlassCard key={`${session.id}-${idx}`} className="p-8 border-white/5 hover:border-white/10 transition-all group flex items-center justify-between">
                    <div className="flex items-center gap-8">
                      <div className="text-center w-12">
                        <p className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-1">
                          {new Date(session.date).toLocaleDateString('en-US', { month: 'short' })}
                        </p>
                        <p className="text-3xl font-black text-white leading-none">{new Date(session.date).getDate()}</p>
                      </div>
                      <div className="h-12 w-px bg-white/5" />
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="text-white font-black uppercase tracking-widest text-sm">{session.service}</h4>
                          <span className={cn(
                            "text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border",
                            session.status?.includes('paid') || session.status === 'confirmed' || session.status === 'completed'
                              ? "bg-green-500/10 border-green-500/20 text-green-500" 
                              : "bg-[#fbbf24]/10 border-[#fbbf24]/20 text-[#fbbf24]"
                          )}>
                            {session.status}
                          </span>
                        </div>
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-4 text-[10px] text-white/30 font-bold uppercase tracking-[0.2em]">
                            <span className="flex items-center gap-1.5"><Car className="w-3 h-3" /> {session.vehicle}</span>
                            {session.saved > 0 && <span className="flex items-center gap-1.5 text-green-500/70"><Wallet className="w-3 h-3" /> Saved ${session.saved}</span>}
                          </div>
                          <div className="flex items-center gap-1.5 text-[9px] text-white/10">
                            <MapPin className="w-2.5 h-2.5" />
                            <span className="truncate max-w-[250px]">{session.address}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-black text-white mb-1">${session.price}</p>
                      <p className="text-[9px] font-black text-[#fbbf24] uppercase tracking-widest">+{session.xp} XP</p>
                    </div>
                  </GlassCard>
                ))
              ) : (
                <div className="bg-white/5 border border-dashed border-white/10 rounded-[40px] p-24 text-center">
                  <p className="text-white/30 text-xs font-black uppercase tracking-[0.4em] mb-10">No sessions recorded.</p>
                  <Link href="/#booking">
                    <PrismButton variant="luxury" className="px-12 py-4">Commence Sessions</PrismButton>
                  </Link>
                </div>
              )}
            </div>
          </div>

        </div>
      </Section>
    </main>
  );
}
