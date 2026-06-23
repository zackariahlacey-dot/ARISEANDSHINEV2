/**
 * Service-page JSON-LD generators.
 * Each returns a schema.org Service object with offer pricing and area-served,
 * to be injected on the corresponding service landing page.
 */

const BUSINESS = {
  name: "Arise And Shine Detailing",
  url: "https://www.ariseandshinedetailing.com",
  telephone: "+18025855563",
  image: "https://www.ariseandshinedetailing.com/aasbanner.png",
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
    "Professional mobile car detailing in Vermont — Interior, Exterior, and Basic Interior + Exterior packages. We come to your home, office, or driveway anywhere in Chittenden County and beyond.",
  url: "https://www.ariseandshinedetailing.com/detailing",
  lowPrice: 130,
  highPrice: 400,
  serviceType: "Auto Detailing",
});

export const BOAT_DETAILING_SCHEMA = buildServiceSchema({
  name: "Mobile Boat Detailing",
  description:
    "Per-foot marine detailing in Vermont — interior, exterior, and full boat detailing using lake-safe products. Dockside on Lake Champlain, Mallets Bay, Shelburne Bay, and statewide. We come to your slip, marina, or driveway.",
  url: "https://www.ariseandshinedetailing.com/boat-detailing",
  lowPrice: 15,
  highPrice: 28,
  unitCode: "FOT",
  serviceType: "Boat Detailing",
});

export const RV_DETAILING_SCHEMA = buildServiceSchema({
  name: "Mobile RV Detailing",
  description:
    "Per-foot RV and motorhome detailing in Vermont — full exterior wash & seal, full interior reset, and complete inside-and-out detailing. We come to your campsite, dealer lot, or driveway statewide.",
  url: "https://www.ariseandshinedetailing.com/rv-detailing",
  lowPrice: 15,
  highPrice: 38,
  unitCode: "FOT",
  serviceType: "RV Detailing",
});

export const TRUCK_DETAILING_SCHEMA = buildServiceSchema({
  name: "Mobile Semi Truck Detailing",
  description:
    "Mobile semi truck detailing for Vermont — day cab and sleeper service. Yard washes, exterior detail, interior reset, complete packages. Owner-operator and fleet pricing. Free travel within Chittenden County.",
  url: "https://www.ariseandshinedetailing.com/truck-detailing",
  lowPrice: 99,
  highPrice: 649,
  serviceType: "Semi Truck Detailing",
});

export const HEAVY_EQUIPMENT_DETAILING_SCHEMA = buildServiceSchema({
  name: "Heavy Equipment Cab Detailing",
  description:
    "Mobile heavy equipment cab interior detailing in Vermont — excavators, dozers, loaders, skid steers, tractors, log trucks, dump trucks. On-site at your yard or job. Flat rate from $175 or $95/hr.",
  url: "https://www.ariseandshinedetailing.com/heavy-equipment-detailing",
  lowPrice: 95,
  highPrice: 1000,
  serviceType: "Heavy Equipment Detailing",
});
