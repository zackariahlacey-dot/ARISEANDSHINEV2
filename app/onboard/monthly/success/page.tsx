import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function MonthlyOnboardSuccessPage() {
  return (
    <div className="min-h-screen bg-zinc-950 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#D4AF37]/15 via-zinc-950 to-zinc-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-zinc-900/50 border border-white/10 rounded-3xl p-10 text-center">
        {/* Gold top line */}
        <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-[#D4AF37]/50 to-transparent" />

        <div className="w-20 h-20 bg-gradient-to-br from-[#D4AF37] to-[#AA771C] rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_40px_rgba(212,175,55,0.3)]">
          <span className="text-black text-3xl font-black">✓</span>
        </div>

        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#D4AF37] mb-3">Monthly Detail Club</p>

        <h1 className="text-3xl font-black text-white mb-4">
          You&apos;re all <span className="text-[#D4AF37]">set!</span>
        </h1>

        <p className="text-zinc-400 text-sm leading-relaxed mb-2">
          Your monthly plan is confirmed. You&apos;ll receive a confirmation email shortly.
        </p>

        <p className="text-zinc-500 text-xs leading-relaxed mb-8">
          Each month you&apos;ll receive an email with a link to pick your preferred detail date.
          Signed-in members can also schedule directly from their dashboard.
        </p>

        <div className="space-y-3">
          <Link
            href="/protected"
            className="block w-full bg-[#D4AF37] text-black font-black text-sm uppercase tracking-wider py-3.5 rounded-xl"
          >
            Go to My Dashboard
          </Link>
          <Link
            href="/"
            className="block w-full text-zinc-500 text-sm py-2 hover:text-zinc-300 transition-colors"
          >
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
