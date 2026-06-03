// Stock helpers shared by sales/orders/production/adjustments. Stock is a
// per-empanado JSON map on the product ({ "<breadcrumb>": units }); `stock` is
// the cached total. These keep both in sync AND write a StockMovement so every
// change is auditable. Quantities are in units.

import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";

type Tx = Prisma.TransactionClient;

export const STOCK_MOVEMENT_TYPES = [
  "PRODUCTION",
  "SALE",
  "ADJUSTMENT",
  "WASTE",
  "PURCHASE",
] as const;

export const STOCK_MOVEMENT_TYPE_LABELS: Record<string, string> = {
  PRODUCTION: "Producción",
  SALE: "Venta",
  ADJUSTMENT: "Ajuste",
  WASTE: "Merma",
  PURCHASE: "Compra",
};

export const STOCK_REFERENCE_LABELS: Record<string, string> = {
  ORDER: "Pedido web",
  MANUAL_SALE: "Venta manual",
  PURCHASE: "Compra",
  MANUAL: "Manual",
};

// The detail of a sale/order is reached ONLY from "Pedidos y ventas", not from
// the stock movements list — so movements show the reference as plain text.
// Purchases still link to their section.
export function stockReferenceHref(
  refType: string | null,
  refId: string | null
): string | null {
  if (!refId) return null;
  if (refType === "PURCHASE") return `/admin/compras`;
  return null;
}

function parseMap(raw: string): Record<string, number> {
  try {
    const v = JSON.parse(raw);
    return v && typeof v === "object" && !Array.isArray(v) ? v : {};
  } catch {
    return {};
  }
}

export type MovementContext = {
  type: string; // one of STOCK_MOVEMENT_TYPES
  referenceType?: string | null; // ORDER | MANUAL_SALE | PURCHASE | MANUAL
  referenceId?: string | null;
  notes?: string | null;
  date?: Date;
};

// Apply a signed delta (units) to one (product, empanado) bucket AND record a
// StockMovement for it. Negative removes stock, positive adds. Never lets a
// bucket go below 0. Runs inside the given transaction client.
export async function applyStockDelta(
  tx: Tx,
  productId: string,
  breadcrumb: string,
  delta: number,
  ctx: MovementContext
): Promise<void> {
  if (!productId || !breadcrumb || !delta) return;
  const product = await tx.product.findUnique({
    where: { id: productId },
    select: { stocks: true },
  });
  if (!product) return;
  const stocks = parseMap(product.stocks);
  const next = Math.max(0, (stocks[breadcrumb] ?? 0) + delta);
  stocks[breadcrumb] = next;
  const total = Object.values(stocks).reduce((a, b) => a + b, 0);
  await tx.product.update({
    where: { id: productId },
    data: { stocks: JSON.stringify(stocks), stock: total },
  });
  await tx.stockMovement.create({
    data: {
      date: ctx.date ?? new Date(),
      productId,
      breadcrumbType: breadcrumb,
      quantity: delta,
      type: ctx.type,
      referenceType: ctx.referenceType ?? null,
      referenceId: ctx.referenceId ?? null,
      notes: ctx.notes ?? null,
    },
  });
}

// Discounts (sign = -1) or restocks (sign = +1) a set of sale/order lines in
// one transaction, recording a StockMovement per line. Lines without a
// productId + breadcrumb are skipped (free-text items don't track stock).
export async function adjustStockForLines(
  lines: {
    productId?: string | null;
    breadcrumbType?: string | null;
    quantity: number;
  }[],
  sign: 1 | -1,
  ctx: MovementContext
): Promise<void> {
  const tracked = lines.filter(
    (l) => l.productId && l.breadcrumbType && l.quantity > 0
  );
  if (tracked.length === 0) return;
  await prisma.$transaction(async (tx) => {
    for (const l of tracked) {
      await applyStockDelta(
        tx,
        l.productId as string,
        l.breadcrumbType as string,
        sign * l.quantity,
        ctx
      );
    }
  });
}

// Single (product, empanado) change — used by Producción (+) and Ajustes (±).
// `delta` is signed. Records the movement with the given type/notes.
export async function adjustStockSingle(args: {
  productId: string;
  breadcrumbType: string;
  delta: number;
  type: string;
  referenceType?: string | null;
  referenceId?: string | null;
  notes?: string | null;
  date?: Date;
}): Promise<void> {
  if (!args.productId || !args.breadcrumbType || !args.delta) return;
  await prisma.$transaction(async (tx) => {
    await applyStockDelta(tx, args.productId, args.breadcrumbType, args.delta, {
      type: args.type,
      referenceType: args.referenceType ?? "MANUAL",
      referenceId: args.referenceId ?? null,
      notes: args.notes ?? null,
      date: args.date,
    });
  });
}
