import { describe, expect, it } from "vitest";
import {
  estimateGoogleDiscoveryCost,
  estimateGoogleEnrichmentCost,
  GOOGLE_DISCOVERY_DETAILS_FIELDS,
  GOOGLE_DISCOVERY_SEARCH_FIELDS,
  resolveGooglePlacesSku,
} from "@/lib/google-places-pricing";

const FORBIDDEN_DISCOVERY_FIELDS = [
  "rating",
  "userRatingCount",
  "reviews",
  "regularOpeningHours",
  "currentOpeningHours",
  "nationalPhoneNumber",
  "internationalPhoneNumber",
  "websiteUri",
  "priceLevel",
];

describe("pricing de Google Places", () => {
  it("mantiene el search de discovery en Essentials IDs Only", () => {
    const resolved = resolveGooglePlacesSku(
      "TEXT_SEARCH",
      GOOGLE_DISCOVERY_SEARCH_FIELDS
    );
    expect(resolved.sku.key).toBe("TEXT_SEARCH_IDS_ONLY");
    expect(resolved.sku.tier).toBe("IDS_ONLY");
  });

  it("mantiene los detalles de discovery en Pro, sin Enterprise", () => {
    const resolved = resolveGooglePlacesSku(
      "PLACE_DETAILS",
      GOOGLE_DISCOVERY_DETAILS_FIELDS
    );
    expect(resolved.sku.key).toBe("PLACE_DETAILS_PRO");
    expect(resolved.sku.tier).toBe("PRO");
    expect(GOOGLE_DISCOVERY_DETAILS_FIELDS).not.toEqual(
      expect.arrayContaining(FORBIDDEN_DISCOVERY_FIELDS)
    );
  });

  it("deriva requests, free tier y costo desde cada SKU", () => {
    const estimate = estimateGoogleDiscoveryCost({
      theoreticalRequests: 150,
      cappedRequests: 120,
      resultLimitPerRequest: 20,
      monthlyUsage: {
        PLACE_DETAILS_PRO: 4_900,
      },
    });
    expect(estimate.theoreticalRequests).toBe(150);
    expect(estimate.cappedRequests).toBe(120);
    expect(estimate.maximumUniquePlaces).toBe(2_400);
    expect(estimate.enterpriseWarning).toBe(false);
    expect(estimate.skuEstimates[0]).toMatchObject({
      skuKey: "TEXT_SEARCH_IDS_ONLY",
      requests: 120,
      estimatedBillableRequests: 0,
    });
    expect(estimate.skuEstimates[1]).toMatchObject({
      skuKey: "PLACE_DETAILS_PRO",
      requests: 2_400,
      estimatedBillableRequests: 2_300,
      freeRequestsRemaining: 100,
    });
    expect(estimate.maxCostBeforeFreeUsd).toBe(40.8);
    expect(estimate.estimatedCostAfterFreeUsd).toBe(39.1);
  });

  it("marca el enrichment de ratings como Enterprise", () => {
    const estimate = estimateGoogleEnrichmentCost(8, {
      PLACE_DETAILS_ENTERPRISE: 1_000,
    });
    expect(estimate.skuKey).toBe("PLACE_DETAILS_ENTERPRISE");
    expect(estimate.enterpriseWarning).toBe(true);
    expect(estimate.triggeringFields).toEqual(["rating", "userRatingCount"]);
    expect(estimate.maxCostBeforeFreeUsd).toBe(0.16);
    expect(estimate.estimatedCostAfterFreeUsd).toBe(0.16);
  });
});
