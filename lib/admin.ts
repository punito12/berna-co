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
    include: {
      items: { include: { product: true } },
      customer: { include: { barrio: true } },
    },
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

export const PRODUCT_CATEGORIES = ["CARNE", "POLLO", "CERDO", "VEGANO"];
export const BREADCRUMB_CODES = ["TRADITIONAL", "INTEGRAL", "KETO"];

// Everything the admin can set on a product. Images is up to 2 photo paths per
// empanado (the gallery shown on the detail page); prices/stocks are keyed by
// empanado too.
export type ProductInput = {
  name: string;
  description: string;
  category: string;
  weightGrams: number;
  isNew: boolean;
  available: boolean;
  breadcrumbs: string[]; // which empanados the product offers
  disabledBreadcrumbs?: string[]; // empanados temporarily turned off
  costPerKg?: number; // cost per kg (pesos), for profitability
  prices: Record<string, number>; // pesos, by empanado
  stocks: Record<string, number>; // units, by empanado
  images: Record<string, string[]>; // up to 2 photo paths, by empanado
};

// Turns a name into a URL-safe slug (no accents, spaces → dashes).
function slugify(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Ensures the slug is unique, appending -2, -3… when needed. `exceptId` skips
// the product being updated so it doesn't clash with itself.
async function uniqueSlug(base: string, exceptId?: string): Promise<string> {
  const root = base || "producto";
  let candidate = root;
  let n = 2;
  // Loop until no other product uses this slug.
  while (true) {
    const existing = await prisma.product.findUnique({
      where: { slug: candidate },
    });
    if (!existing || existing.id === exceptId) return candidate;
    candidate = `${root}-${n++}`;
  }
}

// Validates and normalizes a product payload into DB column values.
function buildProductData(input: ProductInput, normalizedSlug?: string) {
  const name = input.name.trim();
  if (!name) throw new Error("El producto necesita un nombre.");

  const description = input.description.trim();

  if (!PRODUCT_CATEGORIES.includes(input.category)) {
    throw new Error("Categoría inválida.");
  }

  const weightGrams = Math.round(Number(input.weightGrams));
  if (!Number.isFinite(weightGrams) || weightGrams <= 0) {
    throw new Error("El peso (en gramos) debe ser mayor a 0.");
  }

  // Breadcrumbs: at least one, only known codes, de-duplicated in canonical order.
  const breadcrumbs = BREADCRUMB_CODES.filter((c) =>
    (input.breadcrumbs ?? []).includes(c)
  );
  if (breadcrumbs.length === 0) {
    throw new Error("Elegí al menos un tipo de empanado.");
  }

  // Prices/stocks/images: keep only entries for the chosen breadcrumbs.
  const prices: Record<string, number> = {};
  const stocks: Record<string, number> = {};
  const images: Record<string, string[]> = {};
  for (const b of breadcrumbs) {
    const price = Math.round(Number(input.prices?.[b] ?? 0));
    if (!Number.isFinite(price) || price < 0) throw new Error("Precio inválido.");
    prices[b] = price;

    const stock = Math.round(Number(input.stocks?.[b] ?? 0));
    if (!Number.isFinite(stock) || stock < 0) throw new Error("Stock inválido.");
    stocks[b] = stock;

    // Up to 2 photos per empanado; drop empty slots, keep order.
    const photos = (input.images?.[b] ?? [])
      .map((s) => (s ?? "").trim())
      .filter(Boolean)
      .slice(0, 2);
    images[b] = photos;
  }

  // Default price = first breadcrumb with a price > 0, else first, else 0.
  const defaultPrice =
    breadcrumbs.map((b) => prices[b]).find((v) => v > 0) ??
    prices[breadcrumbs[0]] ??
    0;
  const totalStock = Object.values(stocks).reduce((a, b) => a + b, 0);
  // Cover = first breadcrumb's image, if any.
  const imageUrl = images[breadcrumbs[0]]?.[0] ?? "";

  // Disabled empanados: keep only ones the product actually offers.
  const disabledBreadcrumbs = (input.disabledBreadcrumbs ?? []).filter((b) =>
    breadcrumbs.includes(b)
  );

  const costPerKg = Math.max(0, Math.round(Number(input.costPerKg ?? 0)));

  return {
    name,
    description,
    category: input.category,
    weightGrams,
    isNew: Boolean(input.isNew),
    available: Boolean(input.available),
    costPerKg,
    availableBreadcrumbs: JSON.stringify(breadcrumbs),
    disabledBreadcrumbs: JSON.stringify(disabledBreadcrumbs),
    prices: JSON.stringify(prices),
    stocks: JSON.stringify(stocks),
    images: JSON.stringify(images),
    price: defaultPrice,
    stock: totalStock,
    imageUrl,
    ...(normalizedSlug ? { slug: normalizedSlug } : {}),
  };
}

// Creates a new product.
export async function createProduct(input: ProductInput) {
  const data = buildProductData(input);
  const slug = await uniqueSlug(slugify(input.name));
  await prisma.product.create({ data: { ...data, slug } });
}

// Updates an existing product (all fields). The slug is kept stable so product
// URLs don't break when the name changes.
export async function updateProduct(id: string, input: ProductInput) {
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) throw new Error("Producto no encontrado.");
  const data = buildProductData(input);
  await prisma.product.update({ where: { id }, data });
}

