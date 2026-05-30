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
  description: string;
  slug: string;
  weightGrams: number;
  category: string;
  price: number; // default/fallback price
  pricesByBreadcrumb: Record<string, number>; // price per empanado
  imageUrl: string; // default cover (the traditional first photo)
  imagesByBreadcrumb: Record<string, string[]>; // gallery per empanado
  available: boolean;
  isNew: boolean;
  breadcrumbs: string[];
};

// The raw Prisma row fields we care about (kept loose to avoid import churn).
type ProductRow = {
  id: string;
  name: string;
  description: string;
  slug: string;
  weightGrams: number;
  category: string;
  price: number;
  prices: string;
  imageUrl: string;
  images: string;
  available: boolean;
  isNew: boolean;
  availableBreadcrumbs: string;
};

// Maps a database row into the UI shape (parsing the JSON columns).
function toProductForUI(p: ProductRow): ProductForUI {
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    slug: p.slug,
    weightGrams: p.weightGrams,
    category: p.category,
    price: p.price,
    pricesByBreadcrumb: safeParsePrices(p.prices),
    imageUrl: p.imageUrl,
    imagesByBreadcrumb: safeParseImages(p.images),
    available: p.available,
    isNew: p.isNew,
    breadcrumbs: safeParseArray(p.availableBreadcrumbs),
  };
}

// The price for a given empanado: the specific price if set (> 0), otherwise
// the product's default price (so legacy/0 still shows "Precio a confirmar").
export function priceFor(product: ProductForUI, breadcrumb: string): number {
  const specific = product.pricesByBreadcrumb[breadcrumb];
  if (typeof specific === "number" && specific > 0) return specific;
  return product.price ?? 0;
}

// Parses the prices column into a { breadcrumb: price } map.
function safeParsePrices(raw: string): Record<string, number> {
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
