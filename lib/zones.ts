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
};

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
}): ZoneForUI {
  return {
    id: z.id,
    name: z.name,
    polygon: parsePolygon(z.polygon),
    daysOfWeek: parseArray<number>(z.daysOfWeek),
    active: z.active,
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

// Geocodes an address to coordinates via OpenStreetMap Nominatim (no API key).
// Biased to Argentina. Returns null when nothing is found. Nominatim asks for a
// descriptive User-Agent and rate-limits to ~1 req/s — fine for checkout use.
export async function geocodeAddress(
  address: string
): Promise<GeocodeResult | null> {
  const query = address.trim();
  if (!query) return null;

  const url =
    "https://nominatim.openstreetmap.org/search" +
    `?q=${encodeURIComponent(query)}` +
    "&countrycodes=ar&format=jsonv2&addressdetails=0&limit=1";

  const res = await fetch(url, {
    headers: {
      "User-Agent": "berna-and-co-delivery/1.0 (pedidos web)",
      "Accept-Language": "es",
    },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Nominatim HTTP ${res.status}`);

  const data = (await res.json()) as {
    lat: string;
    lon: string;
    display_name: string;
  }[];
  if (!Array.isArray(data) || data.length === 0) return null;

  const first = data[0];
  const lat = Number(first.lat);
  const lng = Number(first.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  return { lat, lng, displayName: first.display_name };
}
