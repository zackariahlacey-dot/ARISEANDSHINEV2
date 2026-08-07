import type { MetadataRoute } from "next";

const BASE = "https://www.ariseandshinedetailing.com";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: BASE, lastModified: new Date(), changeFrequency: "yearly", priority: 1.0 },
  ];
}
