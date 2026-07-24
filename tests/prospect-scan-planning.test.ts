import { describe, expect, it } from "vitest";
import {
  buildProspectScanCellSpecs,
  isProspectRequestLimitReached,
  prospectCellFailureTransition,
} from "@/lib/prospect-scan-planning";

describe("planificación idempotente de scans", () => {
  const points = [
    { latitude: -34.41, longitude: -58.65 },
    { latitude: -34.42, longitude: -58.66 },
  ];
  const queries = [{ id: "type" }, { id: "almacen" }, { id: "dietetica" }];

  it("crea una clave estable por punto y consulta", () => {
    const first = buildProspectScanCellSpecs(points, queries, 500);
    const second = buildProspectScanCellSpecs(points, queries, 500);
    expect(first).toEqual(second);
    expect(first).toHaveLength(6);
    expect(new Set(first.map((cell) => cell.key)).size).toBe(6);
    expect(first[0].key).toBe("0:type");
  });

  it("frena exactamente al llegar al límite de API", () => {
    expect(isProspectRequestLimitReached(99, 100)).toBe(false);
    expect(isProspectRequestLimitReached(100, 100)).toBe(true);
    expect(isProspectRequestLimitReached(101, 100)).toBe(true);
  });

  it("reprograma fallas con backoff y termina tras tres intentos", () => {
    const now = new Date("2026-07-24T12:00:00.000Z");
    const first = prospectCellFailureTransition(0, now);
    expect(first.status).toBe("PENDING");
    expect(first.nextAttemptAt?.toISOString()).toBe("2026-07-24T12:01:00.000Z");
    const second = prospectCellFailureTransition(1, now);
    expect(second.nextAttemptAt?.toISOString()).toBe("2026-07-24T12:02:00.000Z");
    const final = prospectCellFailureTransition(2, now);
    expect(final).toEqual({ status: "FAILED", nextAttemptAt: null });
  });
});

