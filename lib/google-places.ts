import type {
  ProspectDiscoveryProvider,
  ProspectProviderDetailsResponse,
  ProspectProviderIdResponse,
  ProspectProviderPlace,
  ProspectProviderRequest,
} from "@/lib/prospect-providers";
import {
  GOOGLE_DISCOVERY_DETAILS_FIELDS,
  GOOGLE_DISCOVERY_SEARCH_FIELDS,
  GOOGLE_ENRICHMENT_FIELDS,
} from "@/lib/google-places-pricing";

const GOOGLE_TEXT_URL =
  "https://places.googleapis.com/v1/places:searchText";
const GOOGLE_DETAILS_URL = "https://places.googleapis.com/v1/places";
const RETRYABLE_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504]);

type GooglePlace = {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  location?: { latitude?: number; longitude?: number };
  primaryType?: string;
  types?: string[];
  businessStatus?: string;
  googleMapsUri?: string;
  rating?: number;
  userRatingCount?: number;
};

type GoogleSearchResponse = {
  places?: { id?: string }[];
};

export class GooglePlacesError extends Error {
  constructor(
    message: string,
    readonly status: number | null,
    readonly retryable: boolean
  ) {
    super(message);
  }
}

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function fetchWithRetry(
  url: string,
  init: RequestInit,
  attempts = 3
): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12_000);
    try {
      const response = await fetch(url, { ...init, signal: controller.signal });
      if (response.ok) return response;
      const text = (await response.text()).slice(0, 500);
      const retryable = RETRYABLE_STATUSES.has(response.status);
      if (!retryable || attempt === attempts) {
        throw new GooglePlacesError(
          `Google Places HTTP ${response.status}: ${text || "sin detalle"}`,
          response.status,
          retryable
        );
      }
      lastError = new GooglePlacesError(
        `Google Places HTTP ${response.status}`,
        response.status,
        true
      );
    } catch (error) {
      if (error instanceof GooglePlacesError && !error.retryable) throw error;
      lastError = error;
      if (attempt === attempts) {
        if (error instanceof GooglePlacesError) throw error;
        throw new GooglePlacesError(
          error instanceof Error && error.name === "AbortError"
            ? "Google Places agotó el tiempo de espera."
            : "No se pudo conectar con Google Places.",
          null,
          true
        );
      }
    } finally {
      clearTimeout(timeout);
    }
    await wait(350 * 2 ** (attempt - 1));
  }
  throw lastError;
}

function mapGooglePlace(place: GooglePlace): ProspectProviderPlace | null {
  const name = place.displayName?.text?.trim() ?? "";
  const address = place.formattedAddress?.trim() ?? "";
  const latitude = Number(place.location?.latitude);
  const longitude = Number(place.location?.longitude);
  if (
    !name ||
    !address ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude)
  ) {
    return null;
  }
  return {
    externalId: place.id ?? null,
    name,
    address,
    neighborhood: null,
    locality: null,
    province: null,
    country: "Argentina",
    latitude,
    longitude,
    mapsUrl: place.googleMapsUri ?? null,
    listingUrl: place.googleMapsUri ?? null,
    primaryType: place.primaryType ?? null,
    types: Array.isArray(place.types) ? place.types : [],
    rating: typeof place.rating === "number" ? place.rating : null,
    reviewCount:
      typeof place.userRatingCount === "number" ? place.userRatingCount : null,
    operatingStatus: place.businessStatus ?? null,
    permanentlyClosed: place.businessStatus === "CLOSED_PERMANENTLY",
    pureServiceAreaBusiness: false,
    rawData: {
      id: place.id ?? null,
      primaryType: place.primaryType ?? null,
      types: place.types ?? [],
      businessStatus: place.businessStatus ?? null,
    },
  };
}

export class GooglePlacesProvider implements ProspectDiscoveryProvider {
  readonly key = "GOOGLE";

