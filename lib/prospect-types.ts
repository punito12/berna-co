// Tipos y defaults del módulo de Puntos Potenciales. Los valores editables se
// guardan como JSON en ProspectScoringConfig; estos defaults son el fallback
// seguro cuando la fila todavía no existe o contiene JSON inválido.

import {
  DEFAULT_GOOGLE_PLACES_MONTHLY_USAGE,
  type GooglePlacesMonthlyUsage,
} from "@/lib/google-places-pricing";

export const PROSPECT_TIERS = ["A", "B", "C", "EXCLUDED"] as const;
export type ProspectTier = (typeof PROSPECT_TIERS)[number];

export const PROSPECT_STATUSES = [
  "NEW",
  "PENDING_REVIEW",
  "INTERESTING",
  "HIGH_PRIORITY",
  "VISITED",
  "EXISTING_CLIENT",
  "DISCARDED",
  "DUPLICATE",
  "CLOSED",
] as const;
export type ProspectStatus = (typeof PROSPECT_STATUSES)[number];

export const PROSPECT_SCAN_STATUSES = [
  "PENDING",
  "RUNNING",
  "PAUSED",
  "COMPLETED",
  "PARTIAL_FAILED",
  "LIMIT_REACHED",
  "CANCELLED",
] as const;
export type ProspectScanStatus = (typeof PROSPECT_SCAN_STATUSES)[number];

export const PROSPECT_ZONE_KINDS = [
  "NEIGHBORHOOD",
  "LOCALITY",
  "GATED_COMMUNITY",
  "COMMERCIAL_CENTER",
  "CUSTOM",
] as const;
export type ProspectZoneKind = (typeof PROSPECT_ZONE_KINDS)[number];

export type CompatibilityRule = {
  key: string;
  label: string;
  score: number;
  keywords: string[];
  placeTypes: string[];
};

export type ProspectScoringRules = {
  version: number;
  tierPoints: Record<ProspectTier, number>;
  highPriorityFrom: number;
  compatibility: CompatibilityRule[];
  excludedPrimaryTypes: string[];
  excludedKeywords: string[];
  premiumKeywords: string[];
  premiumPointsPerKeyword: number;
  premiumKeywordMax: number;
  specialLocationPoints: number;
  operationalPoints: number;
  reviewThresholds: { min: number; points: number }[];
  googlePlacesMonthlyUsage: GooglePlacesMonthlyUsage;
};

