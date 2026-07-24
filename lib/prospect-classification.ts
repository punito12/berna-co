import {
  DEFAULT_PROSPECT_SCORING_RULES,
  type ProspectScoringRules,
  type ProspectTier,
  type ProspectZoneKind,
} from "@/lib/prospect-types";

const BUSINESS_SUFFIXES = new Set(["sa", "srl", "sas", "argentina"]);

export function normalizeProspectText(value: string): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\b(ciudad autonoma de buenos aires|capital federal)\b/g, "caba")
    .replace(/\bbelen de escobar\b/g, "escobar")
    .replace(/\b(avda|av)\.?(?=\s)/g, "avenida")
    .replace(/\bgral\.?(?=\s)/g, "general")
    .replace(/\bpte\.?(?=\s)/g, "presidente")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function normalizeProspectName(value: string): string {
  return normalizeProspectText(value)
    .replace(/\b(s r l|s a s|s a)\b$/, "")
    .trim()
    .split(" ")
    .filter((token) => !BUSINESS_SUFFIXES.has(token))
    .join(" ");
}

export function normalizeProspectAddress(value: string): string {
  return normalizeProspectText(value)
    .replace(/\b(provincia de buenos aires|buenos aires province)\b/g, "buenos aires")
    .replace(/\b(argentina)\b/g, "")
    .trim()
    .replace(/\s+/g, " ");
}

export type ClassificationInput = {
  name: string;
  primaryType?: string | null;
  types: string[];
  queryValue?: string;
};

export type ClassificationResult = {
  categoryKey: string;
  categoryLabel: string;
  compatibilityPoints: number;
  excluded: boolean;
  ambiguous: boolean;
  confidence: number;
  detectedKeywords: string[];
  reason: string;
};

export function classifyProspect(
  input: ClassificationInput,
  rules: ProspectScoringRules = DEFAULT_PROSPECT_SCORING_RULES
): ClassificationResult {
  const haystack = normalizeProspectText(`${input.name} ${input.queryValue ?? ""}`);
  const primaryType = input.primaryType ?? "";
  const compatibleTypeSet = new Set(
    rules.compatibility
      .filter((rule) => rule.key !== "UNCERTAIN")
      .flatMap((rule) => rule.placeTypes)
  );
  const hasCompatibleType = input.types.some((type) => compatibleTypeSet.has(type));

  const excludedType = rules.excludedPrimaryTypes.includes(primaryType);
  const excludedKeyword = rules.excludedKeywords.find((keyword) =>
    haystack.includes(normalizeProspectText(keyword))
  );
  if (excludedType || (excludedKeyword && !hasCompatibleType)) {
    const reason = excludedType
      ? `Tipo incompatible de Google: ${primaryType}.`
      : `Coincide con la exclusión “${excludedKeyword}”.`;
    return {
      categoryKey: "EXCLUDED",
      categoryLabel: "Incompatible",
      compatibilityPoints: 0,
      excluded: true,
      ambiguous: false,
      confidence: 1,
      detectedKeywords: excludedKeyword ? [excludedKeyword] : [],
      reason,
    };
  }

  const matches = rules.compatibility
    .map((rule) => {
      const keywords = rule.keywords.filter((keyword) =>
        haystack.includes(normalizeProspectText(keyword))
      );
      const types = rule.placeTypes.filter((type) => input.types.includes(type));
      return { rule, keywords, types, strength: keywords.length * 2 + types.length };
    })
    .filter((match) => match.strength > 0)
  const keywordMatches = matches.filter((match) => match.keywords.length > 0);
  const rankedMatches = (keywordMatches.length > 0 ? keywordMatches : matches).sort(
      (a, b) =>
        b.rule.score - a.rule.score ||
        b.strength - a.strength ||
        a.rule.key.localeCompare(b.rule.key)
    );

  const winner =
    rankedMatches[0] ??
    rules.compatibility.find((rule) => rule.key === "UNCERTAIN") ?? {
      key: "UNCERTAIN",
      label: "Compatibilidad a revisar",
      score: 8,
      keywords: [],
      placeTypes: [],
    };
  const winnerRule = "rule" in winner ? winner.rule : winner;
  const keywords = "keywords" in winner ? winner.keywords : [];
  const types = "types" in winner ? winner.types : [];
  const ambiguous = winnerRule.key === "UNCERTAIN" || rankedMatches.length === 0;
  const evidence = [...keywords, ...types];

  return {
    categoryKey: winnerRule.key,
    categoryLabel: winnerRule.label,
    compatibilityPoints: winnerRule.score,
    excluded: false,
    ambiguous,
    confidence: ambiguous ? 0.45 : Math.min(1, 0.7 + evidence.length * 0.1),
    detectedKeywords: keywords,
    reason: evidence.length
      ? `${winnerRule.label}: ${evidence.join(", ")}.`
      : "No hay evidencia suficiente; requiere revisión manual.",
  };
}

