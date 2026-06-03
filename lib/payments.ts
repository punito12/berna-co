// Cuenta corriente (cuentas por cobrar): payments against sales/orders.
//
// A Payment records money received toward a ManualSale or an Order. Each one
// creates a CashMovement (INCOME) in Caja, and the sale/order paymentStatus is
// recomputed from the sum of its payments (PAID / PARTIAL / PENDING).
//
// Only sales/orders in cuenta corriente carry a balance here; cash sales and
// MP web orders are PAID and excluded from "cuentas por cobrar".

import { prisma } from "@/lib/db";
import { INCOME_SOURCE_LABELS } from "@/lib/cash";

export const PAYMENT_METHODS = [
  "EFECTIVO",
  "MERCADO_PAGO",
  "TRANSFERENCIA",
] as const;

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  PAID: "Pagado",
  PARTIAL: "Parcial",
  PENDING: "A deber",
};

// Default credit term (days) for wholesale customers.
export const DEFAULT_DUE_DAYS = 30;

// ---- Create a payment -------------------------------------------------------

export type PaymentInput = {
  amount: number;
  method: string;
  date?: string; // yyyy-mm-dd; defaults to today
  notes?: string;
  saleId?: string;
  orderId?: string;
};

export async function createPayment(input: PaymentInput) {
  const amount = Math.round(Number(input.amount));
  if (!Number.isFinite(amount) || amount <= 0)
    throw new Error("El monto del pago tiene que ser mayor a 0.");
  if (!PAYMENT_METHODS.includes(input.method as (typeof PAYMENT_METHODS)[number]))
    throw new Error("Método de pago inválido.");
  if (!input.saleId && !input.orderId)
    throw new Error("El pago tiene que estar asociado a una venta o pedido.");

  const date =
    input.date && /^\d{4}-\d{2}-\d{2}$/.test(input.date)
      ? new Date(`${input.date}T12:00:00`)
      : new Date();

  // Build the description from the linked sale/order.
  let label = "Cobro";
  if (input.saleId) {
    const s = await prisma.manualSale.findUnique({
      where: { id: input.saleId },
      select: { customerName: true },
    });
    if (!s) throw new Error("Venta no encontrada.");
    label = `Cobro venta — ${s.customerName ?? "Sin nombre"}`;
  } else if (input.orderId) {
    const o = await prisma.order.findUnique({
      where: { id: input.orderId },
      select: { customerName: true },
    });
    if (!o) throw new Error("Pedido no encontrado.");
    label = `Cobro pedido — ${o.customerName}`;
  }

  // Create the payment + its CashMovement together, then recompute status.
  const payment = await prisma.payment.create({
    data: {
      amount,
      method: input.method,
      date,
      notes: input.notes?.trim() || null,
      saleId: input.saleId ?? null,
      orderId: input.orderId ?? null,
    },
  });

  await prisma.cashMovement.create({
    data: {
      date,
      type: "INCOME",
      amount,
      description: label,
      category: "Cobro cuenta corriente",
      source: input.method,
      status: "AVAILABLE",
      saleId: input.saleId ?? null,
      orderId: input.orderId ?? null,
    },
  });

  await recomputePaymentStatus({
    saleId: input.saleId,
    orderId: input.orderId,
  });

  return payment;
}

export async function deletePayment(id: string) {
  const payment = await prisma.payment.findUnique({ where: { id } });
  if (!payment) return;
  await prisma.payment.delete({ where: { id } });
  await recomputePaymentStatus({
    saleId: payment.saleId ?? undefined,
    orderId: payment.orderId ?? undefined,
  });
  // Note: the matching CashMovement is left for the operator to remove from
  // Caja if desired (kept simple — no automatic cash reversal here).
}

