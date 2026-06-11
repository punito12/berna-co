import { createHmac, timingSafeEqual } from "crypto";

type SignatureParts = {
  ts: string;
  v1: string;
};

export type MercadoPagoWebhookSignatureResult =
  | { configured: false; valid: true }
  | { configured: true; valid: true }
  | { configured: true; valid: false; reason: string };

export function isMercadoPagoWebhookSignatureConfigured(): boolean {
  return Boolean(process.env.MERCADOPAGO_WEBHOOK_SECRET);
}

export function buildMercadoPagoManifest({
  dataId,
  requestId,
  ts,
}: {
  dataId: string;
  requestId: string;
  ts: string;
}): string {
  return `id:${dataId};request-id:${requestId};ts:${ts};`;
}

export function signMercadoPagoManifest({
  manifest,
  secret,
}: {
  manifest: string;
  secret: string;
}): string {
  return createHmac("sha256", secret).update(manifest).digest("hex");
}

export function validateMercadoPagoWebhookSignature({
  dataId,
  requestId,
  signatureHeader,
  secret = process.env.MERCADOPAGO_WEBHOOK_SECRET,
}: {
  dataId: string;
  requestId: string | null;
  signatureHeader: string | null;
  secret?: string;
}): MercadoPagoWebhookSignatureResult {
  if (!secret) return { configured: false, valid: true };

  if (!dataId) {
    return { configured: true, valid: false, reason: "missing-data-id" };
  }
  if (!requestId) {
    return { configured: true, valid: false, reason: "missing-request-id" };
  }

  const parts = parseSignatureHeader(signatureHeader);
  if (!parts) {
    return { configured: true, valid: false, reason: "invalid-header" };
  }

  const manifest = buildMercadoPagoManifest({
    dataId,
    requestId,
    ts: parts.ts,
  });
  const expected = signMercadoPagoManifest({ manifest, secret });
  if (!safeHexEqual(expected, parts.v1)) {
    return { configured: true, valid: false, reason: "signature-mismatch" };
  }

  return { configured: true, valid: true };
}

function parseSignatureHeader(header: string | null): SignatureParts | null {
  if (!header) return null;
  const parts = new Map<string, string>();
  for (const chunk of header.split(",")) {
    const [rawKey, ...rawValue] = chunk.trim().split("=");
    const key = rawKey?.trim();
    const value = rawValue.join("=").trim();
    if (key && value) parts.set(key, value);
  }
  const ts = parts.get("ts");
  const v1 = parts.get("v1");
  return ts && v1 ? { ts, v1 } : null;
}

function safeHexEqual(expectedHex: string, receivedHex: string): boolean {
  if (!/^[a-f0-9]+$/i.test(receivedHex)) return false;
  const expected = Buffer.from(expectedHex, "hex");
  const received = Buffer.from(receivedHex, "hex");
  if (expected.length !== received.length) return false;
  return timingSafeEqual(expected, received);
}
