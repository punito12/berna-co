import { createHash, randomUUID } from "node:crypto";
import { prisma } from "@/lib/db";
import { generateSearchGrid, parseGeoPolygon } from "@/lib/prospect-geo";
import {
  classifyProspect,
  normalizeProspectAddress,
  normalizeProspectName,
  scoreProspect,
} from "@/lib/prospect-classification";
import { decideProspectDuplicate } from "@/lib/prospect-dedupe";
import { matchExistingCustomerByName } from "@/lib/prospect-dedupe";
import { GooglePlacesProvider } from "@/lib/google-places";
import {
  GreenLifeProvider,
  parseStringArray,
  type ProspectDiscoveryProvider,
  type ProspectProviderPlace,
} from "@/lib/prospect-providers";
import {
  DEFAULT_PROSPECT_SCORING_RULES,
  parseProspectScoringRules,
  type ProspectScoringRules,
  type ProspectTier,
  type ProspectZoneKind,
} from "@/lib/prospect-types";
import { estimateGoogleDiscoveryCost } from "@/lib/google-places-pricing";
import {
  buildProspectScanCellSpecs,
  isProspectRequestLimitReached,
  prospectCellFailureTransition,
} from "@/lib/prospect-scan-planning";
import { isPointInPolygon } from "@/lib/zones";

// Una celda puede consumir varios reintentos HTTP. Un lote unitario mantiene
// cada invocación dentro del límite de 60 s del cron incluso ante timeouts.
const MAX_CELLS_PER_BATCH = 1;
const LOCK_MILLISECONDS = 90_000;
const MAX_CELL_ATTEMPTS = 3;

type QuerySnapshot = {
  id: string;
  label: string;
  provider: string;
  mode: string;
  value: string;
  placeTypes: string[];
};

function json(value: unknown): string {
  return JSON.stringify(value);
}

function querySnapshot(query: {
  id: string;
  label: string;
  provider: string;
  mode: string;
  value: string;
  placeTypes: string;
}): QuerySnapshot {
  return {
    id: query.id,
    label: query.label,
    provider: query.provider,
    mode: query.mode,
    value: query.value,
    placeTypes: parseStringArray(query.placeTypes),
  };
}

export async function previewProspectScan(
  zoneId: string,
  options?: {
    queryIds?: string[];
    requestLimit?: number;
    resultLimitPerRequest?: number;
  }
) {
  const zone = await prisma.prospectZone.findUnique({
    where: { id: zoneId },
    include: {
      queries: {
        include: { query: true },
      },
    },
  });
  if (!zone) throw new Error("La zona comercial no existe.");
  const polygon = parseGeoPolygon(zone.polygon);
  if (!polygon) throw new Error("La zona no tiene un polígono válido.");
  const selected = zone.queries
    .map((row) => row.query)
    .filter(
      (query) =>
        query.active &&
        (!options?.queryIds?.length || options.queryIds.includes(query.id))
    );
  if (selected.length === 0) {
    throw new Error("Seleccioná al menos una consulta activa para esta zona.");
  }
  const points = generateSearchGrid(polygon, zone.gridSpacingMeters);
  const estimatedRequests = points.length * selected.length;
  const scoringRow = await prisma.prospectScoringConfig.findUnique({
    where: { id: "singleton" },
  });
  const rules = parseProspectScoringRules(scoringRow?.config);
  const requestLimit = Math.max(
    1,
    Math.min(10_000, options?.requestLimit ?? zone.defaultRequestLimit)
  );
  const effectiveRequests = Math.min(estimatedRequests, requestLimit);
  const resultLimitPerRequest = Math.max(
    1,
    Math.min(20, Number(options?.resultLimitPerRequest ?? 20))
  );
  const pricing = estimateGoogleDiscoveryCost({
    theoreticalRequests: estimatedRequests,
    cappedRequests: effectiveRequests,
    resultLimitPerRequest,
    monthlyUsage: rules.googlePlacesMonthlyUsage,
  });
  return {
    zoneId,
    pointCount: points.length,
    queryCount: selected.length,
    estimatedRequests,
    effectiveRequests,
    requestLimit,
    resultLimitPerRequest,
    estimatedCostUsdCents: Math.round(
      pricing.estimatedCostAfterFreeUsd * 100
    ),
    estimatedMaxCostUsdCents: Math.round(
      pricing.maxCostBeforeFreeUsd * 100
    ),
    includeActivityData: false,
    pricing,
    queries: selected.map(querySnapshot),
    points,
  };
}

