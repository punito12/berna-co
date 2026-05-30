// Business logic for products: fetching and presentation helpers.
// Keep functions small and readable (see CLAUDE.md conventions).

import { prisma } from "@/lib/db";

// Breadcrumb (empanado) codes stored in the DB, with their Spanish labels for UI.
export const BREADCRUMB_LABELS: Record<string, string> = {
  TRADITIONAL: "Tradicional",
  INTEGRAL: "Integral",
  KETO: "Keto",
};

// A product shaped for the UI: breadcrumbs parsed from JSON into an array.
export type ProductForUI = {
  id: string;
  name: string;
  description: string;
  slug: string;
  weightGrams: number;
  category: string;
  price: number;
  imageUrl: string;
  available: boolean;
  isNew: boolean;
  breadcrumbs: string[];
};

// Loads all available products, ordered so NEW items show first.
export async function getAvailableProducts(): Promise<ProductForUI[]> {
  const rows = await prisma.product.findMany({
    where: { available: true },
    orderBy: [{ isNew: "desc" }, { createdAt: "asc" }],
  });

  return rows.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    slug: p.slug,
    weightGrams: p.weightGrams,
    category: p.category,
    price: p.price,
    imageUrl: p.imageUrl,
    available: p.available,
    isNew: p.isNew,
    breadcrumbs: safeParseBreadcrumbs(p.availableBreadcrumbs),
  }));
}

function safeParseBreadcrumbs(raw: string): string[] {
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
