import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { findOrCreateCustomerByName } from "@/lib/clients";
import {
  classifyProspect,
  normalizeProspectAddress,
  normalizeProspectName,
  resolveManualScore,
  scoreProspect,
} from "@/lib/prospect-classification";
import { parseGeoPolygon } from "@/lib/prospect-geo";
import {
  DEFAULT_PROSPECT_SCORING_RULES,
  PROSPECT_STATUSES,
  PROSPECT_TIERS,
  PROSPECT_ZONE_KINDS,
  parseProspectScoringRules,
  type ProspectScoringRules,
  type ProspectStatus,
  type ProspectTier,
  type ProspectZoneKind,
} from "@/lib/prospect-types";
import { parseStringArray } from "@/lib/prospect-providers";

export const PROSPECT_TABS = [
  { href: "/admin/potenciales", label: "Prospectos" },
  { href: "/admin/potenciales/zonas", label: "Zonas y scans" },
  { href: "/admin/potenciales/duplicados", label: "Duplicados" },
  { href: "/admin/potenciales/configuracion", label: "Configuración" },
] as const;

export const PROSPECT_STATUS_LABELS: Record<string, string> = {
  NEW: "Nuevo",
  PENDING_REVIEW: "Pendiente de revisión",
  INTERESTING: "Interesante",
  HIGH_PRIORITY: "Alta prioridad",
  VISITED: "Visitado",
  EXISTING_CLIENT: "Cliente existente",
  DISCARDED: "Descartado",
  DUPLICATE: "Duplicado",
  CLOSED: "Cerrado",
};

export const PROSPECT_SCAN_STATUS_LABELS: Record<string, string> = {
  PENDING: "En cola",
  RUNNING: "En curso",
  PAUSED: "Pausado",
  COMPLETED: "Completo",
  PARTIAL_FAILED: "Con fallas",
  LIMIT_REACHED: "Límite alcanzado",
  CANCELLED: "Cancelado",
};

export type ProspectFilters = {
  search?: string;
  minScore?: number;
  maxScore?: number;
  province?: string;
  locality?: string;
  neighborhood?: string;
  tier?: string;
  category?: string;
  source?: string;
  minReviews?: number;
  operatingStatus?: string;
  status?: string;
  onlyNew?: boolean;
  ambiguous?: boolean;
  possibleDuplicates?: boolean;
  excludeExistingClients?: boolean;
  excludeReviewed?: boolean;
  includeExcluded?: boolean;
  sort?: string;
  page?: number;
  pageSize?: number;
};

function buildProspectWhere(filters: ProspectFilters): Prisma.ProspectStoreWhereInput {
  const and: Prisma.ProspectStoreWhereInput[] = [];
  if (!filters.includeExcluded) and.push({ isExcluded: false });
  if (filters.search?.trim()) {
    const search = filters.search.trim();
    and.push({
      OR: [
        { name: { contains: search, mode: "insensitive" } },
        { address: { contains: search, mode: "insensitive" } },
        { locality: { contains: search, mode: "insensitive" } },
      ],
    });
  }
  if (Number.isFinite(filters.minScore)) and.push({ score: { gte: filters.minScore } });
  if (Number.isFinite(filters.maxScore)) and.push({ score: { lte: filters.maxScore } });
  if (filters.province) and.push({ province: filters.province });
  if (filters.locality) and.push({ locality: filters.locality });
  if (filters.neighborhood) and.push({ neighborhood: filters.neighborhood });
  if (filters.tier) and.push({ zone: { tier: filters.tier } });
  if (filters.category) and.push({ categoryKey: filters.category });
  if (filters.source) and.push({ sources: { some: { provider: filters.source } } });
  if (Number.isFinite(filters.minReviews)) {
    and.push({ reviewCount: { gte: filters.minReviews } });
  }
  if (filters.operatingStatus) and.push({ operatingStatus: filters.operatingStatus });
  if (filters.status) and.push({ status: filters.status });
  if (filters.onlyNew) and.push({ status: "NEW" });
  if (filters.ambiguous) and.push({ ambiguousClassification: true });
  if (filters.possibleDuplicates) {
    and.push({
      OR: [
        { duplicateAsFirst: { some: { status: "PENDING" } } },
        { duplicateAsSecond: { some: { status: "PENDING" } } },
      ],
    });
  }
  if (filters.excludeExistingClients) {
    and.push({ linkedCustomerId: null, status: { not: "EXISTING_CLIENT" } });
  }
  if (filters.excludeReviewed) and.push({ reviewedAt: null });
  return and.length ? { AND: and } : {};
}

