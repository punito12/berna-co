// Minimal admin authentication. A single shared password (ADMIN_PASSWORD)
// gates the whole /admin area. On success we set a signed-ish session cookie
// whose value is the sha256 of the password — so the raw password is never
// stored in the browser, and a leaked cookie can't be reversed to the password.
//
// This is intentionally simple (one operator, one password) per the ROADMAP.

import { cookies } from "next/headers";
import { createHash, timingSafeEqual } from "crypto";

export const ADMIN_COOKIE = "berna-admin";

function expectedToken(): string | null {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return null;
  return createHash("sha256").update(password).digest("hex");
}

// Constant-time string compare to avoid leaking length/contents via timing.
function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

// True if the request carries a valid admin session cookie.
export function isAuthenticated(): boolean {
  const token = expectedToken();
  if (!token) return false; // no password configured → no access
  const cookie = cookies().get(ADMIN_COOKIE)?.value;
  if (!cookie) return false;
  return safeEqual(cookie, token);
}

// Verifies a submitted password. Returns the cookie value to set, or null.
export function tokenForPassword(password: string): string | null {
  const expected = process.env.ADMIN_PASSWORD;
  const token = expectedToken();
  if (!expected || !token) return null;
  if (!safeEqual(password, expected)) return null;
  return token;
}

// Whether the server has an ADMIN_PASSWORD configured at all.
export function isAdminConfigured(): boolean {
  return Boolean(process.env.ADMIN_PASSWORD);
}
