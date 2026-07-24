import { prisma } from "@/lib/db";
import { fetchGooglePlaceActivity } from "@/lib/google-places";
import { estimateGoogleEnrichmentCost } from "@/lib/google-places-pricing";
import { parseProspectScoringRules } from "@/lib/prospect-types";
import { recalculateProspectScore } from "@/lib/prospects";

const MAX_ENRICHMENT_BATCH = 8;

function uniqueIds(ids: string[]): string[] {
  return [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
}

async function enrichmentSelection(ids: string[]) {
  const selectedIds = uniqueIds(ids);
  if (selectedIds.length === 0) {
    throw new Error("Seleccioná al menos un prospecto para enriquecer.");
  }
  if (selectedIds.length > 100) {
    throw new Error("La selección no puede superar 100 prospectos.");
  }
  const rows = await prisma.prospectStore.findMany({
    where: { id: { in: selectedIds } },
    select: { id: true, name: true, googlePlaceId: true },
  });
  const byPlaceId = new Map<
    string,
    { id: string; name: string; googlePlaceId: string }
  >();
  for (const row of rows) {
    if (row.googlePlaceId && !byPlaceId.has(row.googlePlaceId)) {
      byPlaceId.set(row.googlePlaceId, {
        id: row.id,
        name: row.name,
        googlePlaceId: row.googlePlaceId,
      });
    }
  }
  return {
    selectedCount: selectedIds.length,
    rows: [...byPlaceId.values()],
    skippedWithoutGooglePlaceId: rows.filter((row) => !row.googlePlaceId).length,
    missingProspects: selectedIds.length - rows.length,
  };
}

export async function previewProspectEnrichment(ids: string[]) {
  const selection = await enrichmentSelection(ids);
  const config = await prisma.prospectScoringConfig.findUnique({
    where: { id: "singleton" },
  });
  const rules = parseProspectScoringRules(config?.config);
  return {
    selectedCount: selection.selectedCount,
    uniqueGooglePlaces: selection.rows.length,
    skippedWithoutGooglePlaceId: selection.skippedWithoutGooglePlaceId,
    missingProspects: selection.missingProspects,
    maxBatchSize: MAX_ENRICHMENT_BATCH,
    pricing: estimateGoogleEnrichmentCost(
      selection.rows.length,
      rules.googlePlacesMonthlyUsage
    ),
  };
}

export async function enrichSelectedProspects(
  ids: string[],
  confirmed: boolean
) {
  if (!confirmed) {
    throw new Error("Confirmá el costo máximo antes de enriquecer.");
  }
  const selection = await enrichmentSelection(ids);
  if (selection.rows.length === 0) {
    throw new Error("Ningún prospecto seleccionado tiene Google Place ID.");
  }
  if (selection.rows.length > MAX_ENRICHMENT_BATCH) {
    throw new Error(
      `Enriquecé hasta ${MAX_ENRICHMENT_BATCH} lugares únicos por vez.`
    );
  }
  const settled = await Promise.allSettled(
    selection.rows.map(async (row) => {
      const activity = await fetchGooglePlaceActivity(row.googlePlaceId);
      await prisma.prospectStore.update({
        where: { id: row.id },
        data: {
          rating: activity.rating,
          reviewCount: activity.reviewCount,
          lastVerifiedAt: new Date(),
        },
      });
      await recalculateProspectScore(row.id);
      return { id: row.id, name: row.name };
    })
  );
  const enriched = settled.flatMap((result) =>
    result.status === "fulfilled" ? [result.value] : []
  );
  const failures = settled.flatMap((result, index) =>
    result.status === "rejected"
      ? [
          {
            id: selection.rows[index].id,
            name: selection.rows[index].name,
            message:
              result.reason instanceof Error
                ? result.reason.message
                : "No se pudo enriquecer.",
          },
        ]
      : []
  );
  return {
    enriched,
    failures,
    skippedWithoutGooglePlaceId: selection.skippedWithoutGooglePlaceId,
  };
}
