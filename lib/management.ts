// Admin "Gestión" business logic: customers, manual sales, billing dashboard
// and profitability. All money is in whole pesos. Kept separate from the
// storefront logic. API routes call these after checking isAuthenticated().

import { prisma } from "@/lib/db";
import { recordManualSaleIncome } from "@/lib/cash";
import { DEFAULT_DUE_DAYS, createPayment } from "@/lib/payments";
import { adjustStockForLines } from "@/lib/stock";

// ---- Customers ----

export const CUSTOMER_TYPES = ["MINORISTA", "MAYORISTA", "KIOSCO"] as const;
export type CustomerType = (typeof CUSTOMER_TYPES)[number];

// Suggested default discount per customer type (percent).
export const DEFAULT_DISCOUNT_BY_TYPE: Record<string, number> = {
  MINORISTA: 10,
  MAYORISTA: 25,
  KIOSCO: 30,
};

export const CUSTOMER_TYPE_LABELS: Record<string, string> = {
  MINORISTA: "Minorista",
  MAYORISTA: "Mayorista",
  KIOSCO: "Kiosco",
};

export type CustomerInput = {
  name: string;
  type: string;
  defaultDiscount: number;
  phone?: string;
  notes?: string;
  barrioId?: string | null;
  lot?: string;
};

function cleanCustomer(input: CustomerInput) {
  const name = input.name.trim();
  if (!name) throw new Error("El cliente necesita un nombre.");
  if (!CUSTOMER_TYPES.includes(input.type as CustomerType)) {
    throw new Error("Tipo de cliente inválido.");
  }
  const discount = Math.round(Number(input.defaultDiscount));
  if (!Number.isFinite(discount) || discount < 0 || discount > 100) {
    throw new Error("El descuento debe estar entre 0 y 100.");
  }
  return {
    name,
    type: input.type,
    defaultDiscount: discount,
    phone: input.phone?.trim() || null,
    notes: input.notes?.trim() || null,
    barrioId: input.barrioId || null,
    lot: input.lot?.trim() || null,
  };
}

// Searches customers by name OR barrio name. Empty query returns the most
// recent ones. Includes barrio + a count of linked web orders.
export async function searchCustomers(query: string) {
  const q = query.trim();
  return prisma.customer.findMany({
    where: q
      ? {
          OR: [
            { name: { contains: q } },
            { barrio: { name: { contains: q } } },
          ],
        }
      : undefined,
    include: { barrio: true, _count: { select: { orders: true, sales: true } } },
    orderBy: { name: "asc" },
    take: q ? 50 : 30,
  });
}

// Full customer file: data + web orders + manual sales.
export async function getCustomerFile(id: string) {
  return prisma.customer.findUnique({
    where: { id },
    include: {
      barrio: true,
      orders: {
        orderBy: { createdAt: "desc" },
        include: { items: { include: { product: true } } },
      },
      sales: {
        orderBy: { soldAt: "desc" },
        include: { items: true },
      },
    },
  });
}

export async function createCustomer(input: CustomerInput) {
  return prisma.customer.create({
    data: { ...cleanCustomer(input), source: "MANUAL" },
  });
}

export async function updateCustomer(id: string, input: CustomerInput) {
  await prisma.customer.update({ where: { id }, data: cleanCustomer(input) });
}

// Deletes a customer. Their orders/sales stay (customerId set to null).
export async function deleteCustomer(id: string) {
  await prisma.customer.delete({ where: { id } });
}

// Finds (or creates) the customer for a web order, by name + phone. Called
// after an order is saved so the order shows up in the customer's file.
export async function linkOrderToCustomer(orderId: string) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return;

  const name = order.customerName.trim();
  const phone = order.customerPhone.trim();

  // Match an existing customer by phone first (most reliable), else by name.
  let customer =
    (phone
      ? await prisma.customer.findFirst({ where: { phone } })
      : null) ??
    (await prisma.customer.findFirst({ where: { name } }));

  if (!customer) {
    customer = await prisma.customer.create({
      data: {
        name,
        phone: phone || null,
        email: order.customerEmail || null,
        type: "MINORISTA",
        defaultDiscount: 0,
        source: "WEB",
      },
    });
  }

  await prisma.order.update({
    where: { id: orderId },
    data: { customerId: customer.id },
  });
}

