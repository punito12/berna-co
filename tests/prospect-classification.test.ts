import { describe, expect, it } from "vitest";
import {
  classifyProspect,
  normalizeProspectAddress,
  normalizeProspectName,
  resolveManualScore,
  scoreProspect,
} from "@/lib/prospect-classification";

describe("normalización argentina", () => {
  it("unifica acentos, sufijos y variantes geográficas", () => {
    expect(normalizeProspectName("LA PROVEEDURÍA S.R.L.")).toBe(
      "la proveeduria"
    );
    expect(
      normalizeProspectAddress(
        "Av. Maipú 123, Capital Federal, Argentina"
      )
    ).toContain("avenida maipu 123 caba");
    expect(normalizeProspectAddress("Belén de Escobar")).toBe("escobar");
  });
});

describe("clasificación determinística", () => {
  it.each([
    ["Mercado Gourmet del Lago", ["grocery_store"], "GOURMET_MARKET", 30],
    ["Dietetica Semilla", ["health_food_store"], "DIETETICA", 24],
    ["Frío Sur Congelados", ["food_store"], "FROZEN_STORE", 30],
    ["Autoservicio Norte", ["grocery_store"], "AUTOSERVICIO", 18],
    ["Carnicería premium La Estancia", ["butcher_shop"], "BOUTIQUE_BUTCHER", 24],
  ])("clasifica %s", (name, types, key, points) => {
    const result = classifyProspect({ name, types });
    expect(result.categoryKey).toBe(key);
    expect(result.compatibilityPoints).toBe(points);
    expect(result.excluded).toBe(false);
  });

  it("excluye restaurantes por tipo explícito", () => {
    const result = classifyProspect({
      name: "La Cocina del Barrio",
      primaryType: "restaurant",
      types: ["restaurant", "food"],
    });
    expect(result.excluded).toBe(true);
    expect(result.reason).toContain("restaurant");
  });

  it("excluye locales de suplementos sin surtido compatible", () => {
    const result = classifyProspect({
      name: "Power Suplementos Deportivos",
      types: ["store"],
    });
    expect(result.excluded).toBe(true);
  });

  it("marca como ambigua una tienda sin evidencia suficiente", () => {
    const result = classifyProspect({
      name: "Comercial Azul",
      types: ["store"],
    });
    expect(result.categoryKey).toBe("UNCERTAIN");
    expect(result.ambiguous).toBe(true);
  });
});

describe("score explicable", () => {
  it("suma encaje, compatibilidad, señales y actividad", () => {
    const classification = classifyProspect({
      name: "Mercado Gourmet Nordelta",
      types: ["grocery_store"],
    });
    const result = scoreProspect({
      name: "Mercado Gourmet Nordelta",
      tier: "A",
      zoneKind: "GATED_COMMUNITY",
      classification,
      operatingStatus: "OPERATIONAL",
      reviewCount: 80,
    });
    expect(result.score).toBe(96);
    expect(result.breakdown.map((item) => item.key)).toEqual([
      "COMMERCIAL_FIT",
      "COMPATIBILITY",
      "PREMIUM",
      "SPECIAL_LOCATION",
      "ACTIVITY",
    ]);
    expect(result.explanation).toContain("Tier A");
  });

  it("una zona excluida descarta aunque el local sea compatible", () => {
    const classification = classifyProspect({
      name: "Mercado Gourmet",
      types: ["grocery_store"],
    });
    const result = scoreProspect({
      name: "Mercado Gourmet",
      tier: "EXCLUDED",
      zoneKind: "CUSTOM",
      classification,
    });
    expect(result.excluded).toBe(true);
    expect(result.score).toBe(0);
  });

  it("los overrides manuales requieren razón y respetan 0–100", () => {
    expect(resolveManualScore(80, 73, "Visita de validación")).toBe(73);
    expect(() => resolveManualScore(80, 73, "")).toThrow("motivo");
    expect(() => resolveManualScore(80, 120, "Prueba")).toThrow("0 y 100");
    expect(resolveManualScore(80, null, null)).toBe(80);
  });
});
