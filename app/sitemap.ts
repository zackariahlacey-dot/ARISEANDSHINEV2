import type { MetadataRoute } from "next";
import { getTownSlugs } from "@/lib/townContent";
import { getGuideSlugs } from "@/lib/guideContent";

const BASE = "https://www.ariseandshinevt.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const townRoutes: MetadataRoute.Sitemap = getTownSlugs().map((slug) => ({
    url: `${BASE}/service-area/${slug}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  const guideRoutes: MetadataRoute.Sitemap = getGuideSlugs().map((slug) => ({
    url: `${BASE}/guides/${slug}`,
    lastModified: now,
    changeFrequency: "yearly",
    priority: 0.6,
  }));

  return [
    { url: BASE,                          lastModified: now, changeFrequency: "weekly",  priority: 1.0 },
    { url: `${BASE}/detailing`,           lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${BASE}/boat-detailing`,      lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${BASE}/rv-detailing`,        lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${BASE}/paint-correction`,    lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE}/service-area`,        lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE}/guides`,              lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE}/faq`,                 lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE}/about`,               lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE}/contact`,             lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE}/gift-cards`,          lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE}/services`,            lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    ...townRoutes,
    ...guideRoutes,
  ];
}