function prospectOrderBy(sort?: string): Prisma.ProspectStoreOrderByWithRelationInput[] {
  if (sort === "score-asc") return [{ score: "asc" }, { name: "asc" }];
  if (sort === "name") return [{ name: "asc" }];
  if (sort === "reviews") return [{ reviewCount: { sort: "desc", nulls: "last" } }, { score: "desc" }];
  if (sort === "recent") return [{ firstDiscoveredAt: "desc" }];
  return [{ score: "desc" }, { firstDiscoveredAt: "desc" }];
}

export async function listProspects(filters: ProspectFilters = {}) {
  const where = buildProspectWhere(filters);
  const pageSize = Math.max(10, Math.min(100, filters.pageSize ?? 25));
  const page = Math.max(1, filters.page ?? 1);
  const select = {
    id: true,
    name: true,
    address: true,
    neighborhood: true,
    locality: true,
    province: true,
    latitude: true,
    longitude: true,
    categoryKey: true,
    score: true,
    scoreExplanation: true,
    reviewCount: true,
    rating: true,
    operatingStatus: true,
    status: true,
    lastVerifiedAt: true,
    firstDiscoveredAt: true,
    ambiguousClassification: true,
    linkedCustomerId: true,
    zone: { select: { id: true, name: true, tier: true, polygon: true } },
    sources: { select: { provider: true, listingUrl: true } },
    _count: {
      select: {
        duplicateAsFirst: { where: { status: "PENDING" } },
        duplicateAsSecond: { where: { status: "PENDING" } },
      },
    },
  } satisfies Prisma.ProspectStoreSelect;
  const [total, rows, mapRows] = await Promise.all([
    prisma.prospectStore.count({ where }),
    prisma.prospectStore.findMany({
      where,
      select,
      orderBy: prospectOrderBy(filters.sort),
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.prospectStore.findMany({
      where,
      select: {
        id: true,
        name: true,
        address: true,
        latitude: true,
        longitude: true,
        score: true,
        status: true,
        categoryKey: true,
      },
      orderBy: prospectOrderBy(filters.sort),
      take: 500,
    }),
  ]);
  return {
    rows,
    mapRows,
    total,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getProspectDashboard() {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1_000);
  const scoringRow = await prisma.prospectScoringConfig.findUnique({
    where: { id: "singleton" },
  });
  const scoringRules =
    parseProspectScoringRules(scoringRow?.config) ??
    DEFAULT_PROSPECT_SCORING_RULES;
  const [
    total,
    newCount,
    highPriority,
    zonesScanned,
    lastScan,
    byStatus,
    byCategory,
    byTier,
    duplicateCount,
    recent,
  ] = await Promise.all([
    prisma.prospectStore.count({ where: { isExcluded: false } }),
    prisma.prospectStore.count({
      where: { isExcluded: false, firstDiscoveredAt: { gte: sevenDaysAgo } },
    }),
    prisma.prospectStore.count({
      where: {
        isExcluded: false,
        OR: [
          { score: { gte: scoringRules.highPriorityFrom } },
          { status: "HIGH_PRIORITY" },
        ],
      },
    }),
    prisma.prospectScan.groupBy({
      by: ["zoneId"],
      where: { requestCount: { gt: 0 } },
    }),
    prisma.prospectScan.findFirst({
      where: { requestCount: { gt: 0 } },
      orderBy: { updatedAt: "desc" },
      select: { id: true, status: true, updatedAt: true },
    }),
    prisma.prospectStore.groupBy({
      by: ["status"],
      where: { isExcluded: false },
      _count: { _all: true },
    }),
    prisma.prospectStore.groupBy({
      by: ["categoryKey"],
      where: { isExcluded: false },
      _count: { _all: true },
      orderBy: { _count: { categoryKey: "desc" } },
      take: 8,
    }),
    prisma.prospectZone.findMany({
      select: {
        tier: true,
        _count: { select: { prospects: { where: { isExcluded: false } } } },
      },
    }),
    prisma.prospectDuplicateCandidate.count({ where: { status: "PENDING" } }),
    prisma.prospectStore.findMany({
      where: { isExcluded: false },
      orderBy: { firstDiscoveredAt: "desc" },
      take: 6,
      select: {
        id: true,
        name: true,
        locality: true,
        score: true,
        firstDiscoveredAt: true,
      },
    }),
  ]);
  const tierCounts = new Map<string, number>();
  for (const zone of byTier) {
    tierCounts.set(zone.tier, (tierCounts.get(zone.tier) ?? 0) + zone._count.prospects);
  }
  return {
    total,
    newCount,
    highPriority,
    zonesScanned: zonesScanned.length,
    lastScan,
    duplicateCount,
    byStatus,
    byCategory,
    byTier: [...tierCounts.entries()].map(([tier, count]) => ({ tier, count })),
    recent,
  };
}

export async function getProspectFilterOptions() {
  const [provinces, localities, neighborhoods, categories, zones] =
    await Promise.all([
      prisma.prospectStore.findMany({
        distinct: ["province"],
        where: { province: { not: null } },
        select: { province: true },
        orderBy: { province: "asc" },
      }),
      prisma.prospectStore.findMany({
        distinct: ["locality"],
        where: { locality: { not: null } },
        select: { locality: true },
        orderBy: { locality: "asc" },
      }),
      prisma.prospectStore.findMany({
        distinct: ["neighborhood"],
        where: { neighborhood: { not: null } },
        select: { neighborhood: true },
        orderBy: { neighborhood: "asc" },
      }),
      prisma.prospectStore.findMany({
        distinct: ["categoryKey"],
        select: { categoryKey: true },
        orderBy: { categoryKey: "asc" },
      }),
      prisma.prospectZone.findMany({
        select: { id: true, name: true, tier: true, polygon: true },
        orderBy: { name: "asc" },
      }),
    ]);
  return {
    provinces: provinces.flatMap((row) => (row.province ? [row.province] : [])),
    localities: localities.flatMap((row) => (row.locality ? [row.locality] : [])),
    neighborhoods: neighborhoods.flatMap((row) =>
      row.neighborhood ? [row.neighborhood] : []
    ),
    categories: categories.map((row) => row.categoryKey),
    zones,
  };
}

export async function getProspectMapCoverage() {
  const scans = await prisma.prospectScan.findMany({
    where: { requestCount: { gt: 0 } },
    orderBy: { createdAt: "desc" },
    distinct: ["zoneId"],
    select: { id: true, zoneId: true },
  });
  if (scans.length === 0) return [];
  const cells = await prisma.prospectScanCell.findMany({
    where: { scanId: { in: scans.map((scan) => scan.id) } },
    select: {
      scanId: true,
      pointIndex: true,
      latitude: true,
      longitude: true,
      radiusMeters: true,
      status: true,
    },
    orderBy: [{ scanId: "asc" }, { pointIndex: "asc" }],
    take: 10_000,
  });
  const seen = new Set<string>();
  return cells.filter((cell) => {
    const key = `${cell.scanId}:${cell.pointIndex}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function getProspectDetail(id: string) {
  const prospect = await prisma.prospectStore.findUnique({
    where: { id },
    include: {
      zone: true,
      linkedCustomer: { select: { id: true, name: true, type: true } },
      sources: { orderBy: { lastSeenAt: "desc" } },
      statusHistory: { orderBy: { createdAt: "desc" } },
      discoveryScan: { select: { id: true, status: true, createdAt: true } },
      duplicateAsFirst: {
        where: { status: "PENDING" },
        include: { second: true },
      },
      duplicateAsSecond: {
        where: { status: "PENDING" },
        include: { first: true },
      },
    },
  });
  if (!prospect) throw new Error("El prospecto no existe.");
  return prospect;
}

export async function updateProspect(
  id: string,
  input: {
    status?: string;
    notes?: string;
    manualCategory?: string | null;
    manualScore?: number | null;
    manualScoreReason?: string | null;
  }
) {
  const current = await prisma.prospectStore.findUnique({ where: { id } });
  if (!current) throw new Error("El prospecto no existe.");
  const status =
    input.status === undefined ? current.status : input.status.toUpperCase();
  if (!PROSPECT_STATUSES.includes(status as ProspectStatus)) {
    throw new Error("Estado interno inválido.");
  }
  let manualScore = input.manualScore;
  if (manualScore !== undefined && manualScore !== null) {
    manualScore = resolveManualScore(
      current.score,
      Number(manualScore),
      input.manualScoreReason ?? current.manualScoreReason
    );
  }
  return prisma.$transaction(async (tx) => {
    const updated = await tx.prospectStore.update({
      where: { id },
      data: {
        status,
        notes: input.notes === undefined ? undefined : input.notes.trim(),
        manualCategory:
          input.manualCategory === undefined
            ? undefined
            : input.manualCategory?.trim() || null,
        categoryKey:
          input.manualCategory?.trim() || current.categoryKey,
        manualScore,
        score: manualScore ?? undefined,
        manualScoreReason:
          input.manualScoreReason === undefined
            ? undefined
            : input.manualScoreReason?.trim() || null,
        classificationSource: input.manualCategory ? "MANUAL" : undefined,
        ambiguousClassification: input.manualCategory ? false : undefined,
        reviewedAt: status === "NEW" ? current.reviewedAt : new Date(),
      },
    });
    if (status !== current.status) {
      await tx.prospectStatusHistory.create({
        data: {
          prospectId: id,
          fromStatus: current.status,
          toStatus: status,
          reason: input.manualScoreReason?.trim() || "Actualización manual.",
        },
      });
    }
    return updated;
  });
}

export async function bulkUpdateProspectStatus(
  ids: string[],
  statusInput: string
) {
  const uniqueIds = [...new Set(ids.filter(Boolean))];
  const status = statusInput.toUpperCase();
  if (uniqueIds.length === 0 || uniqueIds.length > 200) {
    throw new Error("Seleccioná entre 1 y 200 prospectos.");
  }
  if (!PROSPECT_STATUSES.includes(status as ProspectStatus)) {
    throw new Error("Estado interno inválido.");
  }
  return prisma.$transaction(async (tx) => {
    const rows = await tx.prospectStore.findMany({
      where: { id: { in: uniqueIds } },
      select: { id: true, status: true },
    });
    await tx.prospectStore.updateMany({
      where: { id: { in: uniqueIds } },
      data: { status, reviewedAt: status === "NEW" ? undefined : new Date() },
    });
    await tx.prospectStatusHistory.createMany({
      data: rows
        .filter((row) => row.status !== status)
        .map((row) => ({
          prospectId: row.id,
          fromStatus: row.status,
          toStatus: status,
          reason: "Cambio de estado masivo.",
        })),
    });
    return { count: rows.length };
  });
}

async function loadScoringRules(): Promise<ProspectScoringRules> {
  const row = await prisma.prospectScoringConfig.findUnique({
    where: { id: "singleton" },
  });
  return parseProspectScoringRules(row?.config);
}

export async function recalculateProspectScore(id: string) {
  const prospect = await prisma.prospectStore.findUnique({
    where: { id },
    include: { zone: true },
  });
  if (!prospect) throw new Error("El prospecto no existe.");
  if (!prospect.zone) throw new Error("Asigná una zona comercial antes de recalcular.");
  const rules = await loadScoringRules();
  const types = parseStringArray(prospect.rawCategories);
  const computed = classifyProspect(
    { name: prospect.name, types, primaryType: types[0] ?? null },
    rules
  );
  const manualRule = prospect.manualCategory
    ? rules.compatibility.find((rule) => rule.key === prospect.manualCategory)
    : null;
  const classification = manualRule
    ? {
        categoryKey: manualRule.key,
        categoryLabel: manualRule.label,
        compatibilityPoints: manualRule.score,
        excluded: false,
        ambiguous: false,
        confidence: 1,
        detectedKeywords: [],
        reason: "Categoría definida manualmente.",
      }
    : computed;
  const score = scoreProspect(
    {
      name: prospect.name,
      tier: prospect.zone.tier as ProspectTier,
      zoneKind: prospect.zone.kind as ProspectZoneKind,
      classification,
      operatingStatus: prospect.operatingStatus,
      reviewCount: prospect.reviewCount,
    },
    rules
  );
  return prisma.prospectStore.update({
    where: { id },
    data: {
      categoryKey: classification.categoryKey,
      score: prospect.manualScore ?? score.score,
      scoreBreakdown: JSON.stringify(score.breakdown),
      scoreExplanation: score.explanation,
      isExcluded: score.excluded,
      ambiguousClassification: classification.ambiguous,
      classificationConfidence: classification.confidence,
    },
  });
}

export async function convertProspectToCustomer(id: string) {
  const prospect = await prisma.prospectStore.findUnique({ where: { id } });
  if (!prospect) throw new Error("El prospecto no existe.");
  if (prospect.linkedCustomerId) {
    return prisma.prospectStore.update({
      where: { id },
      data: { status: "EXISTING_CLIENT" },
    });
  }
  const result = await findOrCreateCustomerByName({
    name: prospect.name,
    type: "MAYORISTA",
    source: "MANUAL",
  });
  return prisma.$transaction(async (tx) => {
    const updated = await tx.prospectStore.update({
      where: { id },
      data: {
        linkedCustomerId: result.customer.id,
        status: "EXISTING_CLIENT",
        reviewedAt: new Date(),
      },
    });
    await tx.prospectStatusHistory.create({
      data: {
        prospectId: id,
        fromStatus: prospect.status,
        toStatus: "EXISTING_CLIENT",
        reason: result.created
          ? "Convertido en cliente mayorista."
          : "Vinculado con un cliente existente por nombre normalizado.",
      },
    });
    return updated;
  });
}

export async function mergeProspectDuplicate(
  candidateId: string,
  primaryId: string
) {
  const candidate = await prisma.prospectDuplicateCandidate.findUnique({
    where: { id: candidateId },
  });
  if (!candidate || candidate.status !== "PENDING") {
    throw new Error("El candidato duplicado ya no está pendiente.");
  }
  if (![candidate.firstId, candidate.secondId].includes(primaryId)) {
    throw new Error("El prospecto principal no pertenece a este par.");
  }
  const duplicateId =
    candidate.firstId === primaryId ? candidate.secondId : candidate.firstId;
  return prisma.$transaction(async (tx) => {
    const duplicate = await tx.prospectStore.findUniqueOrThrow({
      where: { id: duplicateId },
    });
    await tx.prospectSource.updateMany({
      where: { prospectId: duplicateId },
      data: { prospectId: primaryId },
    });
    await tx.prospectStore.update({
      where: { id: duplicateId },
      data: {
        status: "DUPLICATE",
        notes: [duplicate.notes, `Fusionado en ${primaryId}.`]
          .filter(Boolean)
          .join("\n"),
        reviewedAt: new Date(),
      },
    });
    await tx.prospectDuplicateCandidate.updateMany({
      where: {
        OR: [
          { firstId: duplicateId },
          { secondId: duplicateId },
        ],
        status: "PENDING",
      },
      data: { status: "MERGED", reviewedAt: new Date() },
    });
    await tx.prospectStatusHistory.create({
      data: {
        prospectId: duplicateId,
        fromStatus: duplicate.status,
        toStatus: "DUPLICATE",
        reason: `Fusionado manualmente en ${primaryId}.`,
      },
    });
    return { primaryId, duplicateId };
  });
}

export async function dismissProspectDuplicate(candidateId: string) {
  return prisma.prospectDuplicateCandidate.update({
    where: { id: candidateId },
    data: { status: "DISMISSED", reviewedAt: new Date() },
  });
}

export async function listProspectDuplicates() {
  return prisma.prospectDuplicateCandidate.findMany({
    where: { status: "PENDING" },
    include: {
      first: { include: { zone: true, sources: true } },
      second: { include: { zone: true, sources: true } },
    },
    orderBy: { similarity: "desc" },
  });
}

export async function listProspectZonesAndScans() {
  const [zones, queries, scans] = await Promise.all([
    prisma.prospectZone.findMany({
      include: { queries: { select: { queryId: true } }, _count: { select: { prospects: true, scans: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.prospectSearchQuery.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
    }),
    prisma.prospectScan.findMany({
      include: {
        zone: { select: { name: true } },
        _count: {
          select: {
            cells: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
  ]);
  const scanIds = scans.map((scan) => scan.id);
  const cellGroups = scanIds.length
    ? await prisma.prospectScanCell.groupBy({
        by: ["scanId", "status"],
        where: { scanId: { in: scanIds } },
        _count: { _all: true },
      })
    : [];
  return { zones, queries, scans, cellGroups };
}

export async function createProspectZone(input: {
  name: string;
  kind: string;
  tier: string;
  polygon: unknown;
  gridSpacingMeters?: number;
  searchRadiusMeters?: number;
  defaultRequestLimit?: number;
  queryIds?: string[];
  active?: boolean;
  scanEnabled?: boolean;
  notes?: string;
}) {
  return saveProspectZone(null, input);
}

export async function updateProspectZone(
  id: string,
  input: Parameters<typeof createProspectZone>[0]
) {
  return saveProspectZone(id, input);
}

async function saveProspectZone(
  id: string | null,
  input: Parameters<typeof createProspectZone>[0]
) {
  const name = input.name.trim();
  if (!name) throw new Error("Poné un nombre para la zona.");
  if (!PROSPECT_TIERS.includes(input.tier as ProspectTier)) {
    throw new Error("Tier comercial inválido.");
  }
  if (!PROSPECT_ZONE_KINDS.includes(input.kind as ProspectZoneKind)) {
    throw new Error("Tipo de zona inválido.");
  }
  const polygonRaw = JSON.stringify(input.polygon);
  if (!parseGeoPolygon(polygonRaw)) throw new Error("Dibujá un polígono válido.");
  const gridSpacingMeters = Math.round(Number(input.gridSpacingMeters ?? 700));
  const searchRadiusMeters = Math.round(Number(input.searchRadiusMeters ?? 500));
  const defaultRequestLimit = Math.round(Number(input.defaultRequestLimit ?? 250));
  if (gridSpacingMeters < 100 || gridSpacingMeters > 5_000) {
    throw new Error("La separación debe estar entre 100 y 5.000 metros.");
  }
  if (searchRadiusMeters < 100 || searchRadiusMeters > 50_000) {
    throw new Error("El radio debe estar entre 100 y 50.000 metros.");
  }
  if (defaultRequestLimit < 1 || defaultRequestLimit > 10_000) {
    throw new Error("El límite debe estar entre 1 y 10.000 requests.");
  }
  const queryIds = [...new Set(input.queryIds ?? [])];
  const existingQueries = await prisma.prospectSearchQuery.count({
    where: { id: { in: queryIds }, active: true },
  });
  if (queryIds.length && existingQueries !== queryIds.length) {
    throw new Error("Alguna consulta seleccionada no existe o está inactiva.");
  }
  return prisma.$transaction(async (tx) => {
    const zone = id
      ? await tx.prospectZone.update({
          where: { id },
          data: {
            name,
            kind: input.kind,
            tier: input.tier,
            polygon: polygonRaw,
            gridSpacingMeters,
            searchRadiusMeters,
            defaultRequestLimit,
            active: input.active ?? true,
            scanEnabled: input.scanEnabled ?? true,
            notes: input.notes?.trim() ?? "",
          },
        })
      : await tx.prospectZone.create({
          data: {
            name,
            kind: input.kind,
            tier: input.tier,
            polygon: polygonRaw,
            gridSpacingMeters,
            searchRadiusMeters,
            defaultRequestLimit,
            active: input.active ?? true,
            scanEnabled: input.scanEnabled ?? true,
            notes: input.notes?.trim() ?? "",
          },
        });
    if (id) {
      await tx.prospectZoneQuery.deleteMany({ where: { zoneId: zone.id } });
    }
    if (queryIds.length) {
      await tx.prospectZoneQuery.createMany({
        data: queryIds.map((queryId) => ({ zoneId: zone.id, queryId })),
        skipDuplicates: true,
      });
    }
    return zone;
  });
}

export async function deleteProspectZone(id: string) {
  const scanCount = await prisma.prospectScan.count({ where: { zoneId: id } });
  if (scanCount > 0) {
    throw new Error("No se puede borrar una zona con historial de scans. Desactivala.");
  }
  return prisma.prospectZone.delete({ where: { id } });
}

export async function getProspectConfiguration() {
  const [row, queries] = await Promise.all([
    prisma.prospectScoringConfig.findUnique({ where: { id: "singleton" } }),
    prisma.prospectSearchQuery.findMany({
      orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
    }),
  ]);
  return {
    rules: parseProspectScoringRules(row?.config),
    queries,
  };
}

export async function saveProspectScoringRules(input: unknown) {
  if (!input || typeof input !== "object") {
    throw new Error("La configuración de scoring es inválida.");
  }
  const raw = JSON.stringify(input);
  const rules = parseProspectScoringRules(raw);
  if (!rules.compatibility.length) {
    throw new Error("Cargá al menos una categoría de compatibilidad.");
  }
  for (const tier of PROSPECT_TIERS) {
    const points = rules.tierPoints[tier];
    if (!Number.isFinite(points) || points < 0 || points > 55) {
      throw new Error(`El puntaje del Tier ${tier} debe estar entre 0 y 55.`);
    }
  }
  for (const category of rules.compatibility) {
    if (!category.key || !category.label || category.score < 0 || category.score > 30) {
      throw new Error("Cada categoría necesita clave, nombre y puntaje de 0 a 30.");
    }
  }
  for (const [sku, usage] of Object.entries(rules.googlePlacesMonthlyUsage)) {
    if (!Number.isFinite(usage) || usage < 0 || usage > 100_000_000) {
      throw new Error(
        `El uso mensual asumido de ${sku} debe ser un entero no negativo.`
      );
    }
    rules.googlePlacesMonthlyUsage[sku as keyof typeof rules.googlePlacesMonthlyUsage] =
      Math.round(usage);
  }
  return prisma.prospectScoringConfig.upsert({
    where: { id: "singleton" },
    create: { id: "singleton", config: JSON.stringify(rules) },
    update: { config: JSON.stringify(rules) },
  });
}

export async function saveProspectQuery(
  id: string | null,
  input: {
    label: string;
    provider?: string;
    mode: string;
    value: string;
    placeTypes?: string[];
    categoryFamily?: string;
    active?: boolean;
    sortOrder?: number;
  }
) {
  const label = input.label.trim();
  const value = input.value.trim();
  const provider = input.provider?.trim().toUpperCase() || "GOOGLE";
  const mode = input.mode.trim().toUpperCase();
  if (!label || !value) throw new Error("La consulta necesita nombre y valor.");
  if (!["GOOGLE", "GREEN_LIFE"].includes(provider)) {
    throw new Error("Proveedor inválido.");
  }
  if (!["TYPE", "TEXT", "DIRECTORY"].includes(mode)) {
    throw new Error("Modo de consulta inválido.");
  }
  const placeTypes = [...new Set((input.placeTypes ?? []).map((type) => type.trim()).filter(Boolean))];
  if (mode === "TYPE" && placeTypes.length === 0) {
    throw new Error("Una consulta por tipo necesita al menos un Google Place type.");
  }
  const data = {
    label,
    provider,
    mode,
    value,
    placeTypes: JSON.stringify(placeTypes),
    categoryFamily: input.categoryFamily?.trim() || "GENERAL",
    active: input.active ?? true,
    sortOrder: Math.round(Number(input.sortOrder ?? 0)),
  };
  return id
    ? prisma.prospectSearchQuery.update({ where: { id }, data })
    : prisma.prospectSearchQuery.create({ data });
}

export async function disableProspectQuery(id: string) {
  return prisma.prospectSearchQuery.update({
    where: { id },
    data: { active: false },
  });
}

function csvCell(value: string | number | null | undefined): string {
  const raw = String(value ?? "");
  return /[",;\n]/.test(raw) ? `"${raw.replace(/"/g, '""')}"` : raw;
}

export async function exportProspectsCsv(filters: ProspectFilters): Promise<string> {
  const rows = await prisma.prospectStore.findMany({
    where: buildProspectWhere(filters),
    include: { zone: true, sources: true },
    orderBy: prospectOrderBy(filters.sort),
  });
  const lines = [
    [
      "Nombre",
      "Dirección",
      "Barrio",
      "Localidad",
      "Provincia",
      "Tier",
      "Categoría",
      "Score",
      "Motivo principal",
      "Reseñas",
      "Rating",
      "Fuentes",
      "Estado interno",
      "Última verificación",
      "Google Maps",
    ],
    ...rows.map((row) => [
      row.name,
      row.address,
      row.neighborhood,
      row.locality,
      row.province,
      row.zone?.tier,
      row.categoryKey,
      row.score,
      row.scoreExplanation,
      row.reviewCount,
      row.rating,
      [...new Set(row.sources.map((source) => source.provider))].join(", "),
      PROSPECT_STATUS_LABELS[row.status] ?? row.status,
      row.lastVerifiedAt.toISOString(),
      row.googleMapsUrl,
    ]),
  ];
  return "\uFEFF" + lines.map((line) => line.map(csvCell).join(";")).join("\n");
}

export { DEFAULT_PROSPECT_SCORING_RULES };
