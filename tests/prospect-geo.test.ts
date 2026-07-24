import { describe, expect, it } from "vitest";
import {
  generateSearchGrid,
  haversineMeters,
  polygonBounds,
} from "@/lib/prospect-geo";
import { isPointInPolygon, type GeoPolygon } from "@/lib/zones";

const square: GeoPolygon = {
  type: "Polygon",
  coordinates: [
    [
      [-58.66, -34.425],
      [-58.64, -34.425],
      [-58.64, -34.41],
      [-58.66, -34.41],
      [-58.66, -34.425],
    ],
  ],
};

describe("grilla geográfica de prospectos", () => {
  it("genera centros solo dentro del polígono", () => {
    const points = generateSearchGrid(square, 550);
    expect(points.length).toBeGreaterThan(3);
    expect(
      points.every((point) =>
        isPointInPolygon(point.latitude, point.longitude, square)
      )
    ).toBe(true);
  });

  it("más densidad produce más puntos sin cambiar el contorno", () => {
    const dense = generateSearchGrid(square, 400);
    const sparse = generateSearchGrid(square, 900);
    expect(dense.length).toBeGreaterThan(sparse.length);
    expect(polygonBounds(square)).toEqual({
      minLat: -34.425,
      maxLat: -34.41,
      minLng: -58.66,
      maxLng: -58.64,
    });
  });

  it("calcula proximidad en metros", () => {
    const distance = haversineMeters(
      { latitude: -34.418, longitude: -58.65 },
      { latitude: -34.4185, longitude: -58.6505 }
    );
    expect(distance).toBeGreaterThan(60);
    expect(distance).toBeLessThan(80);
  });

  it("asigna correctamente un punto a la zona", () => {
    expect(isPointInPolygon(-34.418, -58.65, square)).toBe(true);
    expect(isPointInPolygon(-34.5, -58.65, square)).toBe(false);
  });
});