export async function createProspectScan(input: {
  zoneId: string;
  queryIds?: string[];
  requestLimit?: number;
  resultLimitPerRequest?: number;
}) {
  const preview = await previewProspectScan(input.zoneId, input);
  const resultLimitPerRequest = Math.max(
    1,
    Math.min(20, Number(input.resultLimitPerRequest ?? 20))
  );
  const queryById = new Map(preview.queries.map((query) => [query.id, query]));
  const zone = await prisma.prospectZone.findUnique({
    where: { id: input.zoneId },
    select: { searchRadiusMeters: true, scanEnabled: true, active: true },
  });
  if (!zone?.active || !zone.scanEnabled) {
    throw new Error("La zona está inactiva o tiene los scans deshabilitados.");
  }

  return prisma.$transaction(async (tx) => {
    const scan = await tx.prospectScan.create({
      data: {
        zoneId: input.zoneId,
        status: "PENDING",
        querySnapshot: json([...queryById.values()]),
        includeActivityData: false,
        requestLimit: preview.requestLimit,
        resultLimitPerRequest,
        estimatedRequests: preview.estimatedRequests,
        estimatedDetailRequests: preview.pricing.maximumUniquePlaces,
        estimatedCostUsdCents: preview.estimatedCostUsdCents,
        estimatedMaxCostUsdCents: preview.estimatedMaxCostUsdCents,
      },
    });
    const cellSpecs = buildProspectScanCellSpecs(
      preview.points,
      preview.queries,
      zone.searchRadiusMeters
    );
    await tx.prospectScanCell.createMany({
      data: cellSpecs.map((cell) => ({
        ...cell,
        scanId: scan.id,
        querySnapshot: json(queryById.get(cell.queryId)),
      })),
      skipDuplicates: true,
    });
    return scan;
  });
}

function providerFor(key: string): ProspectDiscoveryProvider {
  if (key === "GOOGLE") return new GooglePlacesProvider();
  if (key === "GREEN_LIFE") return new GreenLifeProvider();
  throw new Error(`Proveedor desconocido: ${key}.`);
}

function sourceFingerprint(
  provider: string,
  place: ProspectProviderPlace
): string {
  const identity =
    place.externalId ||
    place.listingUrl ||
    `${normalizeProspectName(place.name)}|${normalizeProspectAddress(place.address)}`;
  return `${provider}:${createHash("sha256").update(identity).digest("hex")}`;
}

