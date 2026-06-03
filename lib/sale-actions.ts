// Unified status + cancellation logic for web orders and manual sales.
//
// Status cycle (both kinds): CONFIRMED → DELIVERED, or → CANCELLED. A cancelled
// record can't be reactivated. Cancellation is fully transactional (Part 4):
// status + stock restock (ADJUSTMENT, keeping the original SALE rows) + Caja
// adjustment, all-or-nothing.

import { prisma } from "@/lib/db";
import type { SaleKind } from "@/lib/sales-detail";
import { recordCashOrderIncome } from "@/lib/cash";
import { deleteManualSale } from "@/lib/management";

export const ACTIVE_STATUSES = ["CONFIRMED", "DELIVERED", "CANCELLED"] as const;

// Change status for either kind. CANCELLED routes to the transactional cancel.
export async function setSaleStatus(
  kind: SaleKind,
  id: string,
  status: string
): Promise<void> {
  if (!ACTIVE_STATUSES.includes(status as (typeof ACTIVE_STATUSES)[number]))
    throw new Error("Estado inválido.");

  if (status === "CANCELLED") {
    await cancelSale(kind, id);
    return;
  }

  // Non-cancel transitions. Guard: a cancelled record can't be reactivated.
  if (kind === "ORDER") {
    const o = await prisma.order.findUnique({
      where: { id },
      select: { status: true, paymentMethod: true },
    });
    if (!o) throw new Error("Pedido no encontrado.");
    if (o.status === "CANCELLED")
      throw new Error("Un pedido cancelado no se puede reactivar.");
    await prisma.order.update({ where: { id }, data: { status } });

    // Cash web order collected on delivery → record the income in Caja.
    if (status === "DELIVERED" && o.paymentMethod === "CASH") {
      const full = await prisma.order.findUnique({
        where: { id },
        select: {
          id: true,
          total: true,
          customerName: true,
          createdAt: true,
        },
      });
      if (full) {
        try {
          await recordCashOrderIncome(full);
        } catch (e) {
          console.error("recordCashOrderIncome failed:", e);
        }
      }
    }
  } else {
    const s = await prisma.manualSale.findUnique({
      where: { id },
      select: { deliveryStatus: true },
    });
    if (!s) throw new Error("Venta no encontrada.");
    if (s.deliveryStatus === "CANCELLED")
      throw new Error("Una venta cancelada no se puede reactivar.");
    await prisma.manualSale.update({
      where: { id },
      data: { deliveryStatus: status },
    });
  }
}

// ---- Cancellation (Part 4) --------------------------------------------------
//
// In one transaction:
//  1. status → CANCELLED (still exists; only shows under the "Cancelados" filter)
//  2. stock: per item, a StockMovement ADJUSTMENT with +quantity (restock). The
//     original SALE movements are NOT deleted (audit). Product stock is updated.
//  3. Caja, depending on the recorded payments' CashMovement state:
//     - AVAILABLE incomes → a compensating EXPENSE "DEVOLUCION" for the sum.
//     - PENDING incomes (MP not released) → delete those PENDING CashMovements.
//     - no payments → don't touch Caja.

type CancelItem = {
  productId: string | null;
  breadcrumbType: string | null;
  quantity: number;
};

async function cancelSale(kind: SaleKind, id: string): Promise<void> {
  if (kind === "ORDER") {
    const order = await prisma.order.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!order) throw new Error("Pedido no encontrado.");
    if (order.status === "CANCELLED") return; // idempotent

    const items: CancelItem[] = order.items.map((it) => ({
      productId: it.productId,
      breadcrumbType: it.breadcrumbType,
      quantity: it.quantity,
    }));
    await runCancellation({
      refId: id,
      shortId: id.slice(-6).toUpperCase(),
      items,
      setStatus: (tx) =>
        tx.order.update({ where: { id }, data: { status: "CANCELLED" } }),
      referenceType: "ORDER",
    });
  } else {
    const sale = await prisma.manualSale.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!sale) throw new Error("Venta no encontrada.");
    if (sale.deliveryStatus === "CANCELLED") return;

    const items: CancelItem[] = sale.items.map((it) => ({
      productId: it.productId,
      breadcrumbType: it.breadcrumbType,
      quantity: it.quantity,
    }));
    await runCancellation({
      refId: id,
      shortId: id.slice(-6).toUpperCase(),
      items,
      setStatus: (tx) =>
        tx.manualSale.update({
          where: { id },
          data: { deliveryStatus: "CANCELLED" },
        }),
      referenceType: "MANUAL_SALE",
    });
  }
}