export type ScoreBreakdownItem = {
  key: "COMMERCIAL_FIT" | "COMPATIBILITY" | "PREMIUM" | "SPECIAL_LOCATION" | "ACTIVITY";
  label: string;
  points: number;
};

export type ProspectScoreResult = {
  score: number;
  excluded: boolean;
  breakdown: ScoreBreakdownItem[];
  explanation: string;
  premiumKeywords: string[];
};

export function scoreProspect(
  input: {
    name: string;
    tier: ProspectTier;
    zoneKind: ProspectZoneKind;
    classification: ClassificationResult;
    operatingStatus?: string | null;
    reviewCount?: number | null;
  },
  rules: ProspectScoringRules = DEFAULT_PROSPECT_SCORING_RULES
): ProspectScoreResult {
  const excluded = input.tier === "EXCLUDED" || input.classification.excluded;
  if (excluded) {
    const explanation =
      input.tier === "EXCLUDED"
        ? "Excluido por la clasificación comercial de la zona."
        : input.classification.reason;
    return { score: 0, excluded: true, breakdown: [], explanation, premiumKeywords: [] };
  }

  const breakdown: ScoreBreakdownItem[] = [];
  const fit = rules.tierPoints[input.tier];
  breakdown.push({
    key: "COMMERCIAL_FIT",
    label: `Área de encaje comercial Tier ${input.tier}`,
    points: fit,
  });
  breakdown.push({
    key: "COMPATIBILITY",
    label: input.classification.categoryLabel,
    points: input.classification.compatibilityPoints,
  });

  const normalizedName = normalizeProspectText(input.name);
  const premiumKeywords = [...new Set(
    rules.premiumKeywords.filter((keyword) =>
      normalizedName.includes(normalizeProspectText(keyword))
    )
  )];
  const premiumPoints = Math.min(
    rules.premiumKeywordMax,
    premiumKeywords.length * rules.premiumPointsPerKeyword
  );
  if (premiumPoints > 0) {
    breakdown.push({
      key: "PREMIUM",
      label: `Señales observables: ${premiumKeywords.join(", ")}`,
      points: premiumPoints,
    });
  }

  if (input.zoneKind === "GATED_COMMUNITY" || input.zoneKind === "COMMERCIAL_CENTER") {
    breakdown.push({
      key: "SPECIAL_LOCATION",
      label:
        input.zoneKind === "GATED_COMMUNITY"
          ? "Dentro de un barrio cerrado seleccionado"
          : "Dentro de un centro comercial seleccionado",
      points: rules.specialLocationPoints,
    });
  }

  let activityPoints = 0;
  const activityReasons: string[] = [];
  if (input.operatingStatus === "OPERATIONAL") {
    activityPoints += rules.operationalPoints;
    activityReasons.push("figura operativo");
  }
  const reviewCount = input.reviewCount ?? 0;
  const reviewRule = [...rules.reviewThresholds]
    .sort((a, b) => b.min - a.min)
    .find((threshold) => reviewCount > threshold.min);
  if (reviewRule) {
    activityPoints += reviewRule.points;
    activityReasons.push(`más de ${reviewRule.min} reseñas`);
  }
  if (activityPoints > 0) {
    breakdown.push({
      key: "ACTIVITY",
      label: `Actividad: ${activityReasons.join(" y ")}`,
      points: activityPoints,
    });
  }

  const score = Math.min(100, breakdown.reduce((sum, item) => sum + item.points, 0));
  const explanation = breakdown.map((item) => `${item.label}: +${item.points}`).join(" · ");
  return { score, excluded: false, breakdown, explanation, premiumKeywords };
}

export function resolveManualScore(
  calculatedScore: number,
  manualScore: number | null | undefined,
  reason: string | null | undefined
): number {
  if (manualScore === null || manualScore === undefined) return calculatedScore;
  const rounded = Math.round(manualScore);
  if (!Number.isFinite(rounded) || rounded < 0 || rounded > 100) {
    throw new Error("El puntaje manual debe estar entre 0 y 100.");
  }
  if (!reason?.trim()) {
    throw new Error("El puntaje manual necesita un motivo.");
  }
  return rounded;
}
