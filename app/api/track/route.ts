import { NextResponse } from "next/server";
import { recordEvent, sanitizeTrackInput, type TrackInput } from "@/lib/analytics";

// Ingesta de eventos de analytics del ecommerce público. SIN auth (es tráfico
// anónimo del storefront). Diseñada para no fallar nunca de cara al cliente:
// cualquier error se traga y se responde 204 igual, así el tracking jamás
// bloquea la navegación ni el checkout. Acepta un evento o un array (batch).
export const runtime = "nodejs";

const MAX_BODY_BYTES = 16_384;
const MAX_BATCH_EVENTS = 20;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_EVENTS = 120;

type RateEntry = { count: number; resetAt: number };

const globalForAnalytics = globalThis as typeof globalThis & {
  __bernaAnalyticsRate?: Map<string, RateEntry>;
};

const rateMap =
  globalForAnalytics.__bernaAnalyticsRate ??
  (globalForAnalytics.__bernaAnalyticsRate = new Map<string, RateEntry>());

function clientKey(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const ip = forwardedFor?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();
  return ip || realIp || "unknown";
}

function isRateLimited(key: string, cost: number): boolean {
  const now = Date.now();
  const current = rateMap.get(key);
  if (!current || current.resetAt <= now) {
    rateMap.set(key, { count: cost, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  current.count += cost;
  return current.count > RATE_LIMIT_MAX_EVENTS;
}

function parseEvents(raw: string): unknown[] | null {
  try {
    const body = JSON.parse(raw);
    return Array.isArray(body) ? body : [body];
  } catch {
    return null;
  }
}

function isTrackInput(event: TrackInput | null): event is TrackInput {
  return event !== null;
}

export async function POST(request: Request) {
  let raw = "";
  try {
    raw = await request.text();
  } catch {
    return new NextResponse(null, { status: 204 });
  }

  if (new TextEncoder().encode(raw).length > MAX_BODY_BYTES) {
    return new NextResponse(null, { status: 413 });
  }

  const parsed = parseEvents(raw);
  if (!parsed) {
    return new NextResponse(null, { status: 204 });
  }

  const events = parsed
    .slice(0, MAX_BATCH_EVENTS)
    .map(sanitizeTrackInput)
    .filter(isTrackInput);
  if (events.length === 0) {
    return new NextResponse(null, { status: 204 });
  }

  if (isRateLimited(clientKey(request), events.length)) {
    return new NextResponse(null, { status: 429 });
  }

  try {
    await Promise.all(events.map((event) => recordEvent(event)));
  } catch {
    // Silencioso a propósito: el tracking nunca debe romper el cliente ni generar
    // ruido por payloads/bots. recordEvent ya loguea fallas inesperadas con throttle.
  }
  // 204 sin cuerpo: respuesta mínima para sendBeacon/keepalive.
  return new NextResponse(null, { status: 204 });
}
