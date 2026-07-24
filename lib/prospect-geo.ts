import type { GeoPolygon } from "@/lib/zones";
import { isPointInPolygon } from "@/lib/zones";

export type GeoPoint = { latitude: number; longitude: number };

const EARTH_RADIUS_METERS = 6_371_000;

export function haversineMeters(a: GeoPoint, b: GeoPoint): number {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = toRadians(b.latitude - a.latitude);
  const dLng = toRadians(b.longitude - a.longitude);
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(h));
}

export function polygonBounds(polygon: GeoPolygon): {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
} {
  const ring = polygon.coordinates?.[0] ?? [];
  if (ring.length < 3) throw new Error("El polígono necesita al menos 3 vértices.");
  const lngs = ring.map((point) => point[0]);
  const lats = ring.map((point) => point[1]);
  return {
    minLat: Math.min(...lats),
    maxLat: Math.max(...lats),
    minLng: Math.min(...lngs),
    maxLng: Math.max(...lngs),
  };
}

// Genera una grilla hexagonal: las filas alternadas mejoran la cobertura con
// menos puntos que una cuadrícula ortogonal. Solo conserva centros dentro del
// polígono; el radio solapado cubre los bordes cercanos.
export function generateSearchGrid(
  polygon: GeoPolygon,
  spacingMeters: number
): GeoPoint[] {
  if (!Number.isFinite(spacingMeters) || spacingMeters < 100 || spacingMeters > 5_000) {
    throw new Error("La separación de grilla debe estar entre 100 y 5.000 metros.");
  }
  const bounds = polygonBounds(polygon);
  const centerLat = (bounds.minLat + bounds.maxLat) / 2;
  const latStep = spacingMeters / 111_320;
  const lngStep = spacingMeters / (111_320 * Math.max(0.2, Math.cos((centerLat * Math.PI) / 180)));
  const rowStep = latStep * Math.sqrt(3) / 2;
  const points: GeoPoint[] = [];
  let row = 0;

  for (let latitude = bounds.minLat; latitude <= bounds.maxLat + rowStep / 2; latitude += rowStep) {
    const offset = row % 2 === 0 ? 0 : lngStep / 2;
    for (
      let longitude = bounds.minLng + offset;
      longitude <= bounds.maxLng + lngStep / 2;
      longitude += lngStep
    ) {
      if (isPointInPolygon(latitude, longitude, polygon)) {
        points.push({
          latitude: Number(latitude.toFixed(7)),
          longitude: Number(longitude.toFixed(7)),
        });
      }
    }
    row += 1;
  }

  // Polígonos muy chicos pueden quedar entre pasos: usar el centro si pertenece.
  if (points.length === 0) {
    const latitude = (bounds.minLat + bounds.maxLat) / 2;
    const longitude = (bounds.minLng + bounds.maxLng) / 2;
    if (isPointInPolygon(latitude, longitude, polygon)) {
      points.push({ latitude, longitude });
    }
  }
  return points;
}

export function parseGeoPolygon(raw: string | null | undefined): GeoPolygon | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as GeoPolygon;
    if (
      value?.type === "Polygon" &&
      Array.isArray(value.coordinates?.[0]) &&
      value.coordinates[0].length >= 3
    ) {
      return value;
    }
    return null;
  } catch {
    return null;
  }
}

