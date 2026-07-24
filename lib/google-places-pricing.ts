// Catálogo de SKUs y fields usado por el módulo. Los precios globales y free
// usage caps corresponden a la lista oficial de Google Maps Platform vigente
// al 20/07/2026 y se expresan en USD por 1.000 requests.

export const GOOGLE_DISCOVERY_SEARCH_FIELDS = ["places.id"] as const;

export const GOOGLE_DISCOVERY_DETAILS_FIELDS = [
  "id",
  "displayName",
  "formattedAddress",
  "location",
  "types",
  "primaryType",
  "businessStatus",
  "googleMapsUri",
] as const;

export const GOOGLE_ENRICHMENT_FIELDS = [
  "id",
  "rating",
  "userRatingCount",
] as const;

export type GooglePlacesEndpoint =
  | "TEXT_SEARCH"
  | "NEARBY_SEARCH"
  | "PLACE_DETAILS";

export type GooglePlacesTier =
  | "IDS_ONLY"
  | "ESSENTIALS"
  | "PRO"
  | "ENTERPRISE"
  | "ENTERPRISE_ATMOSPHERE";

export type GooglePlacesSkuKey =
  | "TEXT_SEARCH_IDS_ONLY"
  | "TEXT_SEARCH_PRO"
  | "TEXT_SEARCH_ENTERPRISE"
  | "TEXT_SEARCH_ENTERPRISE_ATMOSPHERE"
  | "NEARBY_SEARCH_PRO"
  | "NEARBY_SEARCH_ENTERPRISE"
  | "NEARBY_SEARCH_ENTERPRISE_ATMOSPHERE"
  | "PLACE_DETAILS_IDS_ONLY"
  | "PLACE_DETAILS_ESSENTIALS"
  | "PLACE_DETAILS_PRO"
  | "PLACE_DETAILS_ENTERPRISE"
  | "PLACE_DETAILS_ENTERPRISE_ATMOSPHERE";

export type GooglePlacesMonthlyUsage = Record<GooglePlacesSkuKey, number>;

type PriceBand = {
  upTo: number | null;
  usdPerThousand: number;
};

type SkuDefinition = {
  key: GooglePlacesSkuKey;
  label: string;
  endpoint: GooglePlacesEndpoint;
  tier: GooglePlacesTier;
  freeUsageCap: number | null;
  prices: PriceBand[];
};

const FREE_PRICES: PriceBand[] = [{ upTo: null, usdPerThousand: 0 }];
const PRO_SEARCH_PRICES: PriceBand[] = [
  { upTo: 100_000, usdPerThousand: 32 },
  { upTo: 500_000, usdPerThousand: 25.6 },
  { upTo: 1_000_000, usdPerThousand: 19.2 },
  { upTo: 5_000_000, usdPerThousand: 9.6 },
  { upTo: null, usdPerThousand: 2.4 },
];
const ENTERPRISE_SEARCH_PRICES: PriceBand[] = [
  { upTo: 100_000, usdPerThousand: 35 },
  { upTo: 500_000, usdPerThousand: 28 },
  { upTo: 1_000_000, usdPerThousand: 21 },
  { upTo: 5_000_000, usdPerThousand: 10.5 },
  { upTo: null, usdPerThousand: 2.63 },
];
const ATMOSPHERE_SEARCH_PRICES: PriceBand[] = [
  { upTo: 100_000, usdPerThousand: 40 },
  { upTo: 500_000, usdPerThousand: 32 },
  { upTo: 1_000_000, usdPerThousand: 24 },
  { upTo: 5_000_000, usdPerThousand: 12 },
  { upTo: null, usdPerThousand: 3.4 },
];
const DETAILS_ESSENTIALS_PRICES: PriceBand[] = [
  { upTo: 100_000, usdPerThousand: 5 },
  { upTo: 500_000, usdPerThousand: 4 },
  { upTo: 1_000_000, usdPerThousand: 3 },
  { upTo: 5_000_000, usdPerThousand: 1.5 },
  { upTo: null, usdPerThousand: 0.38 },
];
const DETAILS_PRO_PRICES: PriceBand[] = [
  { upTo: 100_000, usdPerThousand: 17 },
  { upTo: 500_000, usdPerThousand: 13.6 },
  { upTo: 1_000_000, usdPerThousand: 10.2 },
  { upTo: 5_000_000, usdPerThousand: 5.1 },
  { upTo: null, usdPerThousand: 1.28 },
];
const DETAILS_ENTERPRISE_PRICES: PriceBand[] = [
  { upTo: 100_000, usdPerThousand: 20 },
  { upTo: 500_000, usdPerThousand: 16 },
  { upTo: 1_000_000, usdPerThousand: 12 },
  { upTo: 5_000_000, usdPerThousand: 6 },
  { upTo: null, usdPerThousand: 1.51 },
];
const DETAILS_ATMOSPHERE_PRICES: PriceBand[] = [
  { upTo: 100_000, usdPerThousand: 25 },
  { upTo: 500_000, usdPerThousand: 20 },
  { upTo: 1_000_000, usdPerThousand: 15 },
  { upTo: 5_000_000, usdPerThousand: 7.5 },
  { upTo: null, usdPerThousand: 2.28 },
];