export const DEFAULT_PROSPECT_SCORING_RULES: ProspectScoringRules = {
  version: 1,
  tierPoints: { A: 55, B: 40, C: 20, EXCLUDED: 0 },
  highPriorityFrom: 80,
  compatibility: [
    {
      key: "GOURMET_MARKET",
      label: "Mercado gourmet o premium",
      score: 30,
      keywords: ["mercado gourmet", "almacen gourmet", "gourmet", "premium market"],
      placeTypes: [],
    },
    {
      key: "FROZEN_STORE",
      label: "Tienda de congelados",
      score: 30,
      keywords: ["congelado", "congelados", "frozen"],
      placeTypes: [],
    },
    {
      key: "NATURAL_MARKET",
      label: "Mercado natural con alimentos",
      score: 30,
      keywords: ["mercado natural", "almacen natural", "tienda saludable"],
      placeTypes: ["health_food_store"],
    },
    {
      key: "DELICATESSEN",
      label: "Delicatessen",
      score: 30,
      keywords: ["delicatessen", "deli"],
      placeTypes: [],
    },
    {
      key: "DIETETICA",
      label: "Dietética con alimentos",
      score: 24,
      keywords: ["dietetica", "dietética"],
      placeTypes: ["health_food_store"],
    },
    {
      key: "ORGANIC_STORE",
      label: "Tienda orgánica",
      score: 24,
      keywords: ["organico", "orgánico", "organica", "orgánica"],
      placeTypes: [],
    },
    {
      key: "PREMIUM_DELI",
      label: "Fiambrería premium",
      score: 24,
      keywords: ["fiambreria", "fiambrería", "queseria", "quesería"],
      placeTypes: [],
    },
    {
      key: "BOUTIQUE_BUTCHER",
      label: "Carnicería boutique",
      score: 24,
      keywords: ["carniceria premium", "carnicería premium", "carniceria boutique", "carnicería boutique"],
      placeTypes: ["butcher_shop"],
    },
    {
      key: "GLUTEN_FREE",
      label: "Tienda de alimentos sin TACC",
      score: 24,
      keywords: ["sin tacc", "sin gluten", "gluten free"],
      placeTypes: [],
    },
    {
      key: "VEGAN_STORE",
      label: "Tienda vegana",
      score: 24,
      keywords: ["tienda vegana", "almacen vegano", "almacén vegano"],
      placeTypes: [],
    },
    {
      key: "REGIONAL_STORE",
      label: "Tienda de productos regionales",
      score: 24,
      keywords: ["productos regionales", "regionales"],
      placeTypes: [],
    },
    {
      key: "INDEPENDENT_SUPERMARKET",
      label: "Supermercado independiente",
      score: 18,
      keywords: ["supermercado"],
      placeTypes: ["supermarket", "discount_supermarket"],
    },
    {
      key: "AUTOSERVICIO",
      label: "Autoservicio",
      score: 18,
      keywords: ["autoservicio"],
      placeTypes: [],
    },
    {
      key: "MINIMARKET",
      label: "Minimercado",
      score: 18,
      keywords: ["minimercado", "mini mercado", "minimarket", "mini market"],
      placeTypes: ["convenience_store"],
    },
    {
      key: "ALMACEN",
      label: "Almacén",
      score: 18,
      keywords: ["almacen", "almacén", "despensa"],
      placeTypes: ["general_store"],
    },
    {
      key: "GROCERY",
      label: "Tienda de alimentos",
      score: 18,
      keywords: ["mercado", "market"],
      placeTypes: ["grocery_store", "food_store", "market", "farmers_market", "asian_grocery_store"],
    },
    {
      key: "UNCERTAIN",
      label: "Compatibilidad a revisar",
      score: 8,
      keywords: [],
      placeTypes: ["store"],
    },
  ],
  excludedPrimaryTypes: [
    "restaurant",
    "cafe",
    "bar",
    "catering_service",
    "food_delivery",
    "school",
    "university",
    "hotel",
    "pharmacy",
    "cosmetics_store",
    "gym",
    "fitness_center",
    "wholesaler",
    "supplier",
  ],
  excludedKeywords: [
    "restaurant",
    "restaurante",
    "cafeteria",
    "cafetería",
    "catering",
    "meal prep",
    "vianda",
    "hotel",
    "farmacia",
    "cosmetica",
    "cosmética",
    "herbalife",
    "consultorio",
    "nutricionista",
    "gimnasio",
    "mayorista",
    "distribuidor",
    "solo online",
    "tienda online",
    "suplementos deportivos",
    "suplementos dietarios",
  ],
  premiumKeywords: [
    "gourmet",
    "premium",
    "organico",
    "orgánico",
    "natural",
    "boutique",
    "deli",
    "delicatessen",
  ],
  premiumPointsPerKeyword: 3,
  premiumKeywordMax: 6,
  specialLocationPoints: 4,
  operationalPoints: 2,
  reviewThresholds: [
    { min: 100, points: 3 },
    { min: 50, points: 2 },
    { min: 20, points: 1 },
  ],
  googlePlacesMonthlyUsage: DEFAULT_GOOGLE_PLACES_MONTHLY_USAGE,
};

export function parseProspectScoringRules(raw: string | null | undefined): ProspectScoringRules {
  if (!raw) return DEFAULT_PROSPECT_SCORING_RULES;
  try {
    const value = JSON.parse(raw) as Partial<ProspectScoringRules>;
    if (!value || !Array.isArray(value.compatibility)) {
      return DEFAULT_PROSPECT_SCORING_RULES;
    }
    return {
      ...DEFAULT_PROSPECT_SCORING_RULES,
      ...value,
      tierPoints: {
        ...DEFAULT_PROSPECT_SCORING_RULES.tierPoints,
        ...(value.tierPoints ?? {}),
      },
      googlePlacesMonthlyUsage: {
        ...DEFAULT_PROSPECT_SCORING_RULES.googlePlacesMonthlyUsage,
        ...(value.googlePlacesMonthlyUsage ?? {}),
      },
    };
  } catch {
    return DEFAULT_PROSPECT_SCORING_RULES;
  }
}