// Sum payments for a sale/order and set PAID / PARTIAL / PENDING accordingly.
async function recomputePaymentStatus(ref: {
  saleId?: string;
  orderId?: string;
}) {
  if (ref.saleId) {
    const sale = await prisma.manualSale.findUnique({
      where: { id: ref.saleId },
      select: { net: true },
    });
    if (!sale) return;
    const paid = await sumPayments({ saleId: ref.saleId });
    await prisma.manualSale.update({
      where: { id: ref.saleId },
      data: { paymentStatus: statusFor(paid, sale.net) },
    });
  } else if (ref.orderId) {
    const order = await prisma.order.findUnique({
      where: { id: ref.orderId },
      select: { total: true },
    });
    if (!order) return;
    const paid = await sumPayments({ orderId: ref.orderId });
    await prisma.order.update({
      where: { id: ref.orderId },
      data: { paymentStatus: statusFor(paid, order.total) },
    });
  }
}

function statusFor(paid: number, total: number): string {
  if (paid >= total) return "PAID";
  if (paid > 0) return "PARTIAL";
  return "PENDING";
}

async function sumPayments(where: {
  saleId?: string;
  orderId?: string;
}): Promise<number> {
  const agg = await prisma.payment.aggregate({
    _sum: { amount: true },
    where,
  });
  return agg._sum.amount ?? 0;
}

// ---- Cuentas por cobrar (read) ---------------------------------------------

export type ReceivableSale = {
  id: string;
  kind: "MANUAL" | "ORDER";
  date: Date;
  dueDate: Date | null;
  total: number;
  paid: number;
  balance: number;
  paymentStatus: string;
  agingDays: number; // days since due (or since sale if no due date)
};

export type CustomerReceivable = {
  customerId: string | null;
  customerName: string;
  balance: number;
  salesCount: number;
  oldestDays: number;
  aging: { d0_30: number; d31_60: number; d60plus: number };
};

// All sales/orders that still owe money (PARTIAL or PENDING), normalized.
async function loadOpenReceivables(): Promise<
  (ReceivableSale & { customerId: string | null; customerName: string })[]
> {
  const [sales, orders] = await Promise.all([
    prisma.manualSale.findMany({
      where: { paymentStatus: { in: ["PARTIAL", "PENDING"] } },
      include: { payments: { select: { amount: true } } },
    }),
    prisma.order.findMany({
      where: { paymentStatus: { in: ["PARTIAL", "PENDING"] } },
      include: { payments: { select: { amount: true } } },
    }),
  ]);

  const now = Date.now();
  const out: (ReceivableSale & {
    customerId: string | null;
    customerName: string;
  })[] = [];

  for (const s of sales) {
    const paid = s.payments.reduce((a, p) => a + p.amount, 0);
    const balance = s.net - paid;
    if (balance <= 0) continue;
    const ref = s.dueDate ?? s.soldAt;
    out.push({
      id: s.id,
      kind: "MANUAL",
      date: s.soldAt,
      dueDate: s.dueDate,
      total: s.net,
      paid,
      balance,
      paymentStatus: s.paymentStatus,
      agingDays: Math.max(0, Math.floor((now - ref.getTime()) / 86400000)),
      customerId: s.customerId,
      customerName: s.customerName ?? "Sin nombre",
    });
  }
  for (const o of orders) {
    const paid = o.payments.reduce((a, p) => a + p.amount, 0);
    const balance = o.total - paid;
    if (balance <= 0) continue;
    const ref = o.dueDate ?? o.createdAt;
    out.push({
      id: o.id,
      kind: "ORDER",
      date: o.createdAt,
      dueDate: o.dueDate,
      total: o.total,
      paid,
      balance,
      paymentStatus: o.paymentStatus,
      agingDays: Math.max(0, Math.floor((now - ref.getTime()) / 86400000)),
      customerId: o.customerId,
      customerName: o.customerName,
    });
  }
  return out;
}

// Customers with an outstanding balance, ordered by amount owed (desc), with a
// simple aging breakdown (0-30 / 31-60 / 60+ days).
export async function listReceivablesByCustomer(): Promise<
  CustomerReceivable[]