export const GOOGLE_PLACES_SKUS: Record<
  GooglePlacesSkuKey,
  SkuDefinition
> = {
  TEXT_SEARCH_IDS_ONLY: {
    key: "TEXT_SEARCH_IDS_ONLY",
    label: "Text Search Essentials (IDs Only)",
    endpoint: "TEXT_SEARCH",
    tier: "IDS_ONLY",
    freeUsageCap: null,
    prices: FREE_PRICES,
  },
  TEXT_SEARCH_PRO: {
    key: "TEXT_SEARCH_PRO",
    label: "Text Search Pro",
    endpoint: "TEXT_SEARCH",
    tier: "PRO",
    freeUsageCap: 5_000,
    prices: PRO_SEARCH_PRICES,
  },
  TEXT_SEARCH_ENTERPRISE: {
    key: "TEXT_SEARCH_ENTERPRISE",
    label: "Text Search Enterprise",
    endpoint: "TEXT_SEARCH",
    tier: "ENTERPRISE",
    freeUsageCap: 1_000,
    prices: ENTERPRISE_SEARCH_PRICES,
  },
  TEXT_SEARCH_ENTERPRISE_ATMOSPHERE: {
    key: "TEXT_SEARCH_ENTERPRISE_ATMOSPHERE",
    label: "Text Search Enterprise + Atmosphere",
    endpoint: "TEXT_SEARCH",
    tier: "ENTERPRISE_ATMOSPHERE",
    freeUsageCap: 1_000,
    prices: ATMOSPHERE_SEARCH_PRICES,
  },
  NEARBY_SEARCH_PRO: {
    key: "NEARBY_SEARCH_PRO",
    label: "Nearby Search Pro",
    endpoint: "NEARBY_SEARCH",
    tier: "PRO",
    freeUsageCap: 5_000,
    prices: PRO_SEARCH_PRICES,
  },
  NEARBY_SEARCH_ENTERPRISE: {
    key: "NEARBY_SEARCH_ENTERPRISE",
    label: "Nearby Search Enterprise",
    endpoint: "NEARBY_SEARCH",
    tier: "ENTERPRISE",
    freeUsageCap: 1_000,
    prices: ENTERPRISE_SEARCH_PRICES,
  },
  NEARBY_SEARCH_ENTERPRISE_ATMOSPHERE: {
    key: "NEARBY_SEARCH_ENTERPRISE_ATMOSPHERE",
    label: "Nearby Search Enterprise + Atmosphere",
    endpoint: "NEARBY_SEARCH",
    tier: "ENTERPRISE_ATMOSPHERE",
    freeUsageCap: 1_000,
    prices: ATMOSPHERE_SEARCH_PRICES,
  },
  PLACE_DETAILS_IDS_ONLY: {
    key: "PLACE_DETAILS_IDS_ONLY",
    label: "Place Details Essentials (IDs Only)",
    endpoint: "PLACE_DETAILS",
    tier: "IDS_ONLY",
    freeUsageCap: null,
    prices: FREE_PRICES,
  },
  PLACE_DETAILS_ESSENTIALS: {
    key: "PLACE_DETAILS_ESSENTIALS",
    label: "Place Details Essentials",
    endpoint: "PLACE_DETAILS",
    tier: "ESSENTIALS",
    freeUsageCap: 10_000,
    prices: DETAILS_ESSENTIALS_PRICES,
  },
  PLACE_DETAILS_PRO: {
    key: "PLACE_DETAILS_PRO",
    label: "Place Details Pro",
    endpoint: "PLACE_DETAILS",
    tier: "PRO",
    freeUsageCap: 5_000,
    prices: DETAILS_PRO_PRICES,
  },
  PLACE_DETAILS_ENTERPRISE: {
    key: "PLACE_DETAILS_ENTERPRISE",
    label: "Place Details Enterprise",
    endpoint: "PLACE_DETAILS",
    tier: "ENTERPRISE",
    freeUsageCap: 1_000,
    prices: DETAILS_ENTERPRISE_PRICES,
  },
  PLACE_DETAILS_ENTERPRISE_ATMOSPHERE: {
    key: "PLACE_DETAILS_ENTERPRISE_ATMOSPHERE",
    label: "Place Details Enterprise + Atmosphere",
    endpoint: "PLACE_DETAILS",
    tier: "ENTERPRISE_ATMOSPHERE",
    freeUsageCap: 1_000,
    prices: DETAILS_ATMOSPHERE_PRICES,
  },
};