// ---- Barrios ----

export async function listBarrios() {
  return prisma.barrio.findMany({
    include: { _count: { select: { customers: true } } },
    orderBy: { name: "asc" },
  });
}

export async function createBarrio(name: string) {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("El barrio necesita un nombre.");
  const existing = await prisma.barrio.findUnique({ where: { name: trimmed } });
  if (existing) throw new Error("Ya existe un barrio con ese nombre.");
  await prisma.barrio.create({ data: { name: trimmed } });
}

export async function updateBarrio(id: string, name: string) {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("El barrio necesita un nombre.");
  await prisma.barrio.update({ where: { id }, data: { name: trimmed } });
}

// Deletes a barrio; its customers keep existing (barrioId set to null).
export async function deleteBarrio(id: string) {
  await prisma.barrio.delete({ where: { id } });
}

// Aggregated view of one barrio: its customers + their orders/sales totals.
export async function getBarrioReport(id: string) {
  const barrio = await prisma.barrio.findUnique({
    where: { id },
    include: {
      customers: {
        include: {
          orders: { include: { items: true } },
          sales: { include: { items: true } },
        },
        orderBy: { name: "asc" },
      },
    },
  });
  if (!barrio) return null;

  let ordersCount = 0;
  let units = 0;
  let gross = 0;
  let net = 0;

  const customers = barrio.customers.map((c) => {
    let cNet = 0;
    let cOrders = 0;
    // Web orders: bill on products subtotal (exclude shipping).
    for (const o of c.orders) {
      if (o.status === "CANCELLED") continue;
      const subtotal = o.total - (o.shippingCost ?? 0);
      cNet += subtotal;
      gross += subtotal;
      net += subtotal;
      cOrders += 1;
      ordersCount += 1;
      for (const it of o.items) units += it.quantity;
    }
    // Manual sales.
    for (const s of c.sales) {
      cNet += s.net;
      gross += s.gross;
      net += s.net;
      cOrders += 1;
      ordersCount += 1;
      for (const it of s.items) units += it.quantity;
    }
    return {
      id: c.id,
      name: c.name,
      type: c.type,
      orders: cOrders,
      net: cNet,
    };
  });

  return {
    id: barrio.id,
    name: barrio.name,
    customersCount: barrio.customers.length,
    ordersCount,
    units,
    gross,
    net,
    customers,
  };
}

// ---- Manual sales ----

export const SALE_CHANNELS = ["WEB", "WHATSAPP", "MAYORISTA", "KIOSCO"] as const;
export const SALE_CHANNEL_LABELS: Record<string, string> = {
  WEB: "Web",
  WHATSAPP: "WhatsApp",
  MAYORISTA: "Mayorista",
  KIOSCO: "Kiosco",
};

export type SaleItemInput = {
  productId?: string; // optional: a free-text item has none
  productName: string; // already includes the empanado label when applicable
  breadcrumbType?: string; // chosen empanado (used to discount stock)
  quantity: number; // units sold
  unitPrice: number; // pesos per unit
};

export type SaleInput = {
  soldAt: string; // ISO date
  channel: string;
  customerId?: string; // optional
  customerName?: string; // free text when no customer chosen
  discountPct: number;
  notes?: string;
  items: SaleItemInput[];
};

// Computes gross/discount/net for a set of items + a discount percentage.
// gross = Σ(quantity × unitPrice), rounded per line; net = gross − discount.
export function computeSaleTotals(items: SaleItemInput[], discountPct: number) {
  let gross = 0;
  const lines = items.map((it) => {
    const qty = Math.round(Number(it.quantity));
    const price = Math.round(Number(it.unitPrice));
    const lineSubtotal = Math.round(qty * price);
    gross += lineSubtotal;
    return { ...it, quantity: qty, unitPrice: price, lineSubtotal };
  });
  const pct = Math.min(100, Math.max(0, Math.round(discountPct)));
  const discountAmount = Math.round((gross * pct) / 100);
  const net = gross - discountAmount;
  return { lines, gross, discountAmount, net, pct };
}