// ---- Hard delete (Part 3: "Borrar definitivamente") ------------------------
//
// Removes the record entirely. Reverts stock and Caja just like a cancellation,
// then deletes. Only for load errors — cancelling is the normal path.
export async function deleteSaleOrOrder(
  kind: SaleKind,
  id: string
): Promise<void> {
  if (kind === "MANUAL") {
    // deleteManualSale already restocks + clears the sale's Caja movements.
    await deleteManualSale(id);
    return;
  }

  const order = await prisma.order.findUnique({
    where: { id },
    include: { items: true },
  });
  if (!order) throw new Error("Pedido no encontrado.");
  const wasCancelled = order.status === "CANCELLED";

  await prisma.$transaction(async (tx) => {
    // Restock only if it wasn't already cancelled (a cancelled order already
    // returned its stock).
    if (!wasCancelled) {
      const byProduct = new Map<string, Map<string, number>>();
      for (const it of order.items) {
        if (!it.productId || !it.breadcrumbType) continue;
        if (!byProduct.has(it.productId)) byProduct.set(it.productId, new Map());
        const m = byProduct.get(it.productId)!;
        m.set(it.breadcrumbType, (m.get(it.breadcrumbType) ?? 0) + it.quantity);
      }
      for (const [productId, perBreadcrumb] of byProduct) {
        const product = await tx.product.findUnique({
          where: { id: productId },
          select: { stocks: true },
        });
        if (!product) continue;
        const stocks = parseMap(product.stocks);
        for (const [bc, qty] of perBreadcrumb)
          stocks[bc] = (stocks[bc] ?? 0) + qty;
        const total = Object.values(stocks).reduce((a, b) => a + b, 0);
        await tx.product.update({
          where: { id: productId },
          data: { stocks: JSON.stringify(stocks), stock: total },
        });
      }
    }
    // Remove the order's Caja movements and its stock movements (audit rows for
    // a record that no longer exists would be orphaned).
    await tx.cashMovement.deleteMany({ where: { orderId: id } });
    await tx.stockMovement.deleteMany({
      where: { referenceType: "ORDER", referenceId: id },
    });
    // Payments + order items cascade-delete with the order.
    await tx.order.delete({ where: { id } });
  });
}

function parseMap(raw: string): Record<string, number> {
  try {
    const v = JSON.parse(raw);
    return v && typeof v === "object" && !Array.isArray(v) ? v : {};
  } catch {
    return {};
  }
}

async function runCancellation(args: {
  refId: string;
  shortId: string;
  items: CancelItem[];
  setStatus: (tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0]) => Promise<unknown>;
  referenceType: "ORDER" | "MANUAL_SALE";
}): Promise<void> {
  // Read the cash movements linked to this sale/order up-front to decide the
  // Caja effect. (Reads outside the tx are fine; the writes are inside.)
  const linkField = args.referenceType === "ORDER" ? "orderId" : "saleId";
  const cashMovements = await prisma.cashMovement.findMany({
    where: { type: "INCOME", [linkField]: args.refId },
  });
  const availableSum = cashMovements
    .filter((m) => m.status === "AVAILABLE")
    .reduce((a, m) => a + m.amount, 0);
  const pendingIds = cashMovements
    .filter((m) => m.status === "PENDING")
    .map((m) => m.id);

  await prisma.$transaction(async (tx) => {
    // 1) status → CANCELLED
    await args.setStatus(tx);

    // 2) stock: restock each tracked item via an ADJUSTMENT (+), keeping the
    //    original SALE movement intact.
    const tracked = args.items.filter(
      (it) => it.productId && it.breadcrumbType && it.quantity > 0
    );
    // Group by product to update its stocks JSON once.
    const byProduct = new Map<string, Map<string, number>>();
    for (const it of tracked) {
      const pid = it.productId as string;
      if (!byProduct.has(pid)) byProduct.set(pid, new Map());
      const m = byProduct.get(pid)!;
      const bc = it.breadcrumbType as string;
      m.set(bc, (m.get(bc) ?? 0) + it.quantity);
    }
    for (const [productId, perBreadcrumb] of byProduct) {
      const product = await tx.product.findUnique({
        where: { id: productId },
        select: { stocks: true },
      });
      if (!product) continue;
      const stocks = parseMap(product.stocks);
      for (const [bc, qty] of perBreadcrumb) {
        stocks[bc] = (stocks[bc] ?? 0) + qty;
      }
      const total = Object.values(stocks).reduce((a, b) => a + b, 0);
      await tx.product.update({
        where: { id: productId },
        data: { stocks: JSON.stringify(stocks), stock: total },
      });
      for (const [bc, qty] of perBreadcrumb) {
        await tx.stockMovement.create({
          data: {
            productId,
            breadcrumbType: bc,
            quantity: qty, // positive: returns to inventory
            type: "ADJUSTMENT",
            referenceType: args.referenceType,
            referenceId: args.refId,
            notes: `Reposición por cancelación de pedido #${args.shortId}`,
          },
        });
      }
    }

    // 3) Caja
    if (availableSum > 0) {
      // Compensate the collected money with a DEVOLUCION expense.
      await tx.cashMovement.create({
        data: {
          date: new Date(),
          type: "EXPENSE",
          amount: availableSum,
          description: `Devolución por cancelación de pedido #${args.shortId}`,
          category: "DEVOLUCION",
          status: "AVAILABLE",
          [linkField]: args.refId,
        },
      });
    }
    if (pendingIds.length > 0) {
      // The money never arrived — just remove the pending incomes.
      await tx.cashMovement.deleteMany({ where: { id: { in: pendingIds } } });
    }
  });
}
