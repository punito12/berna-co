// Caja (cash box): incomes and expenses, with MP money-release accrual.
//
// A CashMovement is either INCOME or EXPENSE. INCOME from Mercado Pago may be
// PENDING until its real `accrualDate` (money_release_date) passes; everything
// else is AVAILABLE immediately. Today's balance counts only AVAILABLE rows;
// "a acreditar" sums the PENDING ones, grouped by release date.

import { prisma } from "@/lib/db";

// Sub-tabs for the Caja section (shared by the three Caja pages). Lives here
// (not in a page file) because Next.js forbids arbitrary named exports from
// route files.
export const CAJA_TABS = [
  { href: "/admin/caja", label: "Resumen" },
  { href: "/admin/caja/movimientos", label: "Movimientos" },
  { href: "/admin/caja/cargar", label: "Cargar" },
];

export const EXPENSE_CATEGORIES = [
  "Materia Prima",
  "Packaging",
  "Delivery/Flete",
  "Sueldos",
  "Servicios",
  "Otros",
] as const;

export const INCOME_SOURCES = [
  "EFECTIVO",
  "MERCADO_PAGO",
  "TRANSFERENCIA",
] as const;

export const INCOME_SOURCE_LABELS: Record<string, string> = {
  EFECTIVO: "Efectivo",
  MERCADO_PAGO: "Mercado Pago",
  TRANSFERENCIA: "Transferencia",
};

export type Movement = {
  id: string;
  date: Date;
  type: string; // INCOME | EXPENSE
  amount: number;
  description: string;
  category: string;
  source: string;
  status: string; // AVAILABLE | PENDING
  accrualDate: Date | null;
};

// ---- Accrual: flip due PENDING movements to AVAILABLE ----------------------

// Promote every PENDING income whose accrualDate is today-or-past to AVAILABLE.
// Called at the top of every Caja read so the box self-heals without a cron.
export async function settleDuePending(): Promise<number> {
  const now = new Date();
  const res = await prisma.cashMovement.updateMany({
    where: { status: "PENDING", accrualDate: { lte: now } },
    data: { status: "AVAILABLE" },
  });
  return res.count;
}

// ---- Dashboard --------------------------------------------------------------

export type CashDashboard = {
  availableBalance: number; // all AVAILABLE income - all AVAILABLE expense
  pendingTotal: number; // sum of PENDING income
  pendingByDate: { date: Date; total: number; count: number }[];
};

export async function getCashDashboard(): Promise<CashDashboard> {
  await settleDuePending();

  const [incomeAgg, expenseAgg, pending] = await Promise.all([
    prisma.cashMovement.aggregate({
      _sum: { amount: true },
      where: { type: "INCOME", status: "AVAILABLE" },
    }),
    prisma.cashMovement.aggregate({
      _sum: { amount: true },
      where: { type: "EXPENSE", status: "AVAILABLE" },
    }),
    prisma.cashMovement.findMany({
      where: { type: "INCOME", status: "PENDING" },
      select: { amount: true, accrualDate: true },
      orderBy: { accrualDate: "asc" },
    }),
  ]);

  const availableBalance =
    (incomeAgg._sum.amount ?? 0) - (expenseAgg._sum.amount ?? 0);

  // Group pending money by its real release date (yyyy-mm-dd buckets).
  const buckets = new Map<string, { date: Date; total: number; count: number }>();
  let pendingTotal = 0;
  for (const m of pending) {
    pendingTotal += m.amount;
    const d = m.accrualDate ?? new Date();
    const key = ymd(d);
    const b = buckets.get(key);
    if (b) {
      b.total += m.amount;
      b.count += 1;
    } else {
      buckets.set(key, { date: d, total: m.amount, count: 1 });
    }
  }

  return {
    availableBalance,
    pendingTotal,
    pendingByDate: [...buckets.values()].sort(
      (a, b) => a.date.getTime() - b.date.getTime()
    ),
  };
}

// ---- History (filterable) ---------------------------------------------------

export type MovementRow = Movement & { runningBalance: number };

// Movements in [from, to), oldest first, each carrying a running AVAILABLE
// balance. PENDING incomes don't move the running balance (not yet realized).
export async function listMovements(
  from: Date,
  to: Date
): Promise<MovementRow[]> {
  await settleDuePending();
  const rows = await prisma.cashMovement.findMany({
    where: { date: { gte: from, lt: to } },
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
  });

  let running = 0;
  return rows.map((r) => {
    const realized = r.status === "AVAILABLE";
    if (realized) {
      running += r.type === "INCOME" ? r.amount : -r.amount;
    }
    return {
      id: r.id,
      date: r.date,
      type: r.type,
      amount: r.amount,
      description: r.description,
      category: r.category,
      source: r.source,
      status: r.status,
      accrualDate: r.accrualDate,
      runningBalance: running,
    };
  });
}

// ---- Monthly summary + expense breakdown ------------------------------------

export type MonthlySummary = {
  income: number; // realized income in the month
  expense: number;
  net: number;
  byCategory: { category: string; total: number }[];
};

