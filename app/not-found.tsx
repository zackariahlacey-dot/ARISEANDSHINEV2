import Link from "next/link";

const LOGO_URL =
  "https://esgdlmvvjrduazdraewq.supabase.co/storage/v1/object/public/public-assets/e.png";

export default function NotFound() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ backgroundColor: "#09090b" }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={LOGO_URL}
        alt="Arise And Shine VT"
        width={120}
        height={120}
        className="mb-8 object-contain"
      />
      <h1
        className="text-4xl md:text-5xl font-bold text-center mb-4"
        style={{ color: "#d4af37" }}
      >
        404 — Detail Not Found
      </h1>
      <p className="text-zinc-400 text-center text-lg max-w-md mb-10">
        It looks like this page took a wrong turn. Let&apos;s get you back to the shine.
      </p>
      <Link
        href="/"
        className="inline-flex items-center justify-center px-8 py-4 rounded-xl font-semibold text-zinc-950 transition-all duration-300 hover:shadow-[0_0_20px_rgba(212,175,55,0.3)]"
        style={{
          backgroundColor: "#d4af37",
        }}
      >
        Back to Home
      </Link>
    </div>
  );
}