async function ingestProviderPlace(args: {
  place: ProspectProviderPlace;
  query: QuerySnapshot;
  scanId: string;
  cellId: string;
  zone: { id: string; tier: string; kind: string };
  rules: ProspectScoringRules;
  customers: { id: string; name: string }[];
}): Promise<"NEW" | "UPDATED" | "DUPLICATE"> {
  const { place, query, scanId, cellId, zone, rules, customers } = args;
  const classification = classifyProspect(
    {
      name: place.name,
      primaryType: place.primaryType,
      types: place.types,
      queryValue: query.value,
    },
    rules
  );
  const score = scoreProspect(
    {
      name: place.name,
      tier: zone.tier as ProspectTier,
      zoneKind: zone.kind as ProspectZoneKind,
      classification,
      operatingStatus: place.operatingStatus,
      reviewCount: place.reviewCount,
    },
    rules
  );
  const normalizedName = normalizeProspectName(place.name);
  const normalizedAddress = normalizeProspectAddress(place.address);
  const fingerprint = sourceFingerprint(query.provider, place);

  const exactBySource = await prisma.prospectSource.findUnique({
    where: { sourceFingerprint: fingerprint },
    select: { prospectId: true },
  });
  const exactByPlaceId = place.externalId
    ? await prisma.prospectStore.findUnique({
        where: { googlePlaceId: place.externalId },
        select: { id: true },
      })
    : null;
  let prospectId = exactBySource?.prospectId ?? exactByPlaceId?.id ?? null;
  let duplicateCandidateId: string | null = null;
  let duplicateSimilarity = 0;
  let duplicateReasons: string[] = [];

  if (!prospectId) {
    const latitudeMargin = 0.002;
    const longitudeMargin = 0.0025;
    const candidates = await prisma.prospectStore.findMany({
      where: {
        OR: [
          { normalizedAddress },
          {
            latitude: {
              gte: place.latitude - latitudeMargin,
              lte: place.latitude + latitudeMargin,
            },
            longitude: {
              gte: place.longitude - longitudeMargin,
              lte: place.longitude + longitudeMargin,
            },
          },
        ],
      },
      select: {
        id: true,
        name: true,
        address: true,
        latitude: true,
        longitude: true,
        googlePlaceId: true,
      },
      take: 50,
    });
    const decision = decideProspectDuplicate(
      {
        name: place.name,
        address: place.address,
        latitude: place.latitude,
        longitude: place.longitude,
        googlePlaceId: place.externalId,
      },
      candidates
    );
    if (decision.kind === "EXACT") {
      prospectId = decision.prospectId;
    } else if (decision.kind === "POSSIBLE") {
      duplicateCandidateId = decision.prospectId;
      duplicateSimilarity = decision.similarity;
      duplicateReasons = decision.reasons;
    }
  }

  const rawCategories = json(place.types);
  const detectedKeywords = json([
    ...new Set([
      ...classification.detectedKeywords,
      ...score.premiumKeywords,
    ]),
  ]);
  const data = {
    name: place.name,
    normalizedName,
    address: place.address,
    normalizedAddress,
    neighborhood: place.neighborhood,
    locality: place.locality,
    province: place.province,
    country: place.country || "Argentina",
    latitude: place.latitude,
    longitude: place.longitude,
    zoneId: zone.id,
    googleMapsUrl: place.mapsUrl,
    categoryKey: classification.categoryKey,
    rawCategories,
    detectedKeywords,
    operatingStatus: place.operatingStatus,
    permanentlyClosed: place.permanentlyClosed,
    rating: place.rating,
    reviewCount: place.reviewCount,
    score: score.score,
    scoreBreakdown: json(score.breakdown),
    scoreExplanation: score.explanation,
    isExcluded: score.excluded,
    ambiguousClassification: classification.ambiguous,
    classificationConfidence: classification.confidence,
    lastVerifiedAt: new Date(),
    existingClientCandidateId: matchExistingCustomerByName(place.name, customers),
  };

  if (prospectId) {
    await prisma.$transaction(async (tx) => {
      const current = await tx.prospectStore.findUniqueOrThrow({
        where: { id: prospectId as string },
        select: { manualCategory: true, manualScore: true },
      });
      await tx.prospectStore.update({
        where: { id: prospectId as string },
        data: {
          ...data,
          categoryKey: current.manualCategory ?? data.categoryKey,
          score: current.manualScore ?? data.score,
          googlePlaceId: place.externalId ?? undefined,
        },
      });
      await tx.prospectSource.upsert({
        where: { sourceFingerprint: fingerprint },
        create: {
          prospectId: prospectId as string,
          provider: query.provider,
          sourceFingerprint: fingerprint,
          externalId: place.externalId,
          listingUrl: place.listingUrl,
          rawCategory: place.primaryType,
          rawData: json(place.rawData),
          scanId,
          cellId,
        },
        update: {
          prospectId: prospectId as string,
          lastSeenAt: new Date(),
          scanId,
          cellId,
          rawData: json(place.rawData),
        },
      });
    });
    return "UPDATED";
  }

  const created = await prisma.$transaction(async (tx) => {
    const prospect = await tx.prospectStore.create({
      data: {
        ...data,
        googlePlaceId: place.externalId,
        discoveryScanId: scanId,
        status: place.permanentlyClosed
          ? "CLOSED"
          : score.excluded
            ? "DISCARDED"
            : "NEW",
      },
    });
    await tx.prospectSource.create({
      data: {
        prospectId: prospect.id,
        provider: query.provider,
        sourceFingerprint: fingerprint,
        externalId: place.externalId,
        listingUrl: place.listingUrl,
        rawCategory: place.primaryType,
        rawData: json(place.rawData),
        scanId,
        cellId,
      },
    });
    await tx.prospectStatusHistory.create({
      data: {
        prospectId: prospect.id,
        toStatus: prospect.status,
        reason: "Descubierto por barrido geográfico.",
      },
    });
    return prospect;
  });

  if (duplicateCandidateId) {
    const [firstId, secondId] = [created.id, duplicateCandidateId].sort();
    await prisma.prospectDuplicateCandidate.upsert({
      where: { firstId_secondId: { firstId, secondId } },
      create: {
        firstId,
        secondId,
        similarity: duplicateSimilarity,
        reasons: json(duplicateReasons),
      },
      update: {
        similarity: duplicateSimilarity,
        reasons: json(duplicateReasons),
        status: "PENDING",
        reviewedAt: null,
      },
    });
    return "DUPLICATE";
  }
  return "NEW";
}