export async function createManualSale(input: SaleInput) {
  if (!Array.isArray(input.items) || input.items.length === 0) {
    throw new Error("Agregá al menos un producto a la venta.");
  }
  if (!SALE_CHANNELS.includes(input.channel as (typeof SALE_CHANNELS)[number])) {
    throw new Error("Canal de venta inválido.");
  }
  const soldAt = new Date(input.soldAt);
  if (Number.isNaN(soldAt.getTime())) throw new Error("Fecha inválida.");

  // Validate each item.
  for (const it of input.items) {
    if (!it.productName?.trim()) throw new Error("Falta el nombre de un producto.");
    if (!Number.isFinite(Number(it.quantity)) || Number(it.quantity) <= 0) {
      throw new Error(`Cantidad inválida para ${it.productName}.`);
    }
    if (!Number.isFinite(Number(it.unitPrice)) || Number(it.unitPrice) < 0) {
      throw new Error(`Precio inválido para ${it.productName}.`);
    }
  }

  const { lines, gross, discountAmount, net, pct } = computeSaleTotals(
    input.items,
    input.discountPct
  );

  // A chosen customer name takes precedence; else the free-text name.
  const customer = input.customerId
    ? await prisma.customer.findUnique({ where: { id: input.customerId } })
    : null;
  const customerName =
    customer?.name ?? input.customerName?.trim() ?? null;

  // Cuenta corriente: wholesale customers default to credit (PENDING + due date
  // in 30 days) and DON'T auto-collect into Caja — the income is recorded when
  // a payment is registered. Everyone else is PAID and auto-collects as before.
  const onCredit = customer?.type === "MAYORISTA";
  const dueDate = onCredit
    ? new Date(soldAt.getTime() + DEFAULT_DUE_DAYS * 86400000)
    : null;

  const sale = await prisma.manualSale.create({
    data: {
      soldAt,
      channel: input.channel,
      customerId: customer?.id ?? null,
      customerName,
      discountPct: pct,
      gross,
      discountAmount,
      net,
      notes: input.notes?.trim() || null,
      paymentStatus: onCredit ? "PENDING" : "PAID",
      dueDate,
      items: {
        create: lines.map((l) => ({
          productId: l.productId || null,
          productName: l.productName.trim(),
          breadcrumbType: l.breadcrumbType || null,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          lineSubtotal: l.lineSubtotal,
        })),
      },
    },
    select: { id: true, net: true, soldAt: true },
  });

  // Discount stock for the lines that track a product + empanado (free-text
  // lines are skipped). Cancelling the sale later restocks the same amount.
  try {
    await adjustStockForLines(lines, -1, {
      type: "SALE",
      referenceType: "MANUAL_SALE",
      referenceId: sale.id,
    });
  } catch (e) {
    console.error("adjustStockForLines (sale create) failed:", e);
  }

  // Contado: mirror the sale into Caja as income (deduped by saleId). Credit
  // sales wait for a Payment to create the income.
  if (!onCredit) {
    try {
      await recordManualSaleIncome({
        id: sale.id,
        net: sale.net,
        soldAt: sale.soldAt,
        label: customerName ?? SALE_CHANNEL_LABELS[input.channel] ?? "Venta",
      });
    } catch (e) {
      console.error("recordManualSaleIncome failed:", e);
    }
  }
}

export async function listManualSales(limit = 100) {
  return prisma.manualSale.findMany({
    orderBy: { soldAt: "desc" },
    take: limit,
    include: { items: true, customer: true },
  });
}

// Reverse everything a manual sale put into the system: restock its items and
// remove the Caja movements it generated (auto-income + payment incomes). Used
// by both cancel and delete.
async function reverseSaleEffects(saleId: string) {
  const sale = await prisma.manualSale.findUnique({
    where: { id: saleId },
    include: { items: true },
  });
  if (!sale) return;
  // Restock (only lines that tracked product + empanado).
  try {
    await adjustStockForLines(sale.items, 1, {
      type: "ADJUSTMENT",
      referenceType: "MANUAL_SALE",
      referenceId: saleId,
      notes: "Reintegro por cancelación/eliminación de venta",
    });
  } catch (e) {
    console.error("restock on reverse failed:", e);
  }
  // Remove the Caja income(s) tied to this sale (auto-income and any payment
  // incomes share the saleId on the CashMovement).
  try {
    await prisma.cashMovement.deleteMany({ where: { saleId } });
  } catch (e) {
    console.error("cash reversal on sale failed:", e);
  }
}

