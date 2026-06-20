import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Arise And Shine Detailing",
    short_name: "A&S VT",
    description: "Vermont's premier mobile auto, boat, and RV detailing service. We come to you.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#09090b",
    theme_color: "#D4AF37",
    icons: [
      { src: "/e.png",        sizes: "192x192", type: "image/png" },
      { src: "/aasbanner.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