> {
  const open = await loadOpenReceivables();

  const byCustomer = new Map<string, CustomerReceivable>();
  for (const r of open) {
    // Group by customerId, or by name when there's no linked customer.
    const key = r.customerId ?? `name:${r.customerName}`;
    let c = byCustomer.get(key);
    if (!c) {
      c = {
        customerId: r.customerId,
        customerName: r.customerName,
        balance: 0,
        salesCount: 0,
        oldestDays: 0,
        aging: { d0_30: 0, d31_60: 0, d60plus: 0 },
      };
      byCustomer.set(key, c);
    }
    c.balance += r.balance;
    c.salesCount += 1;
    c.oldestDays = Math.max(c.oldestDays, r.agingDays);
    if (r.agingDays <= 30) c.aging.d0_30 += r.balance;
    else if (r.agingDays <= 60) c.aging.d31_60 += r.balance;
    else c.aging.d60plus += r.balance;
  }

  return [...byCustomer.values()].sort((a, b) => b.balance - a.balance);
}

// Global aging totals across all open receivables.
export async function getReceivablesAging(): Promise<{
  total: number;
  d0_30: number;
  d31_60: number;
  d60plus: number;
}> {
  const open = await loadOpenReceivables();
  const out = { total: 0, d0_30: 0, d31_60: 0, d60plus: 0 };
  for (const r of open) {
    out.total += r.balance;
    if (r.agingDays <= 30) out.d0_30 += r.balance;
    else if (r.agingDays <= 60) out.d31_60 += r.balance;
    else out.d60plus += r.balance;
  }
  return out;
}

// Detail for one customer: every sale/order (open or settled) + its payments.
export type CustomerLedger = {
  customerId: string | null;
  customerName: string;
  balance: number;
  sales: {
    id: string;
    kind: "MANUAL" | "ORDER";
    date: Date;
    dueDate: Date | null;
    total: number;
    paid: number;
    balance: number;
    paymentStatus: string;
    payments: {
      id: string;
      date: Date;
      amount: number;
      method: string;
      methodLabel: string;
      notes: string | null;
    }[];
  }[];
};

export async function getCustomerLedger(
  customerId: string
): Promise<CustomerLedger | null> {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: { id: true, name: true },
  });
  if (!customer) return null;

  const [sales, orders] = await Promise.all([
    prisma.manualSale.findMany({
      where: { customerId },
      orderBy: { soldAt: "desc" },
      include: { payments: { orderBy: { date: "desc" } } },
    }),
    prisma.order.findMany({
      where: { customerId },
      orderBy: { createdAt: "desc" },
      include: { payments: { orderBy: { date: "desc" } } },
    }),
  ]);

  const rows: CustomerLedger["sales"] = [];
  let balance = 0;

  const mapPayments = (
    ps: { id: string; date: Date; amount: number; method: string; notes: string | null }[]
  ) =>
    ps.map((p) => ({
      id: p.id,
      date: p.date,
      amount: p.amount,
      method: p.method,
      methodLabel: INCOME_SOURCE_LABELS[p.method] ?? p.method,
      notes: p.notes,
    }));

  for (const s of sales) {
    const paid = s.payments.reduce((a, p) => a + p.amount, 0);
    const bal = s.net - paid;
    balance += Math.max(0, bal);
    rows.push({
      id: s.id,
      kind: "MANUAL",
      date: s.soldAt,
      dueDate: s.dueDate,
      total: s.net,
      paid,
      balance: bal,
      paymentStatus: s.paymentStatus,
      payments: mapPayments(s.payments),
    });
  }
  for (const o of orders) {
    const paid = o.payments.reduce((a, p) => a + p.amount, 0);
    const bal = o.total - paid;
    balance += Math.max(0, bal);
    rows.push({
      id: o.id,
      kind: "ORDER",
      date: o.createdAt,
      dueDate: o.dueDate,
      total: o.total,
      paid,
      balance: bal,
      paymentStatus: o.paymentStatus,
      payments: mapPayments(o.payments),
    });
  }

  rows.sort((a, b) => b.date.getTime() - a.date.getTime());

  return {
    customerId: customer.id,
    customerName: customer.name,
    balance,
    sales: rows,
  };
}
