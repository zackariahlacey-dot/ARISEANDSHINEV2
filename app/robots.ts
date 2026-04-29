import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/protected",
          "/admin",
          "/auth",
          "/api",
          "/dashboard",
          "/my-detail",
          "/onboard",
          "/schedule",
        ],
      },
    ],
    sitemap: "https://www.ariseandshinevt.com/sitemap.xml",
  };
}
