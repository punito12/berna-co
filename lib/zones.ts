// Delivery zones: localities + weekdays, plus geocoding of an address into a
// locality and matching it to a zone. All locality matching is done on a
// normalized (lowercased, accent-stripped) form so "Martínez" == "martinez".

import { prisma } from "@/lib/db";

export type ZoneForUI = {
  id: string;
  name: string;
  localities: string[];
  daysOfWeek: number[];
  active: boolean;
};

// Normalizes a locality/string for matching: lowercase, no accents, trimmed.
export function normalizeLocality(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip accents
    .toLowerCase()
    .trim();
}

function parseArray<T>(raw: string): T[] {
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? (v as T[]) : [];
  } catch {
    return [];
  }
}

function toZoneForUI(z: {
  id: string;
  name: string;
  localities: string;
  daysOfWeek: string;
  active: boolean;
}): ZoneForUI {
  return {
    id: z.id,
    name: z.name,
    localities: parseArray<string>(z.localities),
    daysOfWeek: parseArray<number>(z.daysOfWeek),
    active: z.active,
  };
}

export async function listZones(): Promise<ZoneForUI[]> {
  const rows = await prisma.zone.findMany({ orderBy: { name: "asc" } });
  return rows.map(toZoneForUI);
}

// Finds the active zone that lists the given locality (normalized match).
export async function findZoneByLocality(
  locality: string
): Promise<ZoneForUI | null> {
  const target = normalizeLocality(locality);
  if (!target) return null;
  const zones = await listZones();
  for (const zone of zones) {
    if (!zone.active) continue;
    if (zone.localities.some((l) => normalizeLocality(l) === target)) {
      return zone;
    }
  }
  return null;
}

// Whether automatic geocoding is configured.
export function isGeocodingConfigured(): boolean {
  return Boolean(process.env.GOOGLE_MAPS_API_KEY);
}

export type GeocodeResult = {
  locality: string | null; // detected locality, or null if not found
  formattedAddress: string | null;
};

// Calls Google Geocoding API to resolve an address into a locality. Returns
// { locality: null } when the key is missing or nothing usable is found.
// We read the locality from address components, preferring "locality" and
// falling back to administrative_area_level_2 (partido) when needed.
export async function geocodeLocality(
  address: string
): Promise<GeocodeResult> {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) return { locality: null, formattedAddress: null };

  const url =
    "https://maps.googleapis.com/maps/api/geocode/json" +
    `?address=${encodeURIComponent(address)}` +
    "&region=ar&language=es" +
    `&key=${key}`;

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Geocoding HTTP ${res.status}`);
  const data = (await res.json()) as {
    status: string;
    results: {
      formatted_address: string;
      address_components: {
        long_name: string;
        types: string[];
      }[];
    }[];
  };

  if (data.status !== "OK" || data.results.length === 0) {
    return { locality: null, formattedAddress: null };
  }

  const result = data.results[0];
  const components = result.address_components;
  const byType = (type: string) =>
    components.find((c) => c.types.includes(type))?.long_name ?? null;

  // Preference order for what counts as the "locality" in AR addresses.
  const locality =
    byType("locality") ??
    byType("administrative_area_level_2") ??
    byType("sublocality") ??
    null;

  return { locality, formattedAddress: result.formatted_address };
}
