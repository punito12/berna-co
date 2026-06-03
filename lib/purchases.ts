// Compras (purchases) and supplier payments — the expense-side mirror of
// lib/payments.ts.
//
// A Purchase records what was bought from a supplier. A SupplierPayment records
// money paid toward it and creates a CashMovement (EXPENSE). The purchase's
// paymentStatus is recomputed from the sum of its payments. "Cuentas por pagar"
// lists suppliers with an outstanding balance plus an aging breakdown.

import { prisma } from "@/lib/db";
import { INCOME_SOURCE_LABELS } from "@/lib/cash";
import { SUPPLIER_TYPE_LABELS } from "@/lib/suppliers";

export const PAYMENT_METHODS = ["EFECTIVO", "MERCADO_PAGO", "TRANSFERENCIA"] as const;

export const PURCHASE_STATUS_LABELS: Record<string, string> = {
  PAID: "Pagada",
  PARTIAL: "Parcial",
  PENDING: "A pagar",
};

// ---- Create a purchase ------------------------------------------------------

export type PurchaseItemInput = {
  description: string;
  quantity: number;
  unit?: string;
  unitPrice: number;
};

export type PurchaseInput = {
  supplierId: string;
  date: string; // yyyy-mm-dd
  discountAmount?: number; // pesos off the gross
  notes?: string;
  items: PurchaseItemInput[];
  // Optional: if paid in full right away, register a payment too.
  payNow?: { method: string } | null;
};

function computeTotals(items: PurchaseItemInput[], discountAmount: number) {
  let gross = 0;
  const lines = items.map((it) => {
    const quantity = Number(it.quantity);
    const unitPrice = Math.round(Number(it.unitPrice));
    const subtotal = Math.round(quantity * unitPrice);
    gross += subtotal;
    return {
      description: it.description.trim(),
      quantity,
      unit: it.unit?.trim() || "unidades",
      unitPrice,
      subtotal,
    };
  });
  const discount = Math.min(gross, Math.max(0, Math.round(discountAmount || 0)));
  return { lines, gross, discount, total: gross - discount };
}

export async function createPurchase(input: PurchaseInput) {
  if (!input.supplierId) throw new Error("Elegí un proveedor.");
  const supplier = await prisma.supplier.findUnique({
    where: { id: input.supplierId },
    select: { id: true, name: true, defaultDueDays: true },
  });
  if (!supplier) throw new Error("Proveedor no encontrado.");

  if (!Array.isArray(input.items) || input.items.length === 0)
    throw new Error("Agregá al menos un ítem a la compra.");
  for (const it of input.items) {
    if (!it.description?.trim())
      throw new Error("Falta la descripción de un ítem.");
    if (!Number.isFinite(Number(it.quantity)) || Number(it.quantity) <= 0)
      throw new Error(`Cantidad inválida en "${it.description}".`);
    if (!Number.isFinite(Number(it.unitPrice)) || Number(it.unitPrice) < 0)
      throw new Error(`Precio inválido en "${it.description}".`);
  }

  const date =
    input.date && /^\d{4}-\d{2}-\d{2}$/.test(input.date)
      ? new Date(`${input.date}T12:00:00`)
      : new Date();

  const { lines, gross, discount, total } = computeTotals(
    input.items,
    input.discountAmount ?? 0
  );

  const dueDate = new Date(
    date.getTime() + (supplier.defaultDueDays || 0) * 86400000
  );

  const purchase = await prisma.purchase.create({
    data: {
      date,
      supplierId: supplier.id,
      gross,
      discountAmount: discount,
      total,
      paymentStatus: "PENDING",
      dueDate,
      notes: input.notes?.trim() || null,
      items: { create: lines },
    },
    select: { id: true },
  });

  // Optionally pay in full right away (registers a payment + expense).
  if (input.payNow && total > 0) {
    await createSupplierPayment({
      purchaseId: purchase.id,
      amount: total,
      method: input.payNow.method,
      date: input.date,
    });
  }

  return purchase;
}

export async function deletePurchase(id: string) {
  // Remove the Caja expense(s) this purchase generated, then delete it
  // (items + payments cascade).
  try {
    await prisma.cashMovement.deleteMany({ where: { purchaseId: id } });
  } catch (e) {
    console.error("cash reversal on purchase delete failed:", e);
  }
  await prisma.purchase.delete({ where: { id } });
}