export async function deleteManualSale(id: string) {
  // Reverse stock + Caja first, then delete (payments cascade-delete with it).
  await reverseSaleEffects(id);
  await prisma.manualSale.delete({ where: { id } });
}

export const SALE_DELIVERY_STATUSES = [
  "PENDING",
  "DELIVERED",
  "CANCELLED",
] as const;

// Set the logistic status of a manual sale. Cancelling restocks and reverses
// its Caja movements (once). Moving OUT of cancelled re-discounts the stock.
export async function setSaleDeliveryStatus(id: string, status: string) {
  if (
    !SALE_DELIVERY_STATUSES.includes(
      status as (typeof SALE_DELIVERY_STATUSES)[number]
    )
  )
    throw new Error("Estado inválido.");

  const sale = await prisma.manualSale.findUnique({
    where: { id },
    include: { items: true },
  });
  if (!sale) throw new Error("Venta no encontrada.");
  if (sale.deliveryStatus === status) return;

  const wasCancelled = sale.deliveryStatus === "CANCELLED";
  const willCancel = status === "CANCELLED";

  if (willCancel && !wasCancelled) {
    await reverseSaleEffects(id);
  } else if (wasCancelled && !willCancel) {
    // Re-activating a cancelled sale: discount stock again. (Caja income is not
    // auto-recreated — re-register the payment/cobro if it applied.)
    try {
      await adjustStockForLines(sale.items, -1, {
        type: "SALE",
        referenceType: "MANUAL_SALE",
        referenceId: id,
        notes: "Reactivación de venta",
      });
    } catch (e) {
      console.error("re-discount on un-cancel failed:", e);
    }
  }

  await prisma.manualSale.update({
    where: { id },
    data: { deliveryStatus: status },
  });
}

// "Marcar pagado": register a payment for the outstanding balance, so it flows
// through Caja and cuenta corriente like any other cobro. No-op if already paid.
export async function markSalePaid(id: string, method = "EFECTIVO") {
  const sale = await prisma.manualSale.findUnique({
    where: { id },
    include: { payments: { select: { amount: true } } },
  });
  if (!sale) throw new Error("Venta no encontrada.");
  const paid = sale.payments.reduce((a, p) => a + p.amount, 0);
  const balance = sale.net - paid;
  if (balance <= 0) return; // already settled (e.g. contado auto-income)
  await createPayment({ amount: balance, method, saleId: id });
}

// Unified sales feed: web orders (origin WEB) + manual sales (their channel),
// normalized into one row shape and sorted by date. Backs the "Pedidos y
// ventas" screen. Filters (all combinable): origin, customer type, status,
// date range. Status is normalized to the 3-state cycle CONFIRMED / DELIVERED
// / CANCELLED (legacy PENDING/READY collapse to CONFIRMED).
export type UnifiedSale = {
  id: string;
  kind: "ORDER" | "MANUAL"; // which table it came from
  origin: string; // WEB | WHATSAPP | MAYORISTA | KIOSCO
  date: Date;
  customerName: string;
  customerType: string | null; // MINORISTA | MAYORISTA | KIOSCO
  total: number;
  status: string; // CONFIRMED | DELIVERED | CANCELLED
  paymentLabel: string; // short payment hint for the row
  itemsCount: number;
  href: string; // detail page
};

export type UnifiedFilters = {
  origin?: string; // WEB | WHATSAPP | MAYORISTA | KIOSCO
  customerType?: string; // MINORISTA | MAYORISTA | KIOSCO
  status?: string; // CONFIRMED | DELIVERED | CANCELLED
  from?: Date;
  to?: Date;
  limit?: number;
};

// Collapse any legacy/granular status into the 3-state cycle.
function normalizeStatus(raw: string): string {
  if (raw === "CANCELLED") return "CANCELLED";
  if (raw === "DELIVERED") return "DELIVERED";
  return "CONFIRMED"; // PENDING/READY/CONFIRMED all show as confirmed
}

function detailHref(kind: "ORDER" | "MANUAL", id: string): string {
  return `/admin/operaciones/ventas/${kind === "ORDER" ? "order" : "sale"}/${id}`;
}