async function appendScanError(
  scanId: string,
  error: { cellId: string; message: string; at: string }
) {
  const scan = await prisma.prospectScan.findUnique({
    where: { id: scanId },
    select: { errorLog: true },
  });
  let current: unknown[] = [];
  try {
    const parsed = JSON.parse(scan?.errorLog ?? "[]");
    if (Array.isArray(parsed)) current = parsed;
  } catch {
    current = [];
  }
  const next = [...current.slice(-99), error];
  await prisma.prospectScan.update({
    where: { id: scanId },
    data: { errorLog: json(next) },
  });
}

async function processCell(args: {
  scan: {
    id: string;
    requestLimit: number;
    resultLimitPerRequest: number;
    requestCount: number;
    zone: { id: string; tier: string; kind: string; polygon: string };
  };
  cell: {
    id: string;
    querySnapshot: string;
    latitude: number;
    longitude: number;
    radiusMeters: number;
    attempts: number;
  };
  rules: ProspectScoringRules;
  customers: { id: string; name: string }[];
}) {
  const { scan, cell, rules, customers } = args;
  if (isProspectRequestLimitReached(scan.requestCount, scan.requestLimit)) {
    return "LIMIT_REACHED" as const;
  }
  const query = JSON.parse(cell.querySnapshot) as QuerySnapshot;
  const provider = providerFor(query.provider);

  await prisma.$transaction([
    prisma.prospectScanCell.update({
      where: { id: cell.id },
      data: {
        status: "RUNNING",
        attempts: { increment: 1 },
        requestCount: { increment: 1 },
        startedAt: new Date(),
        error: null,
      },
    }),
    prisma.prospectScan.update({
      where: { id: scan.id },
      data: {
        status: "RUNNING",
        startedAt: scan.requestCount === 0 ? new Date() : undefined,
        requestCount: { increment: 1 },
      },
    }),
  ]);

  try {
    const idResponse = await provider.searchIds({
      center: { latitude: cell.latitude, longitude: cell.longitude },
      radiusMeters: cell.radiusMeters,
      resultLimit: scan.resultLimitPerRequest,
      query,
    });
    const externalIds = [...new Set(idResponse.externalIds)];
    const [existingSources, existingStores] = await Promise.all([
      prisma.prospectSource.findMany({
        where: {
          provider: query.provider,
          externalId: { in: externalIds },
        },
        select: { externalId: true, prospectId: true },
      }),
      query.provider === "GOOGLE"
        ? prisma.prospectStore.findMany({
            where: { googlePlaceId: { in: externalIds } },
            select: { id: true, googlePlaceId: true },
          })
        : Promise.resolve([]),
    ]);
    const existingProspectByExternalId = new Map<string, string>();
    for (const source of existingSources) {
      if (source.externalId) {
        existingProspectByExternalId.set(source.externalId, source.prospectId);
      }
    }
    for (const store of existingStores) {
      if (store.googlePlaceId) {
        existingProspectByExternalId.set(store.googlePlaceId, store.id);
      }
    }
    const now = new Date();
    await Promise.all(
      [...existingProspectByExternalId.entries()].map(
        ([externalId, prospectId]) =>
          prisma.prospectSource.upsert({
            where: {
              sourceFingerprint: `${query.provider}:${createHash("sha256")
                .update(externalId)
                .digest("hex")}`,
            },
            create: {
              prospectId,
              provider: query.provider,
              sourceFingerprint: `${query.provider}:${createHash("sha256")
                .update(externalId)
                .digest("hex")}`,
              externalId,
              rawCategory: query.value,
              rawData: json({ id: externalId }),
              scanId: scan.id,
              cellId: cell.id,
            },
            update: {
              lastSeenAt: now,
              scanId: scan.id,
              cellId: cell.id,
            },
          })
      )
    );
    const existingProspectIds = [
      ...new Set(existingProspectByExternalId.values()),
    ];
    if (existingProspectIds.length > 0) {
      await prisma.prospectStore.updateMany({
        where: { id: { in: existingProspectIds } },
        data: { lastVerifiedAt: now },
      });
    }
    const idsToDetail = externalIds.filter(
      (externalId) => !existingProspectByExternalId.has(externalId)
    );
    if (idsToDetail.length > 0) {
      await prisma.$transaction([
        prisma.prospectScanCell.update({
          where: { id: cell.id },
          data: { detailRequestCount: { increment: idsToDetail.length } },
        }),
        prisma.prospectScan.update({
          where: { id: scan.id },
          data: { detailRequestCount: { increment: idsToDetail.length } },
        }),
      ]);
    }
    const response = await provider.fetchDetails(idsToDetail);
    let newProspects = 0;
    let updatedProspects = 0;
    let duplicatesDetected = 0;
    const zonePolygon = parseGeoPolygon(scan.zone.polygon);
    if (!zonePolygon) {
      throw new Error("El scan quedó asociado a un polígono inválido.");
    }
    for (const place of response.places) {
      // Text Search usa un sesgo circular, no una restricción poligonal. Filtrar
      // nuevamente evita incorporar comercios fuera de la zona seleccionada.
      if (!isPointInPolygon(place.latitude, place.longitude, zonePolygon)) {
        continue;
      }
      const result = await ingestProviderPlace({
        place,
        query,
        scanId: scan.id,
        cellId: cell.id,
        zone: scan.zone,
        rules,
        customers,
      });
      if (result === "NEW") newProspects += 1;
      if (result === "UPDATED") updatedProspects += 1;
      if (result === "DUPLICATE") {
        newProspects += 1;
        duplicatesDetected += 1;
      }
    }
    if (response.failures.length > 0) {
      if (newProspects || updatedProspects || duplicatesDetected) {
        await prisma.prospectScan.update({
          where: { id: scan.id },
          data: {
            newProspects: { increment: newProspects },
            updatedProspects: { increment: updatedProspects },
            duplicatesDetected: { increment: duplicatesDetected },
          },
        });
      }
      throw new Error(
        `${response.failures.length} Place Details no pudieron completarse: ` +
          response.failures
            .slice(0, 3)
            .map((failure) => failure.message)
            .join(" · ")
      );
    }
    await prisma.$transaction([
      prisma.prospectScanCell.update({
        where: { id: cell.id },
        data: {
          status: "COMPLETED",
          resultCount: externalIds.length,
          completedAt: new Date(),
        },
      }),
      prisma.prospectScan.update({
        where: { id: scan.id },
        data: {
          successfulRequests: { increment: 1 },
          newProspects: { increment: newProspects },
          updatedProspects: { increment: updatedProspects },
          duplicatesDetected: { increment: duplicatesDetected },
        },
      }),
    ]);
    return "COMPLETED" as const;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error desconocido del proveedor.";
    const transition = prospectCellFailureTransition(
      cell.attempts,
      new Date(),
      MAX_CELL_ATTEMPTS
    );
    const finalFailure = transition.status === "FAILED";
    await prisma.$transaction([
      prisma.prospectScanCell.update({
        where: { id: cell.id },
        data: {
          status: transition.status,
          error: message.slice(0, 1_000),
          nextAttemptAt: transition.nextAttemptAt,
          completedAt: finalFailure ? new Date() : null,
        },
      }),
      prisma.prospectScan.update({
        where: { id: scan.id },
        data: { failedRequests: { increment: 1 } },
      }),
    ]);
    await appendScanError(scan.id, {
      cellId: cell.id,
      message,
      at: new Date().toISOString(),
    });
    return finalFailure ? ("FAILED" as const) : ("RETRY" as const);
  }
}

