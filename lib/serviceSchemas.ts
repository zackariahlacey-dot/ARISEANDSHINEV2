/**
 * Service-page JSON-LD generators.
 * Each returns a schema.org Service object with offer pricing and area-served,
 * to be injected on the corresponding service landing page.
 */

const BUSINESS = {
  name: "Arise & Shine VT",
  url: "https://www.ariseandshinevt.com",
  telephone: "+18025855563",
  image: "https://www.ariseandshinevt.com/aasbanner.png",
};

const AREA_SERVED = [
  { "@type": "City", name: "Burlington, VT" },
  { "@type": "City", name: "Williston, VT" },
  { "@type": "City", name: "South Burlington, VT" },
  { "@type": "City", name: "Shelburne, VT" },
  { "@type": "City", name: "Essex, VT" },
  { "@type": "City", name: "Essex Junction, VT" },
  { "@type": "City", name: "Colchester, VT" },
  { "@type": "City", name: "Winooski, VT" },
  { "@type": "City", name: "Milton, VT" },
  { "@type": "City", name: "Hinesburg, VT" },
  { "@type": "State", name: "Vermont" },
];

type ServiceArgs = {
  name: string;
  description: string;
  url: string;
  /** Lowest-priced offer in USD (used as offer price). */
  lowPrice: number;
  /** Optional upper bound for AggregateOffer. */
  highPrice?: number;
  /** Optional pricing unit ("UNIT" default, "FOT" for per-foot boat/RV pricing). */
  unitCode?: "UNIT" | "FOT";
  serviceType?: string;
};

export function buildServiceSchema({
  name,
  description,
  url,
  lowPrice,
  highPrice,
  unitCode = "UNIT",
  serviceType,
}: ServiceArgs) {
  const offerBase = {
    "@type": "Offer",
    priceCurrency: "USD",
    availability: "https://schema.org/InStock",
    url,
    seller: { "@type": "LocalBusiness", name: BUSINESS.name },
    ...(unitCode === "FOT" ? { priceSpecification: { "@type": "UnitPriceSpecification", priceCurrency: "USD", unitCode: "FOT", unitText: "per linear foot" } } : {}),
  };

  const offer =
    highPrice && highPrice > lowPrice
      ? {
          "@type": "AggregateOffer",
          priceCurrency: "USD",
          lowPrice,
          highPrice,
          offerCount: 4,
          availability: "https://schema.org/InStock",
          url,
        }
      : { ...offerBase, price: lowPrice };

  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name,
    description,
    serviceType: serviceType ?? name,
    provider: {
      "@type": "LocalBusiness",
      name: BUSINESS.name,
      url: BUSINESS.url,
      telephone: BUSINESS.telephone,
      image: BUSINESS.image,
    },
    areaServed: AREA_SERVED,
    url,
    offers: offer,
  };
}

export const AUTO_DETAILING_SCHEMA = buildServiceSchema({
  name: "Mobile Auto Detailing",
  description:
    "Professional mobile car detailing in Vermont — Interior, Exterior, and Full Detail packages. We come to your home, office, or driveway anywhere in Chittenden County and beyond.",
  url: "https://www.ariseandshinevt.com/detailing",
  lowPrice: 130,
  highPrice: 400,
  serviceType: "Auto Detailing",
});

export const BOAT_DETAILING_SCHEMA = buildServiceSchema({
  name: "Mobile Boat Detailing",
  description:
    "Per-foot marine detailing in Vermont — interior, exterior, and full boat detailing using lake-safe products. We come to your marina, launch site, or storage facility.",
  url: "https://www.ariseandshinevt.com/boat-detailing",
  lowPrice: 15,
  highPrice: 55,
  unitCode: "FOT",
  serviceType: "Boat Detailing",
});

export const RV_DETAILING_SCHEMA = buildServiceSchema({
  name: "Mobile RV Detailing",
  description:
    "Per-foot RV and motorhome detailing in Vermont — exterior refresh, living space reset, oxidation restoration, and full transformation. We come to your campsite, driveway, or storage lot.",
  url: "https://www.ariseandshinevt.com/rv-detailing",
  lowPrice: 18,
  highPrice: 55,
  unitCode: "FOT",
  serviceType: "RV Detailing",
});

export const PAINT_CORRECTION_SCHEMA = buildServiceSchema({
  name: "Paint Correction",
  description:
    "Multi-stage machine paint correction in Vermont — swirl mark removal, light scratch reduction, oxidation removal, and gloss restoration. Mobile service statewide.",
  url: "https://www.ariseandshinevt.com/paint-correction",
  lowPrice: 250,
  highPrice: 900,
  serviceType: "Paint Correction",
});
