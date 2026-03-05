export default function Loading() {
  return (
    <div className="fixed inset-0 z-[999] flex flex-col items-center justify-center bg-zinc-950">
      {/* Ambient gold glow behind the text */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 40% at 50% 50%, rgba(212,175,55,0.07) 0%, transparent 70%)",
        }}
      />

      {/* Wordmark */}
      <div className="relative flex flex-col items-center gap-6">
        <p
          className="animate-pulse text-2xl font-black tracking-[0.25em] uppercase select-none
                     bg-gradient-to-r from-[#D4AF37] via-[#F3E5AB] to-[#D4AF37] bg-clip-text text-transparent"
          style={{ filter: "drop-shadow(0 0 28px rgba(212,175,55,0.35))" }}
        >
          Arise &amp; Shine
        </p>

        {/* Thin loading track */}
        <div className="relative w-36 h-[2px] rounded-full overflow-hidden bg-zinc-800">
          <div className="absolute inset-y-0 left-0 w-1/2 rounded-full bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent loading-sweep" />
        </div>
      </div>

      {/* Sweep keyframe injected via a style tag so no Tailwind plugin is needed */}
      <style>{`
        @keyframes loading-sweep {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(300%); }
        }
        .loading-sweep {
          animation: loading-sweep 1.6s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }
      `}</style>
    </div>
  );
}
