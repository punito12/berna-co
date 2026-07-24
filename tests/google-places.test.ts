import { afterEach, describe, expect, it, vi } from "vitest";
import {
  fetchGooglePlaceActivity,
  GooglePlacesProvider,
} from "@/lib/google-places";
import {
  GOOGLE_DISCOVERY_DETAILS_FIELDS,
  GOOGLE_DISCOVERY_SEARCH_FIELDS,
  GOOGLE_ENRICHMENT_FIELDS,
} from "@/lib/google-places-pricing";

const originalFetch = globalThis.fetch;
const originalKey = process.env.GOOGLE_PLACES_API_KEY;

afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalKey === undefined) {
    delete process.env.GOOGLE_PLACES_API_KEY;
  } else {
    process.env.GOOGLE_PLACES_API_KEY = originalKey;
  }
  vi.restoreAllMocks();
});

function jsonResponse(value: unknown): Response {
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

function detailsResponse() {
  return jsonResponse({
    id: "place-1",
    displayName: { text: "Mercado Gourmet del Lago" },
    formattedAddress: "Av. de los Lagos 100, Nordelta",
    location: { latitude: -34.416, longitude: -58.651 },
    primaryType: "grocery_store",
    types: ["grocery_store", "food_store"],
    businessStatus: "OPERATIONAL",
    googleMapsUri: "https://maps.google.com/?cid=1",
  });
}

function providerRequest() {
  return {
    center: { latitude: -34.416, longitude: -58.651 },
    radiusMeters: 450,
    resultLimit: 20,
    query: {
      id: "types",
      provider: "GOOGLE",
      mode: "TYPE",
      value: "comercios de alimentos",
      placeTypes: ["grocery_store", "supermarket"],
    },
  };
}

describe("Google Places provider", () => {
  it("descubre solo IDs con Text Search, incluso para consultas TYPE", async () => {
    process.env.GOOGLE_PLACES_API_KEY = "test-key";
    const fetchMock = vi.fn(async () =>
      jsonResponse({
        places: [{ id: "place-1" }, { id: "place-1" }, { id: "place-2" }],
      })
    );
    globalThis.fetch = fetchMock as typeof fetch;
    const provider = new GooglePlacesProvider();

    const result = await provider.searchIds(providerRequest());

    expect(result.externalIds).toEqual(["place-1", "place-2"]);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    const headers = init.headers as Record<string, string>;
    expect(url).toContain("places:searchText");
    expect(headers["X-Goog-FieldMask"]).toBe(
      GOOGLE_DISCOVERY_SEARCH_FIELDS.join(",")
    );
    expect(headers["X-Goog-FieldMask"]).toBe("places.id");
  });

  it("pide detalles mínimos Pro después de recibir IDs", async () => {
    process.env.GOOGLE_PLACES_API_KEY = "test-key";
    const fetchMock = vi.fn(async () => detailsResponse());
    globalThis.fetch = fetchMock as typeof fetch;
    const provider = new GooglePlacesProvider();

    const result = await provider.fetchDetails(["place-1", "place-1"]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.failures).toEqual([]);
    expect(result.places[0]).toMatchObject({
      externalId: "place-1",
      name: "Mercado Gourmet del Lago",
      operatingStatus: "OPERATIONAL",
      rating: null,
      reviewCount: null,
    });
    const [, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    const headers = init.headers as Record<string, string>;
    expect(headers["X-Goog-FieldMask"]).toBe(
      GOOGLE_DISCOVERY_DETAILS_FIELDS.join(",")
    );
    expect(headers["X-Goog-FieldMask"]).not.toMatch(
      /rating|review|opening|phone|website|priceLevel/i
    );
  });

  it("reintenta respuestas transitorias con el mismo request lógico", async () => {
    process.env.GOOGLE_PLACES_API_KEY = "test-key";
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("quota momentánea", { status: 429 }))
      .mockResolvedValueOnce(jsonResponse({ places: [{ id: "place-1" }] }));
    globalThis.fetch = fetchMock as typeof fetch;
    const provider = new GooglePlacesProvider();

    const result = await provider.searchIds(providerRequest());

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.requestCount).toBe(1);
  });

  it("reserva rating y userRatingCount para enrichment explícito", async () => {
    process.env.GOOGLE_PLACES_API_KEY = "test-key";
    const fetchMock = vi.fn(async () =>
      jsonResponse({ id: "place-1", rating: 4.7, userRatingCount: 81 })
    );
    globalThis.fetch = fetchMock as typeof fetch;

    const result = await fetchGooglePlaceActivity("place-1");

    expect(result).toEqual({ rating: 4.7, reviewCount: 81 });
    const [, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    const headers = init.headers as Record<string, string>;
    expect(headers["X-Goog-FieldMask"]).toBe(
      GOOGLE_ENRICHMENT_FIELDS.join(",")
    );
  });
});