export async function listSalesUnified(
  filters: UnifiedFilters
): Promise<UnifiedSale[]> {
  const limit = filters.limit ?? 500;
  const origin = filters.origin;
  const wantType = filters.customerType;

  const includeOrders = !origin || origin === "WEB";
  const dateRange =
    filters.from || filters.to
      ? {
          ...(filters.from ? { gte: filters.from } : {}),
          ...(filters.to ? { lt: filters.to } : {}),
        }
      : undefined;

  const orderWhere: Record<string, unknown> = {};
  if (dateRange) orderWhere.createdAt = dateRange;
  if (wantType) orderWhere.customer = { type: wantType };

  const saleWhere: Record<string, unknown> = {};
  if (origin && origin !== "WEB") saleWhere.channel = origin;
  if (dateRange) saleWhere.soldAt = dateRange;
  if (wantType) saleWhere.customer = { type: wantType };

  const [orders, sales] = await Promise.all([
    includeOrders
      ? prisma.order.findMany({
          where: orderWhere,
          orderBy: { createdAt: "desc" },
          take: limit,
          include: {
            items: { select: { id: true } },
            customer: { select: { type: true } },
          },
        })
      : Promise.resolve([]),
    prisma.manualSale.findMany({
      where: saleWhere,
      orderBy: { soldAt: "desc" },
      take: limit,
      include: {
        items: { select: { id: true } },
        customer: { select: { type: true } },
      },
    }),
  ]);

  let rows: UnifiedSale[] = [];
  for (const o of orders) {
    rows.push({
      id: o.id,
      kind: "ORDER",
      origin: "WEB",
      date: o.createdAt,
      customerName: o.customerName,
      customerType: o.customer?.type ?? null,
      total: o.total,
      status: normalizeStatus(o.status),
      paymentLabel:
        o.paymentMethod === "MERCADOPAGO" ? "MP pagado" : "Efectivo al recibir",
      itemsCount: o.items.length,
      href: detailHref("ORDER", o.id),
    });
  }
  for (const s of sales) {
    rows.push({
      id: s.id,
      kind: "MANUAL",
      origin: s.channel,
      date: s.soldAt,
      customerName: s.customerName ?? "Sin nombre",
      customerType: s.customer?.type ?? null,
      total: s.net,
      status: normalizeStatus(s.deliveryStatus),
      paymentLabel: s.paymentStatus === "PAID" ? "Cobrada" : "Cta. corriente",
      itemsCount: s.items.length,
      href: detailHref("MANUAL", s.id),
    });
  }

  // Status filter applies AFTER normalization.
  if (filters.status) rows = rows.filter((r) => r.status === filters.status);

  rows.sort((a, b) => b.date.getTime() - a.date.getTime());
  return rows.slice(0, limit);
}

// Counts per status for the current filters (ignoring the status filter itself),
// so the filter buttons can show "(N)". Returns all 3 + total non-cancelled.
export async function countSalesByStatus(
  filters: Omit<UnifiedFilters, "status" | "limit">
): Promise<{ CONFIRMED: number; DELIVERED: number; CANCELLED: number; activos: number }> {
  const all = await listSalesUnified({ ...filters, limit: 5000 });
  const out = { CONFIRMED: 0, DELIVERED: 0, CANCELLED: 0, activos: 0 };
  for (const r of all) {
    if (r.status === "CONFIRMED") out.CONFIRMED += 1;
    else if (r.status === "DELIVERED") out.DELIVERED += 1;
    else if (r.status === "CANCELLED") out.CANCELLED += 1;
  }
  out.activos = out.CONFIRMED + out.DELIVERED;
  return out;
}

// Products for the sale form: name + current price (the tradicional/default).
export async function listProductsForSale() {
  const products = await prisma.product.findMany({ orderBy: { name: "asc" } });
  return products.map((p) => {
    // Empanados the product offers, with the price of each (falls back to the
    // product's default price). Used to auto-fill the unit price per empanado.
    let breadcrumbs: string[] = [];
    try {
      const b = JSON.parse(p.availableBreadcrumbs);
      breadcrumbs = Array.isArray(b) ? b : [];
    } catch {
      breadcrumbs = [];
    }
    let priceMap: Record<string, number> = {};
    try {
      const pr = JSON.parse(p.prices);
      if (pr && typeof pr === "object") priceMap = pr;
    } catch {
      priceMap = {};
    }
    return {
      id: p.id,
      name: p.name,
      price: p.price,
      breadcrumbs,
      prices: priceMap,
    };
  });
}

