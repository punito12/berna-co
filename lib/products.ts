// Business logic for products: fetching and presentation helpers.
// Keep functions small and readable (see CLAUDE.md conventions).

import { prisma } from "@/lib/db";

// Breadcrumb (empanado) codes stored in the DB, with their Spanish labels for UI.
export const BREADCRUMB_LABELS: Record<string, string> = {
  TRADITIONAL: "Tradicional",
  INTEGRAL: "Integral",
  KETO: "Keto",
};

// A product shaped for the UI: JSON fields parsed into arrays.
export type ProductForUI = {
  id: string;
  name: string;
  description: string; // short, for cards
  longDescription: string; // full, for the detail page
  slug: string;
  weightGrams: number;
  category: string;
  price: number; // default/fallback price
  pricesByBreadcrumb: Record<string, number>; // price per empanado
  imageUrl: string; // default cover (the traditional first photo)
  imagesByBreadcrumb: Record<string, string[]>; // gallery per empanado
  available: boolean;
  isNew: boolean;
  stock: number; // legacy/fallback total
  stocksByBreadcrumb: Record<string, number>; // stock per empanado
  breadcrumbs: string[];
  promoPercent: number; // product-wide % off fallback (0 = none)
  promoType: string; // product-wide quantity promo fallback
  promoPercentByBreadcrumb: Record<string, number>; // per-empanado % off
  promoTypeByBreadcrumb: Record<string, string>; // per-empanado 2x1/3x2
};

// The raw Prisma row fields we care about (kept loose to avoid import churn).
type ProductRow = {
  id: string;
  name: string;
  description: string;
  longDescription: string;
  slug: string;
  weightGrams: number;
  category: string;
  price: number;
  prices: string;
  imageUrl: string;
  images: string;
  available: boolean;
  isNew: boolean;
  stock: number;
  stocks: string;
  availableBreadcrumbs: string;
  disabledBreadcrumbs: string;
  promoPercent: number;
  promoType: string;
  promoPercents: string;
  promoTypes: string;
};

// Maps a database row into the UI shape (parsing the JSON columns). The
// customer-facing `breadcrumbs` excludes any empanado the admin turned off.
function toProductForUI(p: ProductRow): ProductForUI {
  const all = safeParseArray(p.availableBreadcrumbs);
  const disabled = safeParseArray(p.disabledBreadcrumbs);
  const visible = all.filter((b) => !disabled.includes(b));
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    longDescription: p.longDescription ?? "",
    slug: p.slug,
    weightGrams: p.weightGrams,
    category: p.category,
    price: p.price,
    pricesByBreadcrumb: safeParsePrices(p.prices),
    imageUrl: p.imageUrl,
    imagesByBreadcrumb: safeParseImages(p.images),
    available: p.available,
    isNew: p.isNew,
    stock: p.stock,
    stocksByBreadcrumb: safeParseStocks(p.stocks),
    breadcrumbs: visible,
    promoPercent: p.promoPercent ?? 0,
    promoType: p.promoType ?? "",
    promoPercentByBreadcrumb: safeParseNumberMap(p.promoPercents),
    promoTypeByBreadcrumb: safeParseStringMap(p.promoTypes),
  };
}

// % off for an empanado: the per-empanado value if set, else the product-wide.
export function promoPercentFor(
  product: ProductForUI,
  breadcrumb: string
): number {
  const specific = product.promoPercentByBreadcrumb[breadcrumb];
  if (typeof specific === "number" && specific > 0) return specific;
  return product.promoPercent ?? 0;
}

// Quantity promo ("2x1"/"3x2"/"") for an empanado, per-empanado else product-wide.
export function promoTypeFor(
  product: ProductForUI,
  breadcrumb: string
): string {
  const specific = product.promoTypeByBreadcrumb[breadcrumb];
  if (specific === "2x1" || specific === "3x2") return specific;
  return product.promoType ?? "";
}