// ---- Supplier payments ------------------------------------------------------

export type SupplierPaymentInput = {
  purchaseId: string;
  amount: number;
  method: string;
  date?: string;
  notes?: string;
};

export async function createSupplierPayment(input: SupplierPaymentInput) {
  const amount = Math.round(Number(input.amount));
  if (!Number.isFinite(amount) || amount <= 0)
    throw new Error("El monto del pago tiene que ser mayor a 0.");
  if (!PAYMENT_METHODS.includes(input.method as (typeof PAYMENT_METHODS)[number]))
    throw new Error("Método de pago inválido.");

  const purchase = await prisma.purchase.findUnique({
    where: { id: input.purchaseId },
    include: { supplier: { select: { name: true } } },
  });
  if (!purchase) throw new Error("Compra no encontrada.");

  const date =
    input.date && /^\d{4}-\d{2}-\d{2}$/.test(input.date)
      ? new Date(`${input.date}T12:00:00`)
      : new Date();

  const payment = await prisma.supplierPayment.create({
    data: {
      purchaseId: input.purchaseId,
      amount,
      method: input.method,
      date,
      notes: input.notes?.trim() || null,
    },
  });

  // Mirror into Caja as an expense.
  await prisma.cashMovement.create({
    data: {
      date,
      type: "EXPENSE",
      amount,
      description: `Pago proveedor — ${purchase.supplier.name}`,
      category: "Compra proveedor",
      status: "AVAILABLE",
      purchaseId: input.purchaseId,
    },
  });

  await recomputePurchaseStatus(input.purchaseId);
  return payment;
}

export async function deleteSupplierPayment(id: string) {
  const payment = await prisma.supplierPayment.findUnique({ where: { id } });
  if (!payment) return;
  await prisma.supplierPayment.delete({ where: { id } });
  await recomputePurchaseStatus(payment.purchaseId);
  // The matching Caja expense is left for the operator to remove if desired.
}

async function recomputePurchaseStatus(purchaseId: string) {
  const purchase = await prisma.purchase.findUnique({
    where: { id: purchaseId },
    select: { total: true },
  });
  if (!purchase) return;
  const agg = await prisma.supplierPayment.aggregate({
    _sum: { amount: true },
    where: { purchaseId },
  });
  const paid = agg._sum.amount ?? 0;
  const status =
    paid >= purchase.total ? "PAID" : paid > 0 ? "PARTIAL" : "PENDING";
  await prisma.purchase.update({
    where: { id: purchaseId },
    data: { paymentStatus: status },
  });
}

// ---- Reads: purchase list + detail -----------------------------------------

export async function listPurchases(limit = 100) {
  const purchases = await prisma.purchase.findMany({
    orderBy: { date: "desc" },
    take: limit,
    include: {
      supplier: { select: { name: true, type: true } },
      items: { select: { id: true } },
      payments: { select: { amount: true } },
    },
  });
  return purchases.map((p) => {
    const paid = p.payments.reduce((a, x) => a + x.amount, 0);
    return {
      id: p.id,
      date: p.date,
      dueDate: p.dueDate,
      supplierName: p.supplier.name,
      supplierType: p.supplier.type,
      itemsCount: p.items.length,
      gross: p.gross,
      discountAmount: p.discountAmount,
      total: p.total,
      paid,
      balance: p.total - paid,
      paymentStatus: p.paymentStatus,
    };
  });
}

export type PurchaseDetail = {
  id: string;
  date: Date;
  dueDate: Date | null;
  supplierName: string;
  gross: number;
  discountAmount: number;
  total: number;
  paid: number;
  balance: number;
  paymentStatus: string;
  notes: string | null;
  items: {
    id: string;
    description: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    subtotal: number;
  }[];
  payments: {
    id: string;
    date: Date;
    amount: number;
    method: string;
    methodLabel: string;
    notes: string | null;
  }[];
};

