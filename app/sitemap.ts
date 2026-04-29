import type { MetadataRoute } from "next";

const BASE = "https://www.ariseandshinevt.com";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: BASE,                          lastModified: new Date(), changeFrequency: "weekly",  priority: 1.0 },
    { url: `${BASE}/detailing`,           lastModified: new Date(), changeFrequency: "monthly", priority: 0.9 },
    { url: `${BASE}/boat-detailing`,      lastModified: new Date(), changeFrequency: "monthly", priority: 0.9 },
    { url: `${BASE}/rv-detailing`,        lastModified: new Date(), changeFrequency: "monthly", priority: 0.9 },
    { url: `${BASE}/paint-correction`,    lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE}/maintenance-club`,    lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE}/service-area`,        lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE}/faq`,                 lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE}/about`,               lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE}/contact`,             lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE}/gift-cards`,          lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE}/services`,            lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
  ];
}
