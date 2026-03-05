import { UpdatePasswordForm } from "@/components/update-password-form";

export default function Page() {
  return (
    <div className="relative flex min-h-svh w-full items-center justify-center bg-zinc-950 px-4 py-12 overflow-hidden">
      {/* Champagne gold radial glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 40%, rgba(212,175,55,0.07) 0%, transparent 70%)",
        }}
      />
      <div className="w-full max-w-sm relative z-10">
        <UpdatePasswordForm />
      </div>
    </div>
  );
}
