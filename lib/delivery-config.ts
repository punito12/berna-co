// Configuración del sistema de entrega (modo de validación + localidades
// manuales + dirección de retiro). Se guarda SIN cambiar el schema: en una fila
// SiteText (key "config.delivery") con el JSON en `value`. Escribimos `value` y
// `valueDraft` juntos, así el publish/discard del CMS nunca afectan esta config.

import { prisma } from "@/lib/db";
import type { DeliveryOptions } from "@/lib/delivery";

// Dirección de retiro por defecto, centralizada (no duplicar en componentes).
export const PICKUP_ADDRESS = "Aristóbulo del Valle 5155, Benavídez";

// Modo de validación de envío a domicilio:
//  - "map":    sistema actual (geocoding + zonas en el mapa).
//  - "manual": selector de localidades configuradas por el admin.
export type DeliveryMode = "map" | "manual";

// Un rango horario libre dentro de un día (ej. 10:00–14:00). El `label` es lo
// que se muestra/elige en el checkout y lo que se guarda en el pedido.
export type LocalitySlot = { from: string; to: string };

// Un día de entrega de una localidad: el día de la semana (0=Dom..6=Sáb) + sus
// rangos horarios.
export type LocalityScheduleDay = {
  dayOfWeek: number;
  slots: LocalitySlot[];
};

export type LocalityConfig = {
  name: string;
  enabled: boolean;
  shippingCost: number; // pesos enteros; 0 = sin costo / gratis
  // Horario propio de la localidad. Si está vacío, se usa el horario global de
  // DELIVERY como fallback (así las localidades viejas no se rompen).
  schedule: LocalityScheduleDay[];
};

export type DeliveryConfig = {
  mode: DeliveryMode;
  pickupAddress: string;
  localities: LocalityConfig[];
};

// Etiqueta de un slot tal como se muestra/guarda (ej. "10:00–14:00").
export function slotLabel(slot: LocalitySlot): string {
  return `${slot.from}–${slot.to}`;
}

const DELIVERY_CONFIG_KEY = "config.delivery";

export function normalizeLocalityName(name: string): string {
  return name
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .toLowerCase();
}

// Default: modo "map" (mantiene el comportamiento actual mientras el admin no
// cambie nada) + la dirección de retiro centralizada + sin localidades.
export function defaultDeliveryConfig(): DeliveryConfig {
  return { mode: "map", pickupAddress: PICKUP_ADDRESS, localities: [] };
}

// Valida un horario "HH:MM" (24h). Devuelve "" si no es válido.
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;
function cleanTime(v: unknown): string {
  if (typeof v !== "string") return "";
  const t = v.trim();
  return TIME_RE.test(t) ? t : "";
}

function sanitizeSchedule(input: unknown): LocalityScheduleDay[] {
  if (!Array.isArray(input)) return [];
  const byDay = new Map<number, LocalitySlot[]>();
  for (const raw of input) {
    if (!raw || typeof raw !== "object") continue;
    const r = raw as Record<string, unknown>;
    const dow = Math.trunc(Number(r.dayOfWeek));
    if (!Number.isInteger(dow) || dow < 0 || dow > 6) continue;
    const slotsRaw = Array.isArray(r.slots) ? r.slots : [];
    const slots: LocalitySlot[] = [];
    const seenSlots = new Set<string>();
    for (const s of slotsRaw) {
      if (!s || typeof s !== "object") continue;
      const sr = s as Record<string, unknown>;
      const from = cleanTime(sr.from);
      const to = cleanTime(sr.to);
      if (!from || !to) continue;
      const key = `${from}-${to}`;
      if (seenSlots.has(key)) continue;
      seenSlots.add(key);
      slots.push({ from, to });
    }
    if (slots.length === 0) continue; // un día sin horarios no se guarda
    const existing = byDay.get(dow) ?? [];
    byDay.set(dow, [...existing, ...slots]);
  }
  return [...byDay.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([dayOfWeek, slots]) => ({ dayOfWeek, slots }));
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
    const lower = normalizeLocalityName(name);
    if (seen.has(lower)) continue; // sin duplicados (case-insensitive)
    seen.add(lower);
    const cost = Math.max(0, Math.round(Number(r.shippingCost) || 0));
    out.push({
      name,
      enabled: r.enabled !== false,
      shippingCost: cost,
      schedule: sanitizeSchedule(r.schedule),
    });
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

export function localityScheduleOptions(
  locality: LocalityConfig,
  globalOptions: DeliveryOptions
): DeliveryOptions {
  if (locality.schedule.length === 0) return globalOptions;

  const labels = new Set<string>();
  const slots: DeliveryOptions["slots"] = [];
  for (const day of locality.schedule) {
    for (const slot of day.slots) {
      const label = slotLabel(slot);
      if (labels.has(label)) continue;
      labels.add(label);
      slots.push({ id: label, label });
    }
  }

  return {
    enabledWeekdays: locality.schedule.map((day) => day.dayOfWeek),
    slots: slots.sort((a, b) => a.label.localeCompare(b.label)),
  };
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
  localities: {
    name: string;
    schedule: LocalityScheduleDay[];
    scheduleOptions: DeliveryOptions;
    // Costo de envío plano de la localidad (el server sigue siendo la
    // autoridad al crear el pedido; esto es solo para MOSTRARLO antes).
    shippingCost: number;
  }[];
};

export async function getPublicDeliveryConfig(): Promise<PublicDeliveryConfig> {
  const { getDeliveryOptions } = await import("@/lib/delivery");
  const globalOptions = await getDeliveryOptions("DELIVERY");
  const cfg = await getDeliveryConfig();
  return {
    mode: cfg.mode,
    pickupAddress: cfg.pickupAddress,
    localities: cfg.localities
      .filter((l) => l.enabled)
      .map((l) => ({
        name: l.name,
        schedule: l.schedule,
        scheduleOptions: localityScheduleOptions(l, globalOptions),
        shippingCost: Math.max(0, Math.round(l.shippingCost || 0)),
      })),
  };
}

// Busca una localidad por nombre (case-insensitive). Devuelve la config completa.
export function findLocality(
  cfg: DeliveryConfig,
  name: string
): LocalityConfig | undefined {
  const lower = normalizeLocalityName(name);
  return cfg.localities.find((l) => normalizeLocalityName(l.name) === lower);
}

// Guarda la config. Escribe value + valueDraft con el mismo JSON, así esta fila
// nunca queda "pendiente" para el publish/discard del CMS.
export async function setDeliveryConfig(input: unknown): Promise<DeliveryConfig> {
  const safe = sanitizeDeliveryConfig(input);
  const json = JSON.stringify(safe);
  await prisma.siteText.upsert({
    where: { key: DELIVERY_CONFIG_KEY },
    update: { value: json, valueDraft: json, maxLength: 20000 },
    create: {
      key: DELIVERY_CONFIG_KEY,
      value: json,
      valueDraft: json,
      maxLength: 20000,
      category: "config",
    },
  });
  return safe;
}
