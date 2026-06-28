"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * Capture a cross-sell coupon code from the URL and persist it for
 * the booking modal to pick up. Mounted once in the root layout so
 * every entry point (homepage, /detailing, /boat-detailing, town
 * pages, etc.) collects the code without each page wiring it.
 *
 * Flow:
 *   1. Customer clicks "Book a detail (15% off)" on the exterior
 *      site → lands here at ?coupon=DETAIL-A4B8K
 *   2. We write the code to localStorage under CROSS_SELL_COUPON_KEY
 *   3. We strip the param from the URL so it doesn't get shared /
 *      bookmarked / reused
 *   4. BookingModal reads localStorage on open, validates server-side,
 *      and applies the discount.
 *
 * Persists across pages so the customer can browse before booking,
 * but expires after 30 days (matches the exterior tier-2 window).
 */

const KEY = "asd_cross_sell_coupon";
const TTL_MS = 30 * 24 * 60 * 60 * 1000;

type StoredCoupon = {
  code: string;
  capturedAt: number;
};

export function getStoredCrossSellCoupon(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredCoupon;
    if (!parsed?.code) return null;
    if (Date.now() - (parsed.capturedAt ?? 0) > TTL_MS) {
      localStorage.removeItem(KEY);
      return null;
    }
    return parsed.code;
  } catch {
    return null;
  }
}

export function clearStoredCrossSellCoupon() {
  if (typeof window === "undefined") return;
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}

export function CrossSellCouponCapture() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const code = searchParams.get("coupon");
    if (!code) return;
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;

    try {
      localStorage.setItem(
        KEY,
        JSON.stringify({ code: trimmed, capturedAt: Date.now() } satisfies StoredCoupon),
      );
    } catch { /* localStorage disabled — best-effort */ }

    // Strip ?coupon= from the URL so it doesn't get bookmarked, shared,
    // or re-applied on every refresh. Preserve other query params.
    const next = new URLSearchParams(Array.from(searchParams.entries()));
    next.delete("coupon");
    const qs = next.toString();
    router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
  }, [searchParams, router, pathname]);

  return null;
}