export async function getMonthlySummary(
  from: Date,
  to: Date
): Promise<MonthlySummary> {
  await settleDuePending();
  const rows = await prisma.cashMovement.findMany({
    where: { date: { gte: from, lt: to }, status: "AVAILABLE" },
    select: { type: true, amount: true, category: true },
  });

  let income = 0;
  let expense = 0;
  const cat = new Map<string, number>();
  for (const r of rows) {
    if (r.type === "INCOME") income += r.amount;
    else {
      expense += r.amount;
      cat.set(r.category, (cat.get(r.category) ?? 0) + r.amount);
    }
  }

  return {
    income,
    expense,
    net: income - expense,
    byCategory: [...cat.entries()]
      .map(([category, total]) => ({ category, total }))
      .sort((a, b) => b.total - a.total),
  };
}

// ---- Manual create ----------------------------------------------------------

export type IncomeInput = {
  date: string; // yyyy-mm-dd
  amount: number;
  description: string;
  source: string; // EFECTIVO | MERCADO_PAGO | TRANSFERENCIA
};

export async function createManualIncome(input: IncomeInput) {
  const amount = Math.round(Number(input.amount));
  if (!Number.isFinite(amount) || amount <= 0)
    throw new Error("El monto tiene que ser mayor a 0.");
  const description = input.description.trim();
  if (!description) throw new Error("Poné una descripción.");
  if (!INCOME_SOURCES.includes(input.source as (typeof INCOME_SOURCES)[number]))
    throw new Error("Origen inválido.");
  const date = parseDate(input.date);

  return prisma.cashMovement.create({
    data: {
      date,
      type: "INCOME",
      amount,
      description,
      category: "Ingreso manual",
      source: input.source,
      status: "AVAILABLE",
    },
  });
}

export type ExpenseInput = {
  date: string; // yyyy-mm-dd
  amount: number;
  description: string;
  category: string;
};

export async function createExpense(input: ExpenseInput) {
  const amount = Math.round(Number(input.amount));
  if (!Number.isFinite(amount) || amount <= 0)
    throw new Error("El monto tiene que ser mayor a 0.");
  const description = input.description.trim();
  if (!description) throw new Error("Poné una descripción.");
  if (
    !EXPENSE_CATEGORIES.includes(
      input.category as (typeof EXPENSE_CATEGORIES)[number]
    )
  )
    throw new Error("Categoría inválida.");
  const date = parseDate(input.date);

  return prisma.cashMovement.create({
    data: {
      date,
      type: "EXPENSE",
      amount,
      description,
      category: input.category,
      status: "AVAILABLE",
    },
  });
}

export async function deleteMovement(id: string) {
  await prisma.cashMovement.delete({ where: { id } });
}

// ---- Auto income from web orders / manual sales (idempotent) ---------------

// Cash web order confirmed: one AVAILABLE income, deduped by orderId.
export async function recordCashOrderIncome(order: {
  id: string;
  total: number;
  customerName: string;
  createdAt: Date;
}): Promise<void> {
  const existing = await prisma.cashMovement.findFirst({
    where: { orderId: order.id },
    select: { id: true },
  });
  if (existing) return;
  await prisma.cashMovement.create({
    data: {
      date: order.createdAt,
      type: "INCOME",
      amount: order.total,
      description: `Pedido web (efectivo) — ${order.customerName}`,
      category: "Venta web",
      source: "EFECTIVO",
      status: "AVAILABLE",
      orderId: order.id,
    },
  });
}

// Manual sale recorded: one AVAILABLE income, deduped by saleId.
export async function recordManualSaleIncome(sale: {
  id: string;
  net: number;
  soldAt: Date;
  label: string;
}): Promise<void> {
  if (sale.net <= 0) return;
  const existing = await prisma.cashMovement.findFirst({
    where: { saleId: sale.id },
    select: { id: true },
  });
  if (existing) return;
  await prisma.cashMovement.create({
    data: {
      date: sale.soldAt,
      type: "INCOME",
      amount: sale.net,
      description: `Venta manual — ${sale.label}`,
      category: "Venta manual",
      source: "EFECTIVO",
      status: "AVAILABLE",
      saleId: sale.id,
    },
  });
}

// MP payment approved: one income (PENDING until accrualDate), deduped by
// paymentId. `releaseDate` is MP's money_release_date (null => available now).
export async function recordMpPaymentIncome(args: {
  paymentId: string;
  orderId: string;
  amount: number;
  customerName: string;
  approvedAt: Date;
  releaseDate: Date | null;
}): Promise<void> {
  const existing = await prisma.cashMovement.findUnique({
    where: { paymentId: args.paymentId },
    select: { id: true },
  });
  if (existing) return;

  const now = new Date();
  const isPending = Boolean(args.releaseDate && args.releaseDate > now);

  await prisma.cashMovement.create({
    data: {
      date: args.approvedAt,
      type: "INCOME",
      amount: args.amount,
      description: `Pedido web (MP) — ${args.customerName}`,
      category: "Venta web",
      source: "MERCADO_PAGO",
      status: isPending ? "PENDING" : "AVAILABLE",
      accrualDate: args.releaseDate,
      paymentId: args.paymentId,
      orderId: args.orderId,
    },
  });
}

// ---- helpers ----------------------------------------------------------------

function ymd(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function parseDate(s: string): Date {
  // Treat the yyyy-mm-dd as a local calendar day at noon (avoids TZ drift).
  if (s && /^\d{4}-\d{2}-\d{2}$/.test(s)) return new Date(`${s}T12:00:00`);
  return new Date();
}
