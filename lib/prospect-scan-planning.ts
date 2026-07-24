import type { GeoPoint } from "@/lib/prospect-geo";

export type ScanPlanningQuery = { id: string };

export function buildProspectScanCellSpecs<T extends ScanPlanningQuery>(
  points: GeoPoint[],
  queries: T[],
  radiusMeters: number
) {
  return points.flatMap((point, pointIndex) =>
    queries.map((query) => ({
      key: `${pointIndex}:${query.id}`,
      pointIndex,
      latitude: point.latitude,
      longitude: point.longitude,
      radiusMeters,
      queryId: query.id,
    }))
  );
}

export function isProspectRequestLimitReached(
  requestCount: number,
  requestLimit: number
): boolean {
  return requestCount >= requestLimit;
}

export function prospectCellFailureTransition(
  attemptsBeforeCurrent: number,
  now = new Date(),
  maxAttempts = 3
): { status: "PENDING" | "FAILED"; nextAttemptAt: Date | null } {
  const attemptsAfterCurrent = attemptsBeforeCurrent + 1;
  if (attemptsAfterCurrent >= maxAttempts) {
    return { status: "FAILED", nextAttemptAt: null };
  }
  const retryDelayMinutes = 2 ** Math.max(0, attemptsBeforeCurrent);
  return {
    status: "PENDING",
    nextAttemptAt: new Date(now.getTime() + retryDelayMinutes * 60_000),
  };
}

