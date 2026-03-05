"use client";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();

  const handleLogout = async () => {
    const confirmed = window.confirm("Are you sure you want to log out?");
    if (confirmed) {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/auth/login");
    }
  };

  return <Button onClick={handleLogout}>Logout</Button>;
}