// Deletes a product. Refuses if it already appears in orders (so we never lose
// order history) — the admin should deactivate it instead.
export async function deleteProduct(id: string) {
  const used = await prisma.orderItem.count({ where: { productId: id } });
  if (used > 0) {
    throw new Error(
      "Este producto ya tiene pedidos. Para no perder el historial, desactivalo en vez de eliminarlo."
    );
  }
  await prisma.product.delete({ where: { id } });
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

// Creates a zone with just a name; the polygon and days are added afterwards.
export async function createZone(name: string) {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("La zona necesita un nombre.");
  await prisma.zone.create({
    data: { name: trimmed, polygon: null, daysOfWeek: "[]" },
  });
}

// Validates a value looks like a GeoJSON Polygon with at least one ring of 3+
// points. Returns the normalized object or throws.
function validatePolygon(polygon: unknown): {
  type: "Polygon";
  coordinates: number[][][];
} | null {
  if (polygon == null) return null;
  if (
    typeof polygon !== "object" ||
    (polygon as { type?: string }).type !== "Polygon"
  ) {
    throw new Error("El área dibujada es inválida.");
  }
  const coords = (polygon as { coordinates?: unknown }).coordinates;
  if (!Array.isArray(coords) || !Array.isArray(coords[0]) || coords[0].length < 3) {
    throw new Error("El área necesita al menos 3 puntos.");
  }
  return polygon as { type: "Polygon"; coordinates: number[][][] };
}

// Updates a zone's name, polygon (GeoJSON), weekdays and active flag.
export async function updateZone(
  id: string,
  data: {
    name: string;
    polygon: unknown; // GeoJSON Polygon or null
    daysOfWeek: number[];
    active: boolean;
    shippingCost: number;
    freeShippingFrom: number;
  }
) {
  const name = data.name.trim();
  if (!name) throw new Error("La zona necesita un nombre.");

  const polygon = validatePolygon(data.polygon);

  // Clean weekdays: keep 0..6, unique, sorted.
  const days = Array.from(
    new Set((data.daysOfWeek ?? []).filter((d) => d >= 0 && d <= 6))
  ).sort((a, b) => a - b);

  const shippingCost = Math.round(Number(data.shippingCost));
  if (!Number.isFinite(shippingCost) || shippingCost < 0) {
    throw new Error("Costo de envío inválido.");
  }
  const freeShippingFrom = Math.round(Number(data.freeShippingFrom));
  if (!Number.isFinite(freeShippingFrom) || freeShippingFrom < 0) {
    throw new Error("Monto de envío gratis inválido.");
  }

  await prisma.zone.update({
    where: { id },
    data: {
      name,
      polygon: polygon ? JSON.stringify(polygon) : null,
      daysOfWeek: JSON.stringify(days),
      active: Boolean(data.active),
      shippingCost,
      freeShippingFrom,
    },
  });
}

export async function deleteZone(id: string) {
  await prisma.zone.delete({ where: { id } });
}
