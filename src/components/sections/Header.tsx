"use client";

import { motion } from "framer-motion";
import { PrismButton } from "@/components/ui/PrismButton";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { UserCircle } from "lucide-react";

export default function Header() {
  const [user, setUser] = useState<any>(null);
  const supabase = createClient();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const navLinks = [
    { name: "Services", href: "#services" },
    { name: "Membership", href: "#maintenance" },
    { name: "Gallery", href: "#transformations" },
    { name: "Experience", href: "#about" },
  ];

  return (
    <motion.header
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed top-0 left-0 right-0 z-50 flex justify-center p-4 md:p-8"
    >
      <nav className={cn(
        "flex items-center justify-between w-full max-w-7xl px-6 py-4 md:px-10 rounded-full",
        "bg-black/40 backdrop-blur-2xl border border-white/5 shadow-2xl"
      )}>
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="relative w-8 h-8 md:w-10 md:h-10 overflow-hidden rounded-full bg-white/5 border border-white/10 flex items-center justify-center group-hover:border-[#fbbf24]/50 transition-all duration-500">
            <img 
              src="/e.png" 
              alt="Logo" 
              className="w-6 h-6 md:w-7 md:h-7 object-contain"
            />
          </div>
          <span className="text-xl font-black tracking-tighter text-white md:text-2xl uppercase italic leading-none">
            ARISE <span className="text-[#fbbf24]">&</span> SHINE
          </span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-12">
          <div className="flex items-center gap-10">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 transition-colors hover:text-[#fbbf24]"
              >
                {link.name}
              </Link>
            ))}
          </div>
          
          <div className="flex items-center gap-6 border-l border-white/10 pl-12">
            <Link href={user ? "/dashboard" : "/auth"}>
              <button className="flex items-center gap-3 text-white/40 hover:text-white transition-colors">
                <UserCircle className="w-5 h-5 group-hover:text-[#fbbf24] transition-colors" />
                <span className="text-[10px] font-black uppercase tracking-[0.3em]">
                  {user ? "Portal" : "Join"}
                </span>
              </button>
            </Link>
            <PrismButton variant="gold" onClick={() => document.getElementById('booking')?.scrollIntoView({ behavior: 'smooth' })} className="py-4 px-10 rounded-full text-[10px] shadow-[0_10px_30px_rgba(251,191,36,0.1)]">
              RESERVE
            </PrismButton>
          </div>
        </div>

        {/* Mobile Nav Button */}
        <div className="md:hidden flex items-center gap-4">
          <Link href={user ? "/dashboard" : "/auth"}>
            <UserCircle className="w-6 h-6 text-white/40" />
          </Link>
          <PrismButton variant="gold" className="px-5 py-2.5 text-[8px] rounded-full" onClick={() => document.getElementById('booking')?.scrollIntoView({ behavior: 'smooth' })}>
            BOOK
          </PrismButton>
        </div>
      </nav>
    </motion.header>
  );
}
