import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "We no longer offer our services",
  description: "Arise And Shine Detailing is no longer offering services.",
  robots: { index: false, follow: false },
};

export default function ClosedPage() {
  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px 20px",
        background: "#050505",
        color: "#ffffff",
        fontFamily:
          "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: 520,
          width: "100%",
          textAlign: "center",
          background: "#0f0f10",
          border: "1px solid #1f1f22",
          borderRadius: 16,
          padding: "48px 32px",
        }}
      >
        <p
          style={{
            color: "#D4AF37",
            fontSize: 12,
            fontWeight: 900,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            margin: "0 0 20px",
          }}
        >
          Arise And Shine
        </p>
        <h1
          style={{
            color: "#ffffff",
            fontSize: 28,
            fontWeight: 900,
            lineHeight: 1.25,
            letterSpacing: "-0.01em",
            margin: "0 0 16px",
          }}
        >
          We no longer offer our services.
        </h1>
        <p
          style={{
            color: "#a1a1aa",
            fontSize: 15,
            lineHeight: 1.7,
            margin: 0,
          }}
        >
          Thank you to every customer who trusted us over the years. We are
          no longer accepting new bookings or performing detailing work.
        </p>
      </div>
    </main>
  );
}
