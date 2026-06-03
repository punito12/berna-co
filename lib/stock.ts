// Stock helpers shared by sales/orders. Stock is a per-empanado JSON map on the
// product ({ "<breadcrumb>": units }); `stock` is the cached total. These keep
// both in sync. Quantities are in units.

import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";

type Tx = Prisma.TransactionClient;

function parseMap(raw: string): Record<string, number> {
  try {
    const v = JSON.parse(raw);
    return v && typeof v === "object" && !Array.isArray(v) ? v : {};
  } catch {
    return {};
  }
}

// Apply a signed delta (units) to one (product, empanado) bucket. Negative
// reduces stock (a sale), positive adds it back (a cancellation/restock).
// Never lets a bucket go below 0. Runs inside the given transaction client.
export async function applyStockDelta(
  tx: Tx,
  productId: string,
  breadcrumb: string,
  delta: number
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
}

// Convenience for a set of {productId, breadcrumb, units} lines: discounts
// (sign = -1) or restocks (sign = +1) all of them in one transaction. Lines
// without a productId+breadcrumb are skipped (free-text items don't track
// stock).
export async function adjustStockForLines(
  lines: { productId?: string | null; breadcrumbType?: string | null; quantity: number }[],
  sign: 1 | -1
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
        sign * l.quantity
      );
    }
  });
}
