import { ImageResponse } from "next/og";

export const alt = "Arise And Shine VT — Premium mobile auto detailing in Vermont";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const dynamic = "force-dynamic";

const baseUrl =
  process.env.NEXT_PUBLIC_APP_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
const carImageUrl = `${baseUrl}/og-image.png`;

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "black",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {/* Full-bleed clean car photo from public/og-image.png */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={carImageUrl}
          alt=""
          width={1200}
          height={630}
          style={{
            position: "absolute",
            inset: 0,
            objectFit: "cover",
            width: "100%",
            height: "100%",
          }}
        />
        {/* Dark overlay so text is readable */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(180deg, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.85) 100%)",
          }}
        />
        {/* Brand block */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 12,
            zIndex: 1,
          }}
        >
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 12,
              background: "white",
              color: "black",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 24,
              fontWeight: 900,
              letterSpacing: "-0.05em",
            }}
          >
            A&S
          </div>
          <div
            style={{
              fontSize: 48,
              fontWeight: 800,
              color: "white",
              letterSpacing: "-0.02em",
              textAlign: "center",
            }}
          >
            Arise And Shine VT
          </div>
          <div
            style={{
              fontSize: 22,
              color: "rgba(255,255,255,0.7)",
              fontWeight: 500,
              textAlign: "center",
            }}
          >
            Premium Mobile Auto Detailing in Vermont
          </div>
          <div
            style={{
              fontSize: 18,
              color: "rgba(255,255,255,0.5)",
              marginTop: 8,
            }}
          >
            Williston · Burlington · All of Vermont
          </div>
        </div>
        {/* Decorative line under tagline */}
        <div
          style={{
            position: "absolute",
            bottom: 80,
            left: "50%",
            transform: "translateX(-50%)",
            width: 120,
            height: 3,
            background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)",
            borderRadius: 2,
          }}
        />
      </div>
    ),
    { ...size }
  );
}