// Price for an empanado AFTER its % promo (rounded). Use this for the price the
// customer pays; `priceFor` keeps the original (for struck-through).
export function promoPriceFor(
  product: ProductForUI,
  breadcrumb: string
): number {
  const base = priceFor(product, breadcrumb);
  const pct = promoPercentFor(product, breadcrumb);
  if (pct > 0) return Math.round((base * (100 - pct)) / 100);
  return base;
}

function safeParseStringMap(raw: string): Record<string, string> {
  try {
    const v = JSON.parse(raw);
    if (v && typeof v === "object" && !Array.isArray(v)) {
      const out: Record<string, string> = {};
      for (const [k, val] of Object.entries(v))
        if (typeof val === "string") out[k] = val;
      return out;
    }
    return {};
  } catch {
    return {};
  }
}

// The price for a given empanado: the specific price if set (> 0), otherwise
// the product's default price (so legacy/0 still shows "Precio a confirmar").
export function priceFor(product: ProductForUI, breadcrumb: string): number {
  const specific = product.pricesByBreadcrumb[breadcrumb];
  if (typeof specific === "number" && specific > 0) return specific;
  return product.price ?? 0;
}

// The stock for a given empanado. If a per-empanado map exists, use it (0 when
// that variant isn't listed). Otherwise fall back to the product's total stock.
export function stockFor(product: ProductForUI, breadcrumb: string): number {
  const map = product.stocksByBreadcrumb;
  if (map && Object.keys(map).length > 0) {
    return map[breadcrumb] ?? 0;
  }
  return product.stock ?? 0;
}

// True when EVERY available empanado of the product is out of stock.
export function isProductOutOfStock(product: ProductForUI): boolean {
  if (product.breadcrumbs.length === 0) return product.stock <= 0;
  return product.breadcrumbs.every((b) => stockFor(product, b) <= 0);
}

// Parses the prices column into a { breadcrumb: price } map.
function safeParsePrices(raw: string): Record<string, number> {
  return safeParseNumberMap(raw);
}

// Parses the stocks column into a { breadcrumb: units } map.
function safeParseStocks(raw: string): Record<string, number> {
  return safeParseNumberMap(raw);
}

// Shared parser for a JSON object of { string: number }.
function safeParseNumberMap(raw: string): Record<string, number> {
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const out: Record<string, number> = {};
      for (const [k, v] of Object.entries(parsed)) {
        if (typeof v === "number") out[k] = v;
      }
      return out;
    }
    return {};
  } catch {
    return {};
  }
}

// Parses the images column into a { breadcrumb: paths[] } map. Accepts the
// old array format too (treated as the traditional set) for safety.
function safeParseImages(raw: string): Record<string, string[]> {
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return { TRADITIONAL: parsed };
    if (parsed && typeof parsed === "object") return parsed;
    return {};
  } catch {
    return {};
  }
}

// Loads all available products, ordered so NEW items show first.
export async function getAvailableProducts(): Promise<ProductForUI[]> {
  const rows = await prisma.product.findMany({
    where: { available: true },
    orderBy: [{ isNew: "desc" }, { createdAt: "asc" }],
  });
  return rows.map(toProductForUI);
}

// Loads one product by its slug, or null if not found / unavailable.
export async function getProductBySlug(
  slug: string
): Promise<ProductForUI | null> {
  const row = await prisma.product.findUnique({ where: { slug } });
  if (!row || !row.available) return null;
  return toProductForUI(row);
}

function safeParseArray(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// Shows a weight like "1 kg" or "750 g".
export function formatWeight(grams: number): string {
  if (grams % 1000 === 0) return `${grams / 1000} kg`;
  return `${grams} g`;
}

// Shows a price in Argentine pesos, or a friendly placeholder when it is 0
// (admin has not loaded the real price yet).
export function formatPrice(price: number): string {
  if (!price || price <= 0) return "Precio a confirmar";
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(price);
}