export const DEFAULT_GOOGLE_PLACES_MONTHLY_USAGE: GooglePlacesMonthlyUsage = {
  TEXT_SEARCH_IDS_ONLY: 0,
  TEXT_SEARCH_PRO: 0,
  TEXT_SEARCH_ENTERPRISE: 0,
  TEXT_SEARCH_ENTERPRISE_ATMOSPHERE: 0,
  NEARBY_SEARCH_PRO: 0,
  NEARBY_SEARCH_ENTERPRISE: 0,
  NEARBY_SEARCH_ENTERPRISE_ATMOSPHERE: 0,
  PLACE_DETAILS_IDS_ONLY: 0,
  PLACE_DETAILS_ESSENTIALS: 0,
  PLACE_DETAILS_PRO: 0,
  PLACE_DETAILS_ENTERPRISE: 0,
  PLACE_DETAILS_ENTERPRISE_ATMOSPHERE: 0,
};

const TIER_RANK: Record<GooglePlacesTier, number> = {
  IDS_ONLY: 0,
  ESSENTIALS: 1,
  PRO: 2,
  ENTERPRISE: 3,
  ENTERPRISE_ATMOSPHERE: 4,
};

const FIELD_TIERS: Record<
  GooglePlacesEndpoint,
  Record<string, GooglePlacesTier>
> = {
  TEXT_SEARCH: {
    id: "IDS_ONLY",
    name: "IDS_ONLY",
    attributions: "IDS_ONLY",
    nextPageToken: "IDS_ONLY",
    displayName: "PRO",
    formattedAddress: "PRO",
    location: "PRO",
    types: "PRO",
    primaryType: "PRO",
    businessStatus: "PRO",
    googleMapsUri: "PRO",
    rating: "ENTERPRISE",
    userRatingCount: "ENTERPRISE",
    websiteUri: "ENTERPRISE",
    nationalPhoneNumber: "ENTERPRISE",
    internationalPhoneNumber: "ENTERPRISE",
    regularOpeningHours: "ENTERPRISE",
    currentOpeningHours: "ENTERPRISE",
    priceLevel: "ENTERPRISE",
    reviews: "ENTERPRISE_ATMOSPHERE",
  },
  NEARBY_SEARCH: {
    id: "PRO",
    name: "PRO",
    displayName: "PRO",
    formattedAddress: "PRO",
    location: "PRO",
    types: "PRO",
    primaryType: "PRO",
    businessStatus: "PRO",
    googleMapsUri: "PRO",
    rating: "ENTERPRISE",
    userRatingCount: "ENTERPRISE",
    websiteUri: "ENTERPRISE",
    nationalPhoneNumber: "ENTERPRISE",
    internationalPhoneNumber: "ENTERPRISE",
    regularOpeningHours: "ENTERPRISE",
    currentOpeningHours: "ENTERPRISE",
    priceLevel: "ENTERPRISE",
    reviews: "ENTERPRISE_ATMOSPHERE",
  },
  PLACE_DETAILS: {
    id: "IDS_ONLY",
    name: "IDS_ONLY",
    attributions: "IDS_ONLY",
    photos: "IDS_ONLY",
    formattedAddress: "ESSENTIALS",
    location: "ESSENTIALS",
    types: "ESSENTIALS",
    addressComponents: "ESSENTIALS",
    postalAddress: "ESSENTIALS",
    displayName: "PRO",
    primaryType: "PRO",
    businessStatus: "PRO",
    googleMapsUri: "PRO",
    rating: "ENTERPRISE",
    userRatingCount: "ENTERPRISE",
    websiteUri: "ENTERPRISE",
    nationalPhoneNumber: "ENTERPRISE",
    internationalPhoneNumber: "ENTERPRISE",
    regularOpeningHours: "ENTERPRISE",
    currentOpeningHours: "ENTERPRISE",
    priceLevel: "ENTERPRISE",
    reviews: "ENTERPRISE_ATMOSPHERE",
  },
};