  async searchIds(
    request: ProspectProviderRequest
  ): Promise<ProspectProviderIdResponse> {
    const apiKey = googlePlacesApiKey();
    if (!["TYPE", "TEXT"].includes(request.query.mode)) {
      throw new GooglePlacesError(
        `Modo de consulta Google inválido: ${request.query.mode}.`,
        null,
        false
      );
    }

    const locationCircle = {
      center: request.center,
      radius: request.radiusMeters,
    };
    const singleType =
      request.query.mode === "TYPE" && request.query.placeTypes.length === 1
        ? request.query.placeTypes[0]
        : null;
    const body = {
      textQuery: request.query.value,
      pageSize: Math.min(20, Math.max(1, request.resultLimit)),
      languageCode: "es",
      regionCode: "AR",
      includePureServiceAreaBusinesses: false,
      locationBias: { circle: locationCircle },
      ...(singleType
        ? { includedType: singleType, strictTypeFiltering: true }
        : {}),
    };

    const response = await fetchWithRetry(
      GOOGLE_TEXT_URL,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask": GOOGLE_DISCOVERY_SEARCH_FIELDS.join(","),
        },
        body: JSON.stringify(body),
        cache: "no-store",
      }
    );
    const data = (await response.json()) as GoogleSearchResponse;
    const externalIds = [
      ...new Set(
        (data.places ?? []).flatMap((place) =>
          typeof place.id === "string" && place.id.trim() ? [place.id] : []
        )
      ),
    ];
    return { externalIds, requestCount: 1 };
  }

  async fetchDetails(
    externalIds: string[]
  ): Promise<ProspectProviderDetailsResponse> {
    const apiKey = googlePlacesApiKey();
    const uniqueIds = [...new Set(externalIds.filter(Boolean))].slice(0, 20);
    const settled = await Promise.allSettled(
      uniqueIds.map(async (externalId) => {
        const response = await fetchWithRetry(
          `${GOOGLE_DETAILS_URL}/${encodeURIComponent(externalId)}`,
          {
            method: "GET",
            headers: {
              "X-Goog-Api-Key": apiKey,
              "X-Goog-FieldMask": GOOGLE_DISCOVERY_DETAILS_FIELDS.join(","),
            },
            cache: "no-store",
          }
        );
        return {
          externalId,
          place: mapGooglePlace((await response.json()) as GooglePlace),
        };
      })
    );
    const places: ProspectProviderPlace[] = [];
    const failures: { externalId: string; message: string }[] = [];
    settled.forEach((result, index) => {
      if (result.status === "fulfilled" && result.value.place) {
        places.push(result.value.place);
        return;
      }
      failures.push({
        externalId: uniqueIds[index],
        message:
          result.status === "rejected"
            ? result.reason instanceof Error
              ? result.reason.message
              : "Falló Place Details."
            : "Place Details no devolvió los campos mínimos.",
      });
    });
    return { places, failures, requestCount: uniqueIds.length };
  }
}

function googlePlacesApiKey(): string {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY?.trim();
  if (!apiKey) {
    throw new GooglePlacesError(
      "Falta GOOGLE_PLACES_API_KEY en el servidor.",
      null,
      false
    );
  }
  return apiKey;
}

export async function fetchGooglePlaceActivity(externalId: string): Promise<{
  rating: number | null;
  reviewCount: number | null;
}> {
  const apiKey = googlePlacesApiKey();
  const response = await fetchWithRetry(
    `${GOOGLE_DETAILS_URL}/${encodeURIComponent(externalId)}`,
    {
      method: "GET",
      headers: {
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": GOOGLE_ENRICHMENT_FIELDS.join(","),
      },
      cache: "no-store",
    },
    2
  );
  const place = (await response.json()) as GooglePlace;
  return {
    rating: typeof place.rating === "number" ? place.rating : null,
    reviewCount:
      typeof place.userRatingCount === "number"
        ? place.userRatingCount
        : null,
  };
}