async function finalizeScan(scanId: string) {
  const scan = await prisma.prospectScan.findUniqueOrThrow({
    where: { id: scanId },
    select: { requestCount: true, requestLimit: true, status: true },
  });
  if (scan.status === "PAUSED" || scan.status === "CANCELLED") return;
  const [pending, failed] = await Promise.all([
    prisma.prospectScanCell.count({
      where: { scanId, status: { in: ["PENDING", "RUNNING"] } },
    }),
    prisma.prospectScanCell.count({ where: { scanId, status: "FAILED" } }),
  ]);
  const reachedLimit = scan.requestCount >= scan.requestLimit && pending > 0;
  if (reachedLimit) {
    await prisma.prospectScan.update({
      where: { id: scanId },
      data: { status: "LIMIT_REACHED", lockToken: null, lockExpiresAt: null },
    });
  } else if (pending === 0) {
    await prisma.prospectScan.update({
      where: { id: scanId },
      data: {
        status: failed > 0 ? "PARTIAL_FAILED" : "COMPLETED",
        completedAt: new Date(),
        lockToken: null,
        lockExpiresAt: null,
      },
    });
  } else {
    await prisma.prospectScan.update({
      where: { id: scanId },
      data: { lockToken: null, lockExpiresAt: null },
    });
  }
}