function normalizedField(field: string): string {
  const withoutPlaces = field.startsWith("places.")
    ? field.slice("places.".length)
    : field;
  return withoutPlaces.split(".")[0];
}

function skuKeyForTier(
  endpoint: GooglePlacesEndpoint,
  tier: GooglePlacesTier
): GooglePlacesSkuKey {
  if (endpoint === "TEXT_SEARCH") {
    if (tier === "IDS_ONLY") return "TEXT_SEARCH_IDS_ONLY";
    if (tier === "ENTERPRISE") return "TEXT_SEARCH_ENTERPRISE";
    if (tier === "ENTERPRISE_ATMOSPHERE") {
      return "TEXT_SEARCH_ENTERPRISE_ATMOSPHERE";
    }
    return "TEXT_SEARCH_PRO";
  }
  if (endpoint === "NEARBY_SEARCH") {
    if (tier === "ENTERPRISE") return "NEARBY_SEARCH_ENTERPRISE";
    if (tier === "ENTERPRISE_ATMOSPHERE") {
      return "NEARBY_SEARCH_ENTERPRISE_ATMOSPHERE";
    }
    return "NEARBY_SEARCH_PRO";
  }
  if (tier === "IDS_ONLY") return "PLACE_DETAILS_IDS_ONLY";
  if (tier === "ESSENTIALS") return "PLACE_DETAILS_ESSENTIALS";
  if (tier === "PRO") return "PLACE_DETAILS_PRO";
  if (tier === "ENTERPRISE") return "PLACE_DETAILS_ENTERPRISE";
  return "PLACE_DETAILS_ENTERPRISE_ATMOSPHERE";
}

export function resolveGooglePlacesSku(
  endpoint: GooglePlacesEndpoint,
  fields: readonly string[]
): {
  sku: SkuDefinition;
  triggeringFields: string[];
  fieldsByTier: Partial<Record<GooglePlacesTier, string[]>>;
} {
  if (fields.length === 0) {
    throw new Error("Google Places requiere al menos un field en el field mask.");
  }
  const fieldsByTier: Partial<Record<GooglePlacesTier, string[]>> = {};
  let highestTier: GooglePlacesTier =
    endpoint === "NEARBY_SEARCH" ? "PRO" : "IDS_ONLY";
  for (const field of fields) {
    const name = normalizedField(field);
    const tier = FIELD_TIERS[endpoint][name];
    if (!tier) {
      throw new Error(
        `El field “${field}” no está catalogado para ${endpoint}.`
      );
    }
    fieldsByTier[tier] = [...(fieldsByTier[tier] ?? []), field];
    if (TIER_RANK[tier] > TIER_RANK[highestTier]) highestTier = tier;
  }
  const key = skuKeyForTier(endpoint, highestTier);
  return {
    sku: GOOGLE_PLACES_SKUS[key],
    triggeringFields: fieldsByTier[highestTier] ?? [],
    fieldsByTier,
  };
}

function costForUsage(
  usage: number,
  sku: SkuDefinition,
  applyFreeTier: boolean
): number {
  if (usage <= 0 || sku.prices.every((band) => band.usdPerThousand === 0)) {
    return 0;
  }
  const freeFloor =
    applyFreeTier && sku.freeUsageCap !== null ? sku.freeUsageCap : 0;
  let cost = 0;
  let bandStart = 0;
  for (const band of sku.prices) {
    const bandEnd = band.upTo ?? usage;
    const chargedStart = Math.max(bandStart, freeFloor);
    const chargedEnd = Math.min(usage, bandEnd);
    if (chargedEnd > chargedStart) {
      cost += ((chargedEnd - chargedStart) * band.usdPerThousand) / 1_000;
    }
    if (usage <= bandEnd) break;
    bandStart = bandEnd;
  }
  return Number(cost.toFixed(6));
}

export type GooglePlacesSkuEstimate = {
  endpoint: GooglePlacesEndpoint;
  skuKey: GooglePlacesSkuKey;
  skuLabel: string;
  tier: GooglePlacesTier;
  requests: number;
  estimatedBillableRequests: number;
  freeUsageCap: number | null;
  monthlyUsageAssumed: number;
  freeRequestsRemaining: number | null;
  maxCostBeforeFreeUsd: number;
  estimatedCostAfterFreeUsd: number;
  fieldMask: string[];
  triggeringFields: string[];
  fieldsByTier: Partial<Record<GooglePlacesTier, string[]>>;
  enterpriseWarning: boolean;
};

