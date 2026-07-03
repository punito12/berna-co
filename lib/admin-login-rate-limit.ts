import { createHash } from "crypto";

const MAX_FAILED_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;
const LOCKOUT_MS = 15 * 60 * 1000;
const RATE_LIMIT_LOG_INTERVAL_MS = 60 * 1000;

type LoginAttemptState = {
  failures: number;
  windowStartedAt: number;
  lockedUntil: number;
  lastRateLimitLogAt: number;
};

declare global {
  // eslint-disable-next-line no-var
  var __bernaAdminLoginAttempts: Map<string, LoginAttemptState> | undefined;
}

function store() {
  if (!globalThis.__bernaAdminLoginAttempts) {
    globalThis.__bernaAdminLoginAttempts = new Map();
  }
  return globalThis.__bernaAdminLoginAttempts;
}

function now() {
  return Date.now();
}

function normalizeIp(raw: string | null): string {
  if (!raw) return "unknown";
  return raw.split(",")[0]?.trim() || "unknown";
}

export function getAdminLoginRequestKey(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const vercelIp = request.headers.get("x-vercel-forwarded-for");
  return normalizeIp(forwardedFor || realIp || vercelIp);
}

function anonymizeKey(key: string): string {
  return createHash("sha256").update(key).digest("hex").slice(0, 12);
}

function getState(key: string, at = now()): LoginAttemptState {
  const attempts = store();
  const existing = attempts.get(key);
  if (!existing) {
    const fresh = {
      failures: 0,
      windowStartedAt: at,
      lockedUntil: 0,
      lastRateLimitLogAt: 0,
    };
    attempts.set(key, fresh);
    return fresh;
  }

  if (existing.lockedUntil <= at && at - existing.windowStartedAt > WINDOW_MS) {
    existing.failures = 0;
    existing.windowStartedAt = at;
    existing.lockedUntil = 0;
  }

  return existing;
}

function cleanupExpired(at = now()) {
  const attempts = store();
  for (const [key, state] of attempts.entries()) {
    const staleWindow = at - state.windowStartedAt > WINDOW_MS;
    const unlocked = state.lockedUntil <= at;
    if (staleWindow && unlocked) attempts.delete(key);
  }
}

export function checkAdminLoginRateLimit(key: string) {
  const at = now();
  cleanupExpired(at);
  const state = getState(key, at);
  if (state.lockedUntil > at) {
    const retryAfterSeconds = Math.ceil((state.lockedUntil - at) / 1000);
    return {
      allowed: false,
      retryAfterSeconds,
      lockedUntil: state.lockedUntil,
    };
  }
  return { allowed: true, retryAfterSeconds: 0, lockedUntil: 0 };
}

export function recordAdminLoginFailure(key: string) {
  const at = now();
  const state = getState(key, at);

  if (at - state.windowStartedAt > WINDOW_MS) {
    state.failures = 0;
    state.windowStartedAt = at;
    state.lockedUntil = 0;
  }

  state.failures += 1;

  if (state.failures >= MAX_FAILED_ATTEMPTS) {
    state.lockedUntil = at + LOCKOUT_MS;
  }

  console.warn("[admin login] failed login", {
    keyHash: anonymizeKey(key),
    failures: state.failures,
    locked: state.lockedUntil > at,
  });

  return {
    locked: state.lockedUntil > at,
    retryAfterSeconds: state.lockedUntil > at
      ? Math.ceil((state.lockedUntil - at) / 1000)
      : 0,
  };
}

export function recordAdminLoginSuccess(key: string) {
  store().delete(key);
}

export function logRateLimitedAdminLogin(key: string, lockedUntil: number) {
  const at = now();
  const state = getState(key, at);
  if (at - state.lastRateLimitLogAt < RATE_LIMIT_LOG_INTERVAL_MS) return;
  state.lastRateLimitLogAt = at;
  console.warn("[admin login] rate limited", {
    keyHash: anonymizeKey(key),
    lockedUntil: new Date(lockedUntil).toISOString(),
  });
}

