"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const SESSION_FLAG = "aas:pwa-launch-redirected";

/**
 * When the app is launched from a home-screen icon (PWA "standalone" mode),
 * `/` is the marketing landing page — which is wrong for someone who installed
 * the app to use the dashboard or admin. This component runs once on first
 * mount and redirects:
 *
 *   role=admin       → /admin
 *   role=contractor  → /protected  (the role-aware /protected handles their
 *                                    further routing to /protected/onboarding
 *                                    or the contractor dashboard)
 *   role=customer    → /protected
 *   not signed in    → /auth/login?redirect=/protected
 *
 * Only fires:
 *   - in standalone display mode (PWA launch)
 *   - on the bare "/" path (so manually navigating to / inside the app
 *     doesn't trap them in a redirect loop)
 *   - once per session (sessionStorage flag) so deep-link clicks back to /
 *     inside the running PWA stay where the user clicked
 *
 * Mounted globally in the root layout. No-op in the regular web browser.
 */
export function PWALaunchRedirect() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (pathname !== "/") return;

    // Detect PWA / standalone mode. Both the CSS media query (Chrome / Edge /
    // newer iOS) and the legacy iOS Safari navigator.standalone are checked.
    const isStandalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      (window.navigator as { standalone?: boolean }).standalone === true;
    if (!isStandalone) return;

    // Only redirect once per session — otherwise tapping the A&S logo to
    // navigate back to / inside the PWA would bounce them.
    try {
      if (sessionStorage.getItem(SESSION_FLAG)) return;
      sessionStorage.setItem(SESSION_FLAG, "1");
    } catch {
      // sessionStorage blocked (rare) — fall through, worst case one bonus redirect
    }

    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/auth/login?redirect=/protected");
        return;
      }

      // Quick role lookup — best-effort, falls back to /protected (which is
      // itself role-aware and will route them correctly).
      let role: string | null = null;
      try {
        const { data: row } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();
        role = ((row as { role?: string } | null)?.role ?? null);
      } catch {
        // ignore — server already routes correctly from /protected
      }

      if (role === "admin") router.replace("/admin");
      else router.replace("/protected");
    })();
  }, [router, pathname]);

  return null;
}