export function estimateGooglePlacesSku(input: {
  endpoint: GooglePlacesEndpoint;
  fields: readonly string[];
  requests: number;
  monthlyUsage?: Partial<GooglePlacesMonthlyUsage>;
}): GooglePlacesSkuEstimate {
  const resolved = resolveGooglePlacesSku(input.endpoint, input.fields);
  const requests = Math.max(0, Math.round(input.requests));
  const assumed = Math.max(
    0,
    Math.round(input.monthlyUsage?.[resolved.sku.key] ?? 0)
  );
  const freeRemaining =
    resolved.sku.freeUsageCap === null
      ? null
      : Math.max(0, resolved.sku.freeUsageCap - assumed);
  const billableRequests =
    freeRemaining === null ? 0 : Math.max(0, requests - freeRemaining);
  const costBefore = costForUsage(requests, resolved.sku, false);
  const costAfter = Number(
    (
      costForUsage(assumed + requests, resolved.sku, true) -
      costForUsage(assumed, resolved.sku, true)
    ).toFixed(6)
  );
  return {
    endpoint: input.endpoint,
    skuKey: resolved.sku.key,
    skuLabel: resolved.sku.label,
    tier: resolved.sku.tier,
    requests,
    estimatedBillableRequests: billableRequests,
    freeUsageCap: resolved.sku.freeUsageCap,
    monthlyUsageAssumed: assumed,
    freeRequestsRemaining: freeRemaining,
    maxCostBeforeFreeUsd: costBefore,
    estimatedCostAfterFreeUsd: Math.max(0, costAfter),
    fieldMask: [...input.fields],
    triggeringFields: resolved.triggeringFields,
    fieldsByTier: resolved.fieldsByTier,
    enterpriseWarning: TIER_RANK[resolved.sku.tier] >= TIER_RANK.ENTERPRISE,
  };
}

export type GoogleDiscoveryCostEstimate = {
  theoreticalRequests: number;
  cappedRequests: number;
  maximumUniquePlaces: number;
  skuEstimates: GooglePlacesSkuEstimate[];
  maxCostBeforeFreeUsd: number;
  estimatedCostAfterFreeUsd: number;
  enterpriseWarning: boolean;
};

export function estimateGoogleDiscoveryCost(input: {
  theoreticalRequests: number;
  cappedRequests: number;
  resultLimitPerRequest: number;
  monthlyUsage?: Partial<GooglePlacesMonthlyUsage>;
}): GoogleDiscoveryCostEstimate {
  const theoreticalRequests = Math.max(
    0,
    Math.round(input.theoreticalRequests)
  );
  const cappedRequests = Math.max(
    0,
    Math.min(theoreticalRequests, Math.round(input.cappedRequests))
  );
  const maximumUniquePlaces =
    cappedRequests *
    Math.max(1, Math.min(20, Math.round(input.resultLimitPerRequest)));
  const skuEstimates = [
    estimateGooglePlacesSku({
      endpoint: "TEXT_SEARCH",
      fields: GOOGLE_DISCOVERY_SEARCH_FIELDS,
      requests: cappedRequests,
      monthlyUsage: input.monthlyUsage,
    }),
    estimateGooglePlacesSku({
      endpoint: "PLACE_DETAILS",
      fields: GOOGLE_DISCOVERY_DETAILS_FIELDS,
      requests: maximumUniquePlaces,
      monthlyUsage: input.monthlyUsage,
    }),
  ];
  return {
    theoreticalRequests,
    cappedRequests,
    maximumUniquePlaces,
    skuEstimates,
    maxCostBeforeFreeUsd: Number(
      skuEstimates
        .reduce((sum, row) => sum + row.maxCostBeforeFreeUsd, 0)
        .toFixed(6)
    ),
    estimatedCostAfterFreeUsd: Number(
      skuEstimates
        .reduce((sum, row) => sum + row.estimatedCostAfterFreeUsd, 0)
        .toFixed(6)
    ),
    enterpriseWarning: skuEstimates.some((row) => row.enterpriseWarning),
  };
}

export function estimateGoogleEnrichmentCost(
  uniquePlaces: number,
  monthlyUsage?: Partial<GooglePlacesMonthlyUsage>
): GooglePlacesSkuEstimate {
  return estimateGooglePlacesSku({
    endpoint: "PLACE_DETAILS",
    fields: GOOGLE_ENRICHMENT_FIELDS,
    requests: Math.max(0, Math.round(uniquePlaces)),
    monthlyUsage,
  });
}
