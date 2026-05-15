"use client";

import { useState } from "react";
import { Loader2, Crown } from "lucide-react";
import { createMembershipCheckout } from "@/app/actions/membership";

export function MembershipPurchaseClient() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePurchase = async () => {
    setError(null);
    setLoading(true);
    const origin = window.location.origin;
    const result = await createMembershipCheckout({
      successUrl: `${origin}/membership?success=1`,
      cancelUrl: `${origin}/membership`,
    });
    if (result.success) {
      window.location.href = result.checkoutUrl;
    } else {
      setLoading(false);
      setError(result.error);
    }
  };

  return (
    <div className="space-y-3">
      <button
        onClick={handlePurchase}
        disabled={loading}
        className="w-full py-4 rounded-xl font-black text-base bg-gradient-to-r from-[#D4AF37] to-[#F0D060] text-black hover:opacity-95 transition-all active:scale-[0.98] shadow-[0_4px_24px_rgba(212,175,55,0.35)] disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Redirecting to checkout…
          </>
        ) : (
          <>
            <Crown size={16} fill="currentColor" />
            Become a Member · $999
          </>
        )}
      </button>
      {error && (
        <p className="text-xs text-red-400 text-center">{error}</p>
      )}
    </div>
  );
}
