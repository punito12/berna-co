// Admin business logic: reading/updating orders, products and delivery config.
// Each mutating function is small and validates its input. The API routes that
// call these first check isAuthenticated().

import { prisma } from "@/lib/db";

// ---- Orders ----

export const ORDER_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "READY",
  "DELIVERED",
  "CANCELLED",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendiente",
  CONFIRMED: "Confirmado",
  READY: "Listo",
  DELIVERED: "Entregado",
  CANCELLED: "Cancelado",
};

// Lists orders, optionally filtered by status and/or a single scheduled day.
export async function listOrders(filters: {
  status?: string;
  date?: string; // yyyy-mm-dd, matches scheduledDate's day
}) {
  const where: Record<string, unknown> = {};

  if (filters.status && ORDER_STATUSES.includes(filters.status as OrderStatus)) {
    where.status = filters.status;
  }

  if (filters.date) {
    const start = new Date(`${filters.date}T00:00:00`);
    const end = new Date(`${filters.date}T00:00:00`);
    end.setDate(end.getDate() + 1);
    if (!Number.isNaN(start.getTime())) {
      where.scheduledDate = { gte: start, lt: end };
    }
  }

  return prisma.order.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { items: { include: { product: true } } },
  });
}

export async function getOrder(id: string) {
  return prisma.order.findUnique({
    where: { id },
    include: { items: { include: { product: true } } },
  });
}

export async function updateOrderStatus(id: string, status: string) {
  if (!ORDER_STATUSES.includes(status as OrderStatus)) {
    throw new Error("Estado inválido.");
  }
  await prisma.order.update({ where: { id }, data: { status } });
}

// ---- Products ----

export async function listProductsForAdmin() {
  return prisma.product.findMany({ orderBy: { name: "asc" } });
}

// Updates availability and the price of each empanado for one product.
// `prices` is a map { breadcrumb: pesos }. We also store a sensible default
// `price` (the first/traditional one) so anything without a specific price
// still has a fallback.
export async function updateProduct(
  id: string,
  data: {
    prices: Record<string, number>;
    stocks: Record<string, number>;
    available: boolean;
  }
) {
  // Validate prices per empanado.
  const cleanedPrices: Record<string, number> = {};
  for (const [breadcrumb, raw] of Object.entries(data.prices ?? {})) {
    const value = Math.round(Number(raw));
    if (!Number.isFinite(value) || value < 0) {
      throw new Error("Precio inválido.");
    }
    cleanedPrices[breadcrumb] = value;
  }

  // Validate stock per empanado.
  const cleanedStocks: Record<string, number> = {};
  for (const [breadcrumb, raw] of Object.entries(data.stocks ?? {})) {
    const value = Math.round(Number(raw));
    if (!Number.isFinite(value) || value < 0) {
      throw new Error("Stock inválido.");
    }
    cleanedStocks[breadcrumb] = value;
  }

  // Default price = the product's own breadcrumbs order, first available > 0,
  // else the traditional, else 0. Total stock = sum of the per-empanado stocks
  // (kept in sync as a convenient fallback for any legacy reader).
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) throw new Error("Producto no encontrado.");
  const order: string[] = (() => {
    try {
      const b = JSON.parse(product.availableBreadcrumbs);
      return Array.isArray(b) ? b : [];
    } catch {
      return [];
    }
  })();
  const defaultPrice =
    order.map((b) => cleanedPrices[b]).find((v) => typeof v === "number" && v > 0) ??
    cleanedPrices[order[0]] ??
    0;
  const totalStock = Object.values(cleanedStocks).reduce((a, b) => a + b, 0);

  await prisma.product.update({
    where: { id },
    data: {
      price: defaultPrice,
      prices: JSON.stringify(cleanedPrices),
      stock: totalStock,
      stocks: JSON.stringify(cleanedStocks),
      available: Boolean(data.available),
    },
  });
}

// ---- Delivery config ----

export async function getDeliveryConfig() {
  const [days, slots] = await Promise.all([
    prisma.availableDeliveryDay.findMany({ orderBy: { dayOfWeek: "asc" } }),
    prisma.deliverySlot.findMany(),
  ]);
  return { days, slots };
}

export async function setDayAvailability(id: string, available: boolean) {
  await prisma.availableDeliveryDay.update({
    where: { id },
    data: { available: Boolean(available) },
  });
}

export async function setSlotAvailability(id: string, available: boolean) {
  await prisma.deliverySlot.update({
    where: { id },
    data: { available: Boolean(available) },
  });
}

// ---- Zones ----

// Creates a zone with just a name; codes/localities/days are added afterwards.
export async function createZone(name: string) {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("La zona necesita un nombre.");
  await prisma.zone.create({
    data: {
      name: trimmed,
      postalCodes: "[]",
      localities: "[]",
      daysOfWeek: "[]",
    },
  });
}

// Updates a zone's name, postal codes, localities, weekdays and active flag.
export async function updateZone(
  id: string,
  data: {
    name: string;
    postalCodes: string[];
    localities: string[];
    daysOfWeek: number[];
    active: boolean;
  }
) {
  const name = data.name.trim();
  if (!name) throw new Error("La zona necesita un nombre.");

  // Clean postal codes: keep the 4-digit number, unique. Reject non-numeric.
  const codeSet = new Set<string>();
  for (const raw of data.postalCodes ?? []) {
    const m = String(raw).trim().match(/\d{4}/);
    if (!m) {
      throw new Error(`Código postal inválido: "${raw}". Usá 4 dígitos.`);
    }
    codeSet.add(m[0]);
  }
  const postalCodes = Array.from(codeSet).sort();

  // Clean localities: trim, drop empties, de-duplicate (case-insensitive).
  const seen = new Set<string>();
  const localities: string[] = [];
  for (const raw of data.localities ?? []) {
    const value = raw.trim();
    if (!value) continue;
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    localities.push(value);
  }

  // Clean weekdays: keep 0..6, unique, sorted.
  const days = Array.from(
    new Set((data.daysOfWeek ?? []).filter((d) => d >= 0 && d <= 6))
  ).sort((a, b) => a - b);

  await prisma.zone.update({
    where: { id },
    data: {
      name,
      postalCodes: JSON.stringify(postalCodes),
      localities: JSON.stringify(localities),
      daysOfWeek: JSON.stringify(days),
      active: Boolean(data.active),
    },
  });
}

export async function deleteZone(id: string) {
  await prisma.zone.delete({ where: { id } });
}
