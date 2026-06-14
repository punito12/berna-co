// Configuración del sistema de entrega (modo de validación + localidades
// manuales + dirección de retiro). Se guarda SIN cambiar el schema: en una fila
// SiteText (key "config.delivery") con el JSON en `value`. Escribimos `value` y
// `valueDraft` juntos, así el publish/discard del CMS nunca afectan esta config.

import { prisma } from "@/lib/db";

// Dirección de retiro por defecto, centralizada (no duplicar en componentes).
export const PICKUP_ADDRESS = "Aristóbulo del Valle 5155, Benavídez";

// Modo de validación de envío a domicilio:
//  - "map":    sistema actual (geocoding + zonas en el mapa).
//  - "manual": selector de localidades configuradas por el admin.
export type DeliveryMode = "map" | "manual";

export type LocalityConfig = {
  name: string;
  enabled: boolean;
  shippingCost: number; // pesos enteros; 0 = sin costo / gratis
};

export type DeliveryConfig = {
  mode: DeliveryMode;
  pickupAddress: string;
  localities: LocalityConfig[];
};

const DELIVERY_CONFIG_KEY = "config.delivery";

// Default: modo "map" (mantiene el comportamiento actual mientras el admin no
// cambie nada) + la dirección de retiro centralizada + sin localidades.
export function defaultDeliveryConfig(): DeliveryConfig {
  return { mode: "map", pickupAddress: PICKUP_ADDRESS, localities: [] };
}

function sanitizeLocalities(input: unknown): LocalityConfig[] {
  if (!Array.isArray(input)) return [];
  const out: LocalityConfig[] = [];
  const seen = new Set<string>();
  for (const raw of input) {
    if (!raw || typeof raw !== "object") continue;
    const r = raw as Record<string, unknown>;
    const name = typeof r.name === "string" ? r.name.trim() : "";
    if (!name) continue;
    const lower = name.toLowerCase();
    if (seen.has(lower)) continue; // sin duplicados (case-insensitive)
    seen.add(lower);
    const cost = Math.max(0, Math.round(Number(r.shippingCost) || 0));
    out.push({ name, enabled: r.enabled !== false, shippingCost: cost });
  }
  return out;
}

export function sanitizeDeliveryConfig(input: unknown): DeliveryConfig {
  const r =
    input && typeof input === "object" && !Array.isArray(input)
      ? (input as Record<string, unknown>)
      : {};
  const mode: DeliveryMode = r.mode === "manual" ? "manual" : "map";
  const pickupAddress =
    typeof r.pickupAddress === "string" && r.pickupAddress.trim()
      ? r.pickupAddress.trim()
      : PICKUP_ADDRESS;
  return { mode, pickupAddress, localities: sanitizeLocalities(r.localities) };
}

// Lee la config desde la DB (con fallback al default; nunca crashea por JSON malo).
export async function getDeliveryConfig(): Promise<DeliveryConfig> {
  const row = await prisma.siteText.findUnique({
    where: { key: DELIVERY_CONFIG_KEY },
    select: { value: true },
  });
  if (!row?.value) return defaultDeliveryConfig();
  try {
    return sanitizeDeliveryConfig(JSON.parse(row.value));
  } catch {
    return defaultDeliveryConfig();
  }
}

// Versión pública para el checkout: solo lo necesario y las localidades HABILITADAS.
export type PublicDeliveryConfig = {
  mode: DeliveryMode;
  pickupAddress: string;
  localities: { name: string }[];
};

export async function getPublicDeliveryConfig(): Promise<PublicDeliveryConfig> {
  const cfg = await getDeliveryConfig();
  return {
    mode: cfg.mode,
    pickupAddress: cfg.pickupAddress,
    localities: cfg.localities
      .filter((l) => l.enabled)
      .map((l) => ({ name: l.name })),
  };
}

// Busca una localidad por nombre (case-insensitive). Devuelve la config completa.
export function findLocality(
  cfg: DeliveryConfig,
  name: string
): LocalityConfig | undefined {
  const lower = name.trim().toLowerCase();
  return cfg.localities.find((l) => l.name.toLowerCase() === lower);
}

// Guarda la config. Escribe value + valueDraft con el mismo JSON, así esta fila
// nunca queda "pendiente" para el publish/discard del CMS.
export async function setDeliveryConfig(input: unknown): Promise<DeliveryConfig> {
  const safe = sanitizeDeliveryConfig(input);
  const json = JSON.stringify(safe);
  await prisma.siteText.upsert({
    where: { key: DELIVERY_CONFIG_KEY },
    update: { value: json, valueDraft: json },
    create: {
      key: DELIVERY_CONFIG_KEY,
      value: json,
      valueDraft: json,
      maxLength: 4000,
      category: "config",
    },
  });
  return safe;
}
