// Higher-level stock operations: Producción (add stock), Ajustes (manual ±
// with a required reason) and the movements history. Built on lib/stock.ts.

import { prisma } from "@/lib/db";
import {
  adjustStockSingle,
  STOCK_MOVEMENT_TYPE_LABELS,
  STOCK_REFERENCE_LABELS,
  stockReferenceHref,
} from "@/lib/stock";

export {
  STOCK_MOVEMENT_TYPE_LABELS,
  STOCK_REFERENCE_LABELS,
  stockReferenceHref,
};

// Sub-tabs for the Stock section (shared by its pages). Lives here (not in a
// page file) because Next.js forbids arbitrary named exports from route files.
export const STOCK_TABS = [
  { href: "/admin/stock", label: "Inventario" },
  { href: "/admin/stock/movimientos", label: "Movimientos" },
  { href: "/admin/stock/produccion", label: "Producción" },
];

// ---- Producción --------------------------------------------------------------

export type ProductionInput = {
  productId: string;
  breadcrumbType: string;
  quantity: number; // units produced (positive)
  date?: string; // yyyy-mm-dd
  notes?: string;
};

export async function createProduction(input: ProductionInput) {
  const quantity = Math.round(Number(input.quantity));
  if (!input.productId || !input.breadcrumbType)
    throw new Error("Elegí un producto y un empanado.");
  if (!Number.isFinite(quantity) || quantity <= 0)
    throw new Error("La cantidad producida tiene que ser mayor a 0.");
  const date = parseDate(input.date);
  await adjustStockSingle({
    productId: input.productId,
    breadcrumbType: input.breadcrumbType,
    delta: quantity, // production ADDS stock
    type: "PRODUCTION",
    referenceType: "MANUAL",
    notes: input.notes?.trim() || null,
    date,
  });
}

// ---- Ajuste manual (motivo obligatorio) -------------------------------------

export type AdjustmentInput = {
  productId: string;
  breadcrumbType: string;
  delta: number; // signed: + adds, − removes
  reason: string; // required
  type?: string; // ADJUSTMENT (default) or WASTE
  date?: string;
};

export async function createAdjustment(input: AdjustmentInput) {
  const delta = Math.round(Number(input.delta));
  if (!input.productId || !input.breadcrumbType)
    throw new Error("Elegí un producto y un empanado.");
  if (!Number.isFinite(delta) || delta === 0)
    throw new Error("El ajuste no puede ser 0 (usá + para sumar, − para restar).");
  const reason = input.reason?.trim();
  if (!reason) throw new Error("El ajuste necesita un motivo.");
  const type = input.type === "WASTE" ? "WASTE" : "ADJUSTMENT";
  const date = parseDate(input.date);
  await adjustStockSingle({
    productId: input.productId,
    breadcrumbType: input.breadcrumbType,
    delta,
    type,
    referenceType: "MANUAL",
    notes: reason,
    date,
  });
}

// ---- Movements history (filterable) -----------------------------------------

export type StockMovementRow = {
  id: string;
  date: Date;
  productName: string;
  breadcrumbType: string;
  quantity: number;
  type: string;
  typeLabel: string;
  referenceType: string | null;
  referenceLabel: string | null;
  href: string | null;
  notes: string | null;
};

export async function listStockMovements(filters: {
  productId?: string;
  type?: string;
  from?: Date;
  to?: Date;
  limit?: number;
}): Promise<StockMovementRow[]> {
  const where: Record<string, unknown> = {};
  if (filters.productId) where.productId = filters.productId;
  if (filters.type) where.type = filters.type;
  if (filters.from || filters.to) {
    where.date = {
      ...(filters.from ? { gte: filters.from } : {}),
      ...(filters.to ? { lt: filters.to } : {}),
    };
  }

  const rows = await prisma.stockMovement.findMany({
    where,
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    take: filters.limit ?? 300,
    include: { product: { select: { name: true } } },
  });

  return rows.map((m) => ({
    id: m.id,
    date: m.date,
    productName: m.product?.name ?? "Producto",
    breadcrumbType: m.breadcrumbType,
    quantity: m.quantity,
    type: m.type,
    typeLabel: STOCK_MOVEMENT_TYPE_LABELS[m.type] ?? m.type,
    referenceType: m.referenceType,
    referenceLabel: m.referenceType
      ? STOCK_REFERENCE_LABELS[m.referenceType] ?? m.referenceType
      : null,
    href: stockReferenceHref(m.referenceType, m.referenceId),
    notes: m.notes,
  }));
}

// Products with their available empanados, for the production/adjustment forms.
export async function listProductsWithBreadcrumbs() {
  const products = await prisma.product.findMany({ orderBy: { name: "asc" } });
  return products.map((p) => {
    let breadcrumbs: string[] = [];
    let stocks: Record<string, number> = {};
    try {
      const b = JSON.parse(p.availableBreadcrumbs);
      breadcrumbs = Array.isArray(b) ? b : [];
    } catch {}
    try {
      const s = JSON.parse(p.stocks);
      if (s && typeof s === "object") stocks = s;
    } catch {}
    return {
      id: p.id,
      name: p.name,
      breadcrumbs,
      stocks,
    };
  });
}

function parseDate(s?: string): Date {
  if (s && /^\d{4}-\d{2}-\d{2}$/.test(s)) return new Date(`${s}T12:00:00`);
  return new Date();
}