export async function getPurchaseDetail(
  id: string
): Promise<PurchaseDetail | null> {
  const p = await prisma.purchase.findUnique({
    where: { id },
    include: {
      supplier: { select: { name: true } },
      items: true,
      payments: { orderBy: { date: "desc" } },
    },
  });
  if (!p) return null;
  const paid = p.payments.reduce((a, x) => a + x.amount, 0);
  return {
    id: p.id,
    date: p.date,
    dueDate: p.dueDate,
    supplierName: p.supplier.name,
    gross: p.gross,
    discountAmount: p.discountAmount,
    total: p.total,
    paid,
    balance: p.total - paid,
    paymentStatus: p.paymentStatus,
    notes: p.notes,
    items: p.items.map((it) => ({
      id: it.id,
      description: it.description,
      quantity: it.quantity,
      unit: it.unit,
      unitPrice: it.unitPrice,
      subtotal: it.subtotal,
    })),
    payments: p.payments.map((pay) => ({
      id: pay.id,
      date: pay.date,
      amount: pay.amount,
      method: pay.method,
      methodLabel: INCOME_SOURCE_LABELS[pay.method] ?? pay.method,
      notes: pay.notes,
    })),
  };
}

// ---- Cuentas por pagar (read) ----------------------------------------------

export type SupplierPayable = {
  supplierId: string;
  supplierName: string;
  supplierType: string;
  supplierTypeLabel: string;
  balance: number;
  purchasesCount: number;
  oldestDays: number;
  aging: { d0_30: number; d31_60: number; d60plus: number };
};

async function loadOpenPayables() {
  const purchases = await prisma.purchase.findMany({
    where: { paymentStatus: { in: ["PARTIAL", "PENDING"] } },
    include: {
      supplier: { select: { id: true, name: true, type: true } },
      payments: { select: { amount: true } },
    },
  });
  const now = Date.now();
  return purchases
    .map((p) => {
      const paid = p.payments.reduce((a, x) => a + x.amount, 0);
      const balance = p.total - paid;
      const ref = p.dueDate ?? p.date;
      return {
        supplier: p.supplier,
        balance,
        agingDays: Math.max(0, Math.floor((now - ref.getTime()) / 86400000)),
      };
    })
    .filter((p) => p.balance > 0);
}

export async function listPayablesBySupplier(): Promise<SupplierPayable[]> {
  const open = await loadOpenPayables();
  const bySupplier = new Map<string, SupplierPayable>();
  for (const r of open) {
    let s = bySupplier.get(r.supplier.id);
    if (!s) {
      s = {
        supplierId: r.supplier.id,
        supplierName: r.supplier.name,
        supplierType: r.supplier.type,
        supplierTypeLabel:
          SUPPLIER_TYPE_LABELS[r.supplier.type] ?? r.supplier.type,
        balance: 0,
        purchasesCount: 0,
        oldestDays: 0,
        aging: { d0_30: 0, d31_60: 0, d60plus: 0 },
      };
      bySupplier.set(r.supplier.id, s);
    }
    s.balance += r.balance;
    s.purchasesCount += 1;
    s.oldestDays = Math.max(s.oldestDays, r.agingDays);
    if (r.agingDays <= 30) s.aging.d0_30 += r.balance;
    else if (r.agingDays <= 60) s.aging.d31_60 += r.balance;
    else s.aging.d60plus += r.balance;
  }
  return [...bySupplier.values()].sort((a, b) => b.balance - a.balance);
}

export async function getPayablesAging() {
  const open = await loadOpenPayables();
  const out = { total: 0, d0_30: 0, d31_60: 0, d60plus: 0 };
  for (const r of open) {
    out.total += r.balance;
    if (r.agingDays <= 30) out.d0_30 += r.balance;
    else if (r.agingDays <= 60) out.d31_60 += r.balance;
    else out.d60plus += r.balance;
  }
  return out;
}

// All purchases for one supplier (open + settled) with their payments.
export async function getSupplierPurchases(supplierId: string) {
  const purchases = await prisma.purchase.findMany({
    where: { supplierId },
    orderBy: { date: "desc" },
    include: { payments: { orderBy: { date: "desc" } }, items: { select: { id: true } } },
  });
  return purchases.map((p) => {
    const paid = p.payments.reduce((a, x) => a + x.amount, 0);
    return {
      id: p.id,
      date: p.date,
      dueDate: p.dueDate,
      total: p.total,
      paid,
      balance: p.total - paid,
      paymentStatus: p.paymentStatus,
      itemsCount: p.items.length,
      payments: p.payments.map((pay) => ({
        id: pay.id,
        date: pay.date,
        amount: pay.amount,
        method: pay.method,
        methodLabel: INCOME_SOURCE_LABELS[pay.method] ?? pay.method,
        notes: pay.notes,
      })),
    };
  });
}