export async function processNextProspectScanBatch(
  maxCells = MAX_CELLS_PER_BATCH
): Promise<{ processed: number; scanId: string | null; status: string }> {
  const now = new Date();
  const candidate = await prisma.prospectScan.findFirst({
    where: {
      status: { in: ["PENDING", "RUNNING"] },
      OR: [{ lockExpiresAt: null }, { lockExpiresAt: { lt: now } }],
    },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  if (!candidate) return { processed: 0, scanId: null, status: "IDLE" };
  const lockToken = randomUUID();
  const claimed = await prisma.prospectScan.updateMany({
    where: {
      id: candidate.id,
      status: { in: ["PENDING", "RUNNING"] },
      OR: [{ lockExpiresAt: null }, { lockExpiresAt: { lt: now } }],
    },
    data: {
      lockToken,
      lockExpiresAt: new Date(Date.now() + LOCK_MILLISECONDS),
    },
  });
  if (claimed.count === 0) {
    return { processed: 0, scanId: candidate.id, status: "LOCKED" };
  }

  const [scan, scoringRow, customers] = await Promise.all([
    prisma.prospectScan.findUniqueOrThrow({
      where: { id: candidate.id },
      include: {
        zone: { select: { id: true, tier: true, kind: true, polygon: true } },
      },
    }),
    prisma.prospectScoringConfig.findUnique({ where: { id: "singleton" } }),
    prisma.customer.findMany({ select: { id: true, name: true } }),
  ]);
  const rules =
    parseProspectScoringRules(scoringRow?.config) ??
    DEFAULT_PROSPECT_SCORING_RULES;
  let processed = 0;
  let requestCount = scan.requestCount;

  try {
    for (let index = 0; index < Math.max(1, Math.min(10, maxCells)); index += 1) {
      if (requestCount >= scan.requestLimit) break;
      const cell = await prisma.prospectScanCell.findFirst({
        where: {
          scanId: scan.id,
          status: "PENDING",
          OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: new Date() } }],
        },
        orderBy: [{ pointIndex: "asc" }, { createdAt: "asc" }],
        select: {
          id: true,
          querySnapshot: true,
          latitude: true,
          longitude: true,
          radiusMeters: true,
          attempts: true,
        },
      });
      if (!cell) break;
      await processCell({
        scan: { ...scan, requestCount },
        cell,
        rules,
        customers,
      });
      processed += 1;
      requestCount += 1;
    }
  } finally {
    await finalizeScan(scan.id);
  }
  const current = await prisma.prospectScan.findUniqueOrThrow({
    where: { id: scan.id },
    select: { status: true },
  });
  return { processed, scanId: scan.id, status: current.status };
}

