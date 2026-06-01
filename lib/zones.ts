// Delivery zones as map polygons. Coverage is point-in-polygon on the
// customer's coordinates, which we obtain from their address via OpenStreetMap
// Nominatim (free, no API key). All geometry is stored as GeoJSON.

import { prisma } from "@/lib/db";

// A GeoJSON Polygon: coordinates are [lng, lat] rings (GeoJSON order).
export type GeoPolygon = {
  type: "Polygon";
  coordinates: number[][][];
};

export type ZoneForUI = {
  id: string;
  name: string;
  polygon: GeoPolygon | null;
  daysOfWeek: number[];
  active: boolean;
  shippingCost: number; // flat delivery fee (pesos)
  freeShippingFrom: number; // free from this subtotal; 0 = never free
};

// Delivery fee for a zone given the products subtotal. Free when the zone has
// a freeShippingFrom threshold and the subtotal reaches it.
export function shippingFor(zone: ZoneForUI, subtotal: number): number {
  if (zone.freeShippingFrom > 0 && subtotal >= zone.freeShippingFrom) return 0;
  return zone.shippingCost;
}

function parseArray<T>(raw: string): T[] {
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? (v as T[]) : [];
  } catch {
    return [];
  }
}

function parsePolygon(raw: string | null): GeoPolygon | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw);
    if (v && v.type === "Polygon" && Array.isArray(v.coordinates)) {
      return v as GeoPolygon;
    }
    return null;
  } catch {
    return null;
  }
}

function toZoneForUI(z: {
  id: string;
  name: string;
  polygon: string | null;
  daysOfWeek: string;
  active: boolean;
  shippingCost: number;
  freeShippingFrom: number;
}): ZoneForUI {
  return {
    id: z.id,
    name: z.name,
    polygon: parsePolygon(z.polygon),
    daysOfWeek: parseArray<number>(z.daysOfWeek),
    active: z.active,
    shippingCost: z.shippingCost,
    freeShippingFrom: z.freeShippingFrom,
  };
}

export async function listZones(): Promise<ZoneForUI[]> {
  const rows = await prisma.zone.findMany({ orderBy: { name: "asc" } });
  return rows.map(toZoneForUI);
}

// Ray-casting point-in-polygon test. `point` and the ring are in [lng, lat].
// Works on a single linear ring; we test the polygon's outer ring (index 0).
function pointInRing(point: [number, number], ring: number[][]): boolean {
  const [x, y] = point;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];
    const intersect =
      yi > y !== yj > y &&
      x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

// True when (lat,lng) falls inside the polygon's outer ring.
export function isPointInPolygon(
  lat: number,
  lng: number,
  polygon: GeoPolygon
): boolean {
  const ring = polygon.coordinates?.[0];
  if (!ring || ring.length < 3) return false;
  return pointInRing([lng, lat], ring);
}

// Finds the first active zone whose polygon contains the given coordinates.
export async function findZoneByPoint(
  lat: number,
  lng: number
): Promise<ZoneForUI | null> {
  const zones = await listZones();
  for (const zone of zones) {
    if (!zone.active || !zone.polygon) continue;
    if (isPointInPolygon(lat, lng, zone.polygon)) return zone;
  }
  return null;
}

export type GeocodeResult = {
  lat: number;
  lng: number;
  displayName: string;
};

// Structured address parts. `street` should include the number (e.g.
// "Avenida Italia 600"). `floor` (piso/depto) is for the delivery only and is
// NOT used for geocoding. Postal code is optional but helps disambiguate.
export type AddressParts = {
  street: string;
  locality: string;
  postalCode?: string;
  floor?: string;
};

// Builds a human-readable one-line address from the structured parts.
export function formatAddress(parts: AddressParts): string {
  const bits = [parts.street.trim()];
  if (parts.floor?.trim()) bits.push(parts.floor.trim());
  if (parts.locality.trim()) bits.push(parts.locality.trim());
  if (parts.postalCode?.trim()) bits.push(`CP ${parts.postalCode.trim()}`);
  return bits.filter(Boolean).join(", ");
}

const NOMINATIM_HEADERS = {
  "User-Agent": "berna-and-co-delivery/1.0 (pedidos web)",
  "Accept-Language": "es",
};

async function nominatimFetch(params: URLSearchParams): Promise<GeocodeResult | null> {
  params.set("countrycodes", "ar");
  params.set("format", "jsonv2");
  params.set("addressdetails", "0");
  params.set("limit", "1");
  const url = `https://nominatim.openstreetmap.org/search?${params.toString()}`;

  const res = await fetch(url, { headers: NOMINATIM_HEADERS, cache: "no-store" });
  if (!res.ok) throw new Error(`Nominatim HTTP ${res.status}`);

  const data = (await res.json()) as {
    lat: string;
    lon: string;
    display_name: string;
  }[];
  if (!Array.isArray(data) || data.length === 0) return null;

  const lat = Number(data[0].lat);
  const lng = Number(data[0].lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng, displayName: data[0].display_name };
}

// Geocodes a STRUCTURED address via Nominatim. Using separate street/city/
// postalcode fields lets Nominatim disambiguate streets that exist in several
// places (e.g. "Avenida Italia" appears in many AR cities). Falls back to a
// free-text query if the structured search finds nothing.
export async function geocodeStructured(
  parts: AddressParts
): Promise<GeocodeResult | null> {
  const street = parts.street.trim();
  const locality = parts.locality.trim();
  if (!street) return null;

  // 1) Structured query (most precise).
  if (locality || parts.postalCode?.trim()) {
    const structured = new URLSearchParams();
    structured.set("street", street);
    if (locality) structured.set("city", locality);
    if (parts.postalCode?.trim()) {
      structured.set("postalcode", parts.postalCode.trim());
    }
    const hit = await nominatimFetch(structured);
    if (hit) return hit;
  }

  // 2) Fallback: free-text with everything joined (helps odd cases).
  const freeText = [street, locality, parts.postalCode?.trim()]
    .filter(Boolean)
    .join(", ");
  const free = new URLSearchParams();
  free.set("q", freeText);
  return nominatimFetch(free);
}

// Backwards-compatible single-string geocoder (free text), kept for any caller
// that still passes one line.
export async function geocodeAddress(
  address: string
): Promise<GeocodeResult | null> {
  const query = address.trim();
  if (!query) return null;
  const params = new URLSearchParams();
  params.set("q", query);
  return nominatimFetch(params);
}