// ---- Billing dashboard ----

export type BillingTotals = {
  gross: number; // sum of subtotals before discount
  discount: number; // total discounts in pesos
  net: number; // total charged
  salesCount: number;
};

export type BillingReport = {
  totals: BillingTotals;
  byProduct: { name: string; units: number; net: number }[];
  byCustomer: { name: string; net: number; salesCount: number }[];
  byChannel: { channel: string; net: number; gross: number }[];
  byNeighborhood: {
    neighborhood: string;
    units: number;
    gross: number;
    net: number;
  }[];
};

// Builds the billing report over [from, to). Combines manual sales and web
// orders (web orders count as channel WEB, no discount, qty in units).
export async function getBillingReport(
  from: Date,
  to: Date
): Promise<BillingReport> {
  const [sales, orders] = await Promise.all([
    prisma.manualSale.findMany({
      where: { soldAt: { gte: from, lt: to } },
      include: { items: true, customer: { include: { barrio: true } } },
    }),
    prisma.order.findMany({
      where: {
        createdAt: { gte: from, lt: to },
        status: { not: "CANCELLED" },
      },
      include: {
        items: { include: { product: true } },
        customer: { include: { barrio: true } },
      },
    }),
  ]);

  let gross = 0;
  let discount = 0;
  let net = 0;
  const byProduct = new Map<
    string,
    { name: string; units: number; net: number }
  >();
  const byCustomer = new Map<string, { net: number; salesCount: number }>();
  const byChannel = new Map<string, { net: number; gross: number }>();
  // Keyed by neighborhood; only real neighborhoods are added (no "sin barrio").
  const byNeighborhood = new Map<
    string,
    { units: number; gross: number; net: number }
  >();

  function addNeighborhood(
    name: string | null | undefined,
    units: number,
    g: number,
    n: number
  ) {
    const key = name?.trim();
    if (!key) return; // sales without a neighborhood are left out of this table
    const cur = byNeighborhood.get(key) ?? {
      units: 0,
      gross: 0,
      net: 0,
    };
    cur.units += units;
    cur.gross += g;
    cur.net += n;
    byNeighborhood.set(key, cur);
  }

  function addProduct(name: string, units: number, netAmount: number) {
    const cur = byProduct.get(name) ?? { name, units: 0, net: 0 };
    cur.units += units;
    cur.net += netAmount;
    byProduct.set(name, cur);
  }
  function addChannel(channel: string, g: number, n: number) {
    const cur = byChannel.get(channel) ?? { net: 0, gross: 0 };
    cur.gross += g;
    cur.net += n;
    byChannel.set(channel, cur);
  }

  // Manual sales.
  for (const s of sales) {
    gross += s.gross;
    discount += s.discountAmount;
    net += s.net;
    addChannel(s.channel, s.gross, s.net);

    const name = s.customerName || "Sin cliente";
    const c = byCustomer.get(name) ?? { net: 0, salesCount: 0 };
    c.net += s.net;
    c.salesCount += 1;
    byCustomer.set(name, c);

    // Distribute the sale's net across items proportionally to their subtotal,
    // so per-product net reflects the discount.
    const saleGross = s.gross || 1;
    let saleUnits = 0;
    for (const it of s.items) {
      const share = s.net * (it.lineSubtotal / saleGross);
      addProduct(it.productName, it.quantity, Math.round(share));
      saleUnits += it.quantity;
    }
    addNeighborhood(s.customer?.barrio?.name, saleUnits, s.gross, s.net);
  }

  // Web orders (channel WEB; no discount; quantities are units).
  for (const o of orders) {
    // Order.total includes shipping; bill on the products subtotal only.
    const productsTotal = o.total - (o.shippingCost ?? 0);
    gross += productsTotal;
    net += productsTotal;
    addChannel("WEB", productsTotal, productsTotal);

    const name = o.customerName || "Cliente web";
    const c = byCustomer.get(name) ?? { net: 0, salesCount: 0 };
    c.net += productsTotal;
    c.salesCount += 1;
    byCustomer.set(name, c);

    let orderUnits = 0;
    for (const it of o.items) {
      addProduct(
        it.product?.name ?? "Producto",
        it.quantity,
        it.priceAtTime * it.quantity
      );
      orderUnits += it.quantity;
    }
    // The web order's barrio comes from its linked customer (if any).
    addNeighborhood(
      o.customer?.barrio?.name,
      orderUnits,
      productsTotal,
      productsTotal
    );
  }

  return {
    totals: { gross, discount, net, salesCount: sales.length + orders.length },
    byProduct: [...byProduct.values()].sort((a, b) => b.net - a.net),
    byCustomer: [...byCustomer.entries()]
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.net - a.net),
    byChannel: [...byChannel.entries()]
      .map(([channel, v]) => ({ channel, ...v }))
      .sort((a, b) => b.net - a.net),
    byNeighborhood: [...byNeighborhood.entries()]
      .map(([neighborhood, v]) => ({ neighborhood, ...v }))
      .sort((a, b) => b.net - a.net),
  };
}

