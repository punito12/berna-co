import { haversineMeters, type GeoPoint } from "@/lib/prospect-geo";
import {
  normalizeProspectAddress,
  normalizeProspectName,
} from "@/lib/prospect-classification";

function levenshtein(a: string, b: string): number {
  const prev = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    let diagonal = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const above = prev[j];
      prev[j] = Math.min(
        prev[j] + 1,
        prev[j - 1] + 1,
        diagonal + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
      diagonal = above;
    }
  }
  return prev[b.length];
}

export function nameSimilarity(a: string, b: string): number {
  const left = normalizeProspectName(a);
  const right = normalizeProspectName(b);
  if (!left || !right) return 0;
  if (left === right) return 1;
  const distance = levenshtein(left, right);
  const characterScore = 1 - distance / Math.max(left.length, right.length);
  const leftTokens = new Set(left.split(" "));
  const rightTokens = new Set(right.split(" "));
  const intersection = [...leftTokens].filter((token) => rightTokens.has(token)).length;
  const union = new Set([...leftTokens, ...rightTokens]).size;
  const tokenScore = union === 0 ? 0 : intersection / union;
  return Math.max(0, Math.min(1, characterScore * 0.6 + tokenScore * 0.4));
}

export type DedupeCandidate = {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  googlePlaceId?: string | null;
};

export type DedupeDecision =
  | { kind: "EXACT"; prospectId: string; reasons: string[] }
  | { kind: "POSSIBLE"; prospectId: string; similarity: number; reasons: string[] }
  | { kind: "NONE" };

export function decideProspectDuplicate(
  incoming: Omit<DedupeCandidate, "id">,
  existing: DedupeCandidate[]
): DedupeDecision {
  if (incoming.googlePlaceId) {
    const samePlace = existing.find(
      (candidate) => candidate.googlePlaceId === incoming.googlePlaceId
    );
    if (samePlace) {
      return {
        kind: "EXACT",
        prospectId: samePlace.id,
        reasons: ["Mismo Google Place ID"],
      };
    }
  }

  const normalizedAddress = normalizeProspectAddress(incoming.address);
  for (const candidate of existing) {
    const similarity = nameSimilarity(incoming.name, candidate.name);
    if (
      normalizedAddress &&
      normalizedAddress === normalizeProspectAddress(candidate.address) &&
      similarity >= 0.72
    ) {
      return {
        kind: "EXACT",
        prospectId: candidate.id,
        reasons: ["Misma dirección normalizada", `Nombre ${Math.round(similarity * 100)}% similar`],
      };
    }
  }

  let best: { candidate: DedupeCandidate; similarity: number; distance: number } | null = null;
  const point: GeoPoint = {
    latitude: incoming.latitude,
    longitude: incoming.longitude,
  };
  for (const candidate of existing) {
    const distance = haversineMeters(point, candidate);
    if (distance > 120) continue;
    const similarity = nameSimilarity(incoming.name, candidate.name);
    if (similarity < 0.64) continue;
    if (!best || similarity > best.similarity) best = { candidate, similarity, distance };
  }
  if (best) {
    return {
      kind: "POSSIBLE",
      prospectId: best.candidate.id,
      similarity: best.similarity,
      reasons: [
        `A ${Math.round(best.distance)} m`,
        `Nombre ${Math.round(best.similarity * 100)}% similar`,
      ],
    };
  }
  return { kind: "NONE" };
}

export function matchExistingCustomerByName(
  name: string,
  customers: { id: string; name: string }[]
): string | null {
  const normalized = normalizeProspectName(name);
  return (
    customers.find(
      (customer) => normalizeProspectName(customer.name) === normalized
    )?.id ?? null
  );
}
