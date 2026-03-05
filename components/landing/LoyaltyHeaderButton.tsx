"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getAuthProfile, type AuthProfile } from "@/app/actions/getAuthProfile";
import { Gift, LogOut, Loader2 } from "lucide-react";

export function LoyaltyHeaderButton() {
  const router = useRouter();
  const [profile, setProfile] = useState<AuthProfile | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  const handleSignOut = async () => {
    const confirmed = window.confirm("Are you sure you want to log out?");
    if (confirmed) {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.refresh();
    }
  };

  useEffect(() => {
    const supabase = createClient();

    const updateProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setProfile(null);
        setLoading(false);
        return;
      }
      const p = await getAuthProfile();
      setProfile(p);
      setLoading(false);
    };

    updateProfile();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      updateProfile();
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <span className="flex items-center gap-1.5 text-sm text-zinc-500">
        <Loader2 size={14} className="animate-spin" />
      </span>
    );
  }

  if (profile) {
    return (
      <div className="flex items-center gap-3">
        <Link
          href="/protected"
          className="flex items-center gap-1.5 text-sm font-medium text-zinc-300 hover:text-white transition-colors"
          title="View loyalty dashboard"
        >
          <Gift size={14} className="text-amber-400/90" />
          <span>{profile.rewardPoints} pts</span>
        </Link>
        <button
          type="button"
          onClick={handleSignOut}
          className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          title="Sign out"
        >
          <LogOut size={12} />
          <span className="hidden sm:inline">Log out</span>
        </button>
      </div>
    );
  }

  return (
    <Link
      href="/auth/login?redirect=/"
      className="flex items-center gap-1.5 text-sm font-medium text-zinc-300 hover:text-white transition-colors"
    >
      <Gift size={14} className="text-amber-400/90" />
      Loyalty Login
    </Link>
  );
}
