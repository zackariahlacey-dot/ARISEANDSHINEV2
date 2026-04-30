"use client";

import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton() {
  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  return (
    <button
      type="button"
      onClick={handleSignOut}
      className="flex items-center gap-2 text-xs font-semibold text-zinc-600 hover:text-zinc-400 transition-colors"
    >
      <LogOut size={13} />
      Sign Out
    </button>
  );
}
