import { createHash, timingSafeEqual } from "crypto";
import { isAuthenticated } from "@/lib/auth";

export const CMS_PREVIEW_PARAM = "preview";

function expectedPreviewToken(): string | null {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return null;
  return createHash("sha256")
    .update(`berna-cms-preview:${password}`)
    .digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

export function getCmsPreviewToken(): string | null {
  return expectedPreviewToken();
}

export function isCmsPreviewRequest(token?: string | null): boolean {
  const expected = expectedPreviewToken();
  if (!expected || !token) return false;
  return isAuthenticated() && safeEqual(token, expected);
}