export async function changeProspectScanStatus(
  scanId: string,
  action: "PAUSE" | "RESUME" | "CANCEL" | "RETRY_FAILED"
) {
  const scan = await prisma.prospectScan.findUnique({ where: { id: scanId } });
  if (!scan) throw new Error("El scan no existe.");
  if (action === "PAUSE") {
    if (!["PENDING", "RUNNING"].includes(scan.status)) {
      throw new Error("Este scan no se puede pausar.");
    }
    return prisma.prospectScan.update({
      where: { id: scanId },
      data: { status: "PAUSED", lockToken: null, lockExpiresAt: null },
    });
  }
  if (action === "CANCEL") {
    if (["COMPLETED", "CANCELLED"].includes(scan.status)) {
      throw new Error("Este scan ya terminó.");
    }
    return prisma.prospectScan.update({
      where: { id: scanId },
      data: { status: "CANCELLED", completedAt: new Date() },
    });
  }
  if (action === "RETRY_FAILED") {
    await prisma.prospectScanCell.updateMany({
      where: { scanId, status: "FAILED" },
      data: {
        status: "PENDING",
        attempts: 0,
        error: null,
        nextAttemptAt: null,
        completedAt: null,
      },
    });
  }
  if (!["PAUSED", "PARTIAL_FAILED", "LIMIT_REACHED"].includes(scan.status) && action === "RESUME") {
    throw new Error("Este scan no se puede reanudar.");
  }
  if (scan.requestCount >= scan.requestLimit) {
    throw new Error("Aumentá el límite de requests antes de reanudar.");
  }
  return prisma.prospectScan.update({
    where: { id: scanId },
    data: {
      status: "PENDING",
      completedAt: null,
      lockToken: null,
      lockExpiresAt: null,
    },
  });
}

export async function increaseProspectScanRequestLimit(
  scanId: string,
  requestLimit: number
) {
  const limit = Math.round(Number(requestLimit));
  if (!Number.isFinite(limit) || limit < 1 || limit > 10_000) {
    throw new Error("El límite debe estar entre 1 y 10.000 requests.");
  }
  const scan = await prisma.prospectScan.findUnique({ where: { id: scanId } });
  if (!scan) throw new Error("El scan no existe.");
  if (limit < scan.requestCount) {
    throw new Error("El límite no puede ser menor que los requests ya usados.");
  }
  return prisma.prospectScan.update({
    where: { id: scanId },
    data: { requestLimit: limit },
  });
}
