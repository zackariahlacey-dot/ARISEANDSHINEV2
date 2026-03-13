import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Section } from "@/components/ui/Section";
import { GlassCard } from "@/components/ui/GlassCard";
import { LightLeak } from "@/components/ui/LightLeak";
import { 
  Trophy, 
  Zap, 
  Clock, 
  Calendar, 
  ChevronRight, 
  LogOut,
  Settings,
  ShieldCheck,
  Star
} from "lucide-react";
import Link from "next/link";

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  // Fetch profile and bookings
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const { data: bookings } = await supabase
    .from("bookings")
    .select("*, services(*)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const xp = profile?.xp || 0;
  const level = profile?.level || 1;
  const xpToNextLevel = level * 1000;
  const progress = (xp % 1000) / 10;

  return (
    <main className="min-h-screen bg-[#050505] relative overflow-hidden">
      <div className="fixed inset-0 gradient-mesh opacity-20 pointer-events-none" />
      <LightLeak color="violet" intensity="medium" className="-top-1/4 -right-1/4 opacity-30" />

      {/* Sidebar / Top Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-black/50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <img src="/e.png" alt="Logo" className="w-8 h-8 object-contain" />
            <span className="text-xl font-black tracking-tighter text-white uppercase">ARISE <span className="text-[#fbbf24]">&</span> SHINE</span>
          </Link>
          <div className="flex items-center gap-6">
            <button className="text-white/40 hover:text-white transition-colors">
              <Settings className="w-5 h-5" />
            </button>
            <form action="/auth/signout" method="post">
              <button type="submit" className="text-white/40 hover:text-[#fbbf24] transition-colors">
                <LogOut className="w-5 h-5" />
              </button>
            </form>
          </div>
        </div>
      </nav>

      <Section spacing="large" className="pt-32">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Rank & Profile Card */}
          <div className="lg:col-span-4 space-y-6">
            <GlassCard glowColor="amber" className="p-8 border-white/5 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#fbbf24]/10 blur-3xl rounded-full" />
              
              <div className="relative z-10 flex flex-col items-center text-center">
                <div className="w-24 h-24 rounded-full bg-linear-to-br from-[#fbbf24] to-[#8b5cf6] p-1 mb-6">
                  <div className="w-full h-full rounded-full bg-black flex items-center justify-center">
                    <Trophy className="w-10 h-10 text-[#fbbf24]" />
                  </div>
                </div>
                
                <h2 className="text-white font-black text-2xl tracking-tighter uppercase mb-1">
                  {profile?.full_name || user.email?.split("@")[0]}
                </h2>
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 mb-8">
                  <Star className="w-3 h-3 text-[#fbbf24] fill-[#fbbf24]" />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60">
                    Level {level} Prestige
                  </span>
                </div>

                {/* XP Progress */}
                <div className="w-full space-y-3">
                  <div className="flex justify-between items-end">
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30">Total XP: {xp}</span>
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#fbbf24]">{Math.floor(progress)}%</span>
                  </div>
                  <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                    <div 
                      className="h-full bg-linear-to-r from-[#fbbf24] to-[#8b5cf6] shadow-[0_0_15px_#fbbf24] transition-all duration-1000"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="text-[9px] text-white/20 uppercase tracking-widest font-bold">
                    Next level at {xpToNextLevel} XP
                  </p>
                </div>
              </div>
            </GlassCard>

            <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/5">
              <h4 className="text-white/40 text-[10px] font-black uppercase tracking-[0.3em] mb-6 px-2">Elite Benefits</h4>
              <div className="space-y-4">
                {[
                  { label: "Priority Concierge", icon: <Zap className="w-4 h-4" />, active: true },
                  { label: "Fixed Monthly Pricing", icon: <Clock className="w-4 h-4" />, active: true },
                  { label: "Weekend Sessions", icon: <Calendar className="w-4 h-4" />, active: false },
                ].map((perk) => (
                  <div key={perk.label} className={cn("flex items-center justify-between p-4 rounded-xl border transition-all", perk.active ? "bg-white/5 border-white/10" : "opacity-30 border-transparent")}>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-black flex items-center justify-center text-[#fbbf24]">
                        {perk.icon}
                      </div>
                      <span className="text-xs font-bold text-white/80">{perk.label}</span>
                    </div>
                    {perk.active && <ShieldCheck className="w-4 h-4 text-green-500" />}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Activity & History */}
          <div className="lg:col-span-8 space-y-8">
            <div>
              <h3 className="text-3xl font-black text-white tracking-tighter uppercase mb-2">Member Activity</h3>
              <p className="text-white/30 text-xs font-bold uppercase tracking-[0.2em]">Your detailing legacy in Vermont</p>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {bookings && bookings.length > 0 ? (
                bookings.map((booking) => (
                  <GlassCard key={booking.id} className="p-6 border-white/5 hover:border-white/10 transition-all group flex items-center justify-between">
                    <div className="flex items-center gap-6">
                      <div className="w-14 h-14 rounded-2xl bg-white/5 flex flex-col items-center justify-center border border-white/10">
                        <span className="text-xs font-black text-white">{new Date(booking.created_at).toLocaleDateString('en-US', { month: 'short' })}</span>
                        <span className="text-lg font-black text-[#fbbf24] leading-none">{new Date(booking.created_at).getDate()}</span>
                      </div>
                      <div>
                        <h4 className="text-white font-black uppercase tracking-widest text-sm mb-1">{booking.services?.name || "Premium Detail"}</h4>
                        <div className="flex items-center gap-4 text-[10px] text-white/30 font-bold uppercase tracking-widest">
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {booking.status}</span>
                          <span className="text-[#fbbf24]">+{booking.services?.xp_reward || 1000} XP</span>
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-white/10 group-hover:text-[#fbbf24] transition-all group-hover:translate-x-1" />
                  </GlassCard>
                ))
              ) : (
                <div className="bg-white/5 border border-dashed border-white/10 rounded-[32px] p-20 text-center">
                  <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Clock className="w-8 h-8 text-white/10" />
                  </div>
                  <p className="text-white/30 text-sm font-bold uppercase tracking-widest mb-8">No Activity Logged</p>
                  <Link href="/#booking">
                    <PrismButton variant="luxury" className="px-8 py-3 text-[10px]">Secure Your First Session</PrismButton>
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

// Utility
import { cn } from "@/lib/utils";