// (Profitability moved to Catálogo → Costos y Precios; see lib/pricing.ts.)

// Resolves a period preset or custom range into [from, to) dates.
export function resolvePeriod(
  preset: string,
  fromStr?: string,
  toStr?: string
): { from: Date; to: Date; label: string } {
  const now = new Date();
  if (preset === "today") {
    const from = new Date(now);
    from.setHours(0, 0, 0, 0);
    const to = new Date(from);
    to.setDate(to.getDate() + 1);
    return { from, to, label: "Hoy" };
  }
  if (preset === "week") {
    const from = new Date(now);
    from.setDate(from.getDate() - 7);
    from.setHours(0, 0, 0, 0);
    return { from, to: now, label: "Últimos 7 días" };
  }
  if (preset === "custom" && fromStr && toStr) {
    const from = new Date(`${fromStr}T00:00:00`);
    const to = new Date(`${toStr}T00:00:00`);
    to.setDate(to.getDate() + 1); // inclusive of the end day
    return { from, to, label: `${fromStr} a ${toStr}` };
  }
  // default: current month
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const monthName = from.toLocaleDateString("es-AR", {
    month: "long",
    year: "numeric",
  });
  return { from, to, label: monthName };
}

// ---- Discount codes (admin CRUD) ----

export type DiscountCodeInput = {
  code: string;
  kind: string; // PERCENT | FIXED
  value: number;
  active: boolean;
  expiresAt?: string | null; // yyyy-mm-dd or null
  maxUses: number;
  minTotal: number;
};

function cleanDiscountCode(input: DiscountCodeInput) {
  const code = input.code.trim().toUpperCase().replace(/\s+/g, "");
  if (!code) throw new Error("El código necesita un texto (ej: BERNA10).");
  if (input.kind !== "PERCENT" && input.kind !== "FIXED") {
    throw new Error("Tipo de descuento inválido.");
  }
  const value = Math.round(Number(input.value));
  if (!Number.isFinite(value) || value < 0) throw new Error("Valor inválido.");
  if (input.kind === "PERCENT" && value > 100) {
    throw new Error("El porcentaje no puede superar 100.");
  }
  const maxUses = Math.max(0, Math.round(Number(input.maxUses) || 0));
  const minTotal = Math.max(0, Math.round(Number(input.minTotal) || 0));
  const expiresAt = input.expiresAt
    ? new Date(`${input.expiresAt}T23:59:59`)
    : null;
  return {
    code,
    kind: input.kind,
    value,
    active: Boolean(input.active),
    maxUses,
    minTotal,
    expiresAt,
  };
}

export async function listDiscountCodes() {
  return prisma.discountCode.findMany({ orderBy: { createdAt: "desc" } });
}

export async function createDiscountCode(input: DiscountCodeInput) {
  const data = cleanDiscountCode(input);
  const existing = await prisma.discountCode.findUnique({
    where: { code: data.code },
  });
  if (existing) throw new Error("Ya existe un código con ese texto.");
  await prisma.discountCode.create({ data });
}

export async function updateDiscountCode(id: string, input: DiscountCodeInput) {
  const data = cleanDiscountCode(input);
  // Allow keeping the same code on the same record; block clashing with others.
  const clash = await prisma.discountCode.findUnique({
    where: { code: data.code },
  });
  if (clash && clash.id !== id) {
    throw new Error("Ya existe otro código con ese texto.");
  }
  await prisma.discountCode.update({ where: { id }, data });
}

export async function deleteDiscountCode(id: string) {
  await prisma.discountCode.delete({ where: { id } });
}
