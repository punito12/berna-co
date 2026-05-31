// Delivery zones: localities + weekdays, plus geocoding of an address into a
// locality and matching it to a zone. All locality matching is done on a
// normalized (lowercased, accent-stripped) form so "Martínez" == "martinez".

import { prisma } from "@/lib/db";

export type ZoneForUI = {
  id: string;
  name: string;
  postalCodes: string[];
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

// Extracts the 4-digit postal code from either format the customer might type:
//   "1642"      -> "1642"
//   "B1642DHG"  -> "1642"  (CPA: letter + 4 digits + 3 letters)
//   "C1002"     -> "1002"
// Returns null when no 4-digit run is found.
export function normalizePostalCode(input: string): string | null {
  if (!input) return null;
  const match = input.trim().match(/\d{4}/);
  return match ? match[0] : null;
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
  postalCodes: string;
  localities: string;
  daysOfWeek: string;
  active: boolean;
}): ZoneForUI {
  return {
    id: z.id,
    name: z.name,
    postalCodes: parseArray<string>(z.postalCodes),
    localities: parseArray<string>(z.localities),
    daysOfWeek: parseArray<number>(z.daysOfWeek),
    active: z.active,
  };
}

export async function listZones(): Promise<ZoneForUI[]> {
  const rows = await prisma.zone.findMany({ orderBy: { name: "asc" } });
  return rows.map(toZoneForUI);
}

// Finds the active zone that covers the given postal code (matched by its
// 4-digit number, so "1642" and "B1642DHG" both work).
export async function findZoneByPostalCode(
  postalCode: string
): Promise<ZoneForUI | null> {
  const target = normalizePostalCode(postalCode);
  if (!target) return null;
  const zones = await listZones();
  for (const zone of zones) {
    if (!zone.active) continue;
    if (zone.postalCodes.some((c) => normalizePostalCode(c) === target)) {
      return zone;
    }
  }
  return null;
}

// Finds the active zone that lists the given locality (normalized match).
export async function findZoneByLocality(
  locality: string
): Promise<ZoneForUI | null> {
  return findZoneByLocalities([locality]);
}

// Finds the active zone that lists ANY of the given candidate localities.
// Used with geocoding, which yields several place names per address (locality,
// partido, barrio) — a match on any of them means we deliver there.
export async function findZoneByLocalities(
  candidates: string[]
): Promise<ZoneForUI | null> {
  const targets = candidates
    .map(normalizeLocality)
    .filter((t) => t.length > 0);
  if (targets.length === 0) return null;

  const zones = await listZones();
  for (const zone of zones) {
    if (!zone.active) continue;
    const zoneLocalities = zone.localities.map(normalizeLocality);
    if (zoneLocalities.some((l) => targets.includes(l))) {
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
  // The single best-guess locality (for display/logging).
  locality: string | null;
  // All candidate place names from the address (locality, partido, barrio…),
  // used to match against zones — in Greater Buenos Aires the partido we care
  // about (e.g. "San Isidro") often comes as administrative_area_level_2 while
  // `locality` is just "Buenos Aires".
  candidates: string[];
  formattedAddress: string | null;
};

// Address-component types that can name a place we'd put in a zone, in the
// order we prefer them for the single `locality` field.
const LOCALITY_TYPES = [
  "locality",
  "administrative_area_level_2", // partido (key for GBA)
  "sublocality",
  "sublocality_level_1",
  "neighborhood",
  "administrative_area_level_3",
];

// Calls Google Geocoding API to resolve an address into candidate localities.
// Returns empty results when the key is missing or nothing usable is found.
export async function geocodeLocality(
  address: string
): Promise<GeocodeResult> {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) return { locality: null, candidates: [], formattedAddress: null };

  // Bias results toward the delivery area (northern Greater Buenos Aires) so
  // Google prefers a local match for ambiguous street names instead of, say,
  // the famous Av. 9 de Julio in CABA. `bounds` is a soft hint, not a filter.
  // SW corner .. NE corner roughly covering San Isidro / Vicente López / Tigre.
  const bounds = "-34.60,-58.65|-34.40,-58.45";

  const url =
    "https://maps.googleapis.com/maps/api/geocode/json" +
    `?address=${encodeURIComponent(address)}` +
    "&components=country:AR&region=ar&language=es" +
    `&bounds=${encodeURIComponent(bounds)}` +
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
    return { locality: null, candidates: [], formattedAddress: null };
  }

  const result = data.results[0];
  const components = result.address_components;

  // Collect every candidate place name, in preference order, de-duplicated.
  const candidates: string[] = [];
  for (const type of LOCALITY_TYPES) {
    for (const c of components) {
      if (c.types.includes(type) && !candidates.includes(c.long_name)) {
        candidates.push(c.long_name);
      }
    }
  }

  return {
    locality: candidates[0] ?? null,
    candidates,
    formattedAddress: result.formatted_address,
  };
}
