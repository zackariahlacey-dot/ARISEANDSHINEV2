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
    { name: "Maintenance", href: "#maintenance" },
    { name: "About", href: "#about" },
    { name: "Contact", href: "#contact" },
  ];

  return (
    <motion.header
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed top-0 left-0 right-0 z-50 flex justify-center p-4 md:p-6"
    >
      <nav className={cn(
        "glass flex items-center justify-between w-full max-w-7xl rounded-2xl px-6 py-3 md:px-8 md:py-4",
        "border border-white/10 shadow-2xl backdrop-blur-md"
      )}>
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 md:gap-3">
          <div className="relative w-8 h-8 md:w-10 md:h-10 overflow-hidden">
            <img 
              src="/e.png" 
              alt="Arise & Shine VT Logo" 
              className="w-full h-full object-contain brightness-110 contrast-125"
            />
          </div>
          <span className="text-lg font-bold tracking-tighter text-white md:text-2xl">
            ARISE <span className="text-[#fbbf24]">&</span> SHINE
          </span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.name}
              href={link.href}
              className="text-sm font-medium text-white/70 transition-colors hover:text-[#fbbf24]"
            >
              {link.name}
            </Link>
          ))}
          
          <div className="flex items-center gap-4 border-l border-white/10 pl-8">
            <Link href={user ? "/dashboard" : "/auth"}>
              <button className="flex items-center gap-2 text-white/40 hover:text-[#fbbf24] transition-colors group">
                <UserCircle className="w-5 h-5 group-hover:scale-110 transition-transform" />
                <span className="text-[10px] font-black uppercase tracking-[0.3em] hidden lg:block">
                  {user ? "Dashboard" : "Portal"}
                </span>
              </button>
            </Link>
            <PrismButton variant="luxury" onClick={() => document.getElementById('booking')?.scrollIntoView({ behavior: 'smooth' })}>
              Book Now
            </PrismButton>
          </div>
        </div>

        {/* Mobile Nav Button */}
        <div className="md:hidden flex items-center gap-4">
          <Link href={user ? "/dashboard" : "/auth"}>
            <UserCircle className="w-6 h-6 text-white/40" />
          </Link>
          <PrismButton variant="luxury" className="px-4 py-2 text-xs" onClick={() => document.getElementById('booking')?.scrollIntoView({ behavior: 'smooth' })}>
            Book Now
          </PrismButton>
        </div>
      </nav>
    </motion.header>
  );
}
