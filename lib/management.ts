// Admin "Gestión" business logic: customers, manual sales, billing dashboard
// and profitability. All money is in whole pesos. Kept separate from the
// storefront logic. API routes call these after checking isAuthenticated().

import { prisma } from "@/lib/db";

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
  await prisma.customer.create({ data: { ...cleanCustomer(input), source: "MANUAL" } });
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
  let qtyKg = 0;
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
    }
    // Manual sales.
    for (const s of c.sales) {
      cNet += s.net;
      gross += s.gross;
      net += s.net;
      cOrders += 1;
      ordersCount += 1;
      for (const it of s.items) qtyKg += it.qtyKg;
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
    qtyKg,
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
  productName: string;
  qtyKg: number;
  unitPrice: number; // pesos per kg
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
// gross = Σ(qtyKg × unitPrice), rounded per line; net = gross − discount.
export function computeSaleTotals(items: SaleItemInput[], discountPct: number) {
  let gross = 0;
  const lines = items.map((it) => {
    const qty = Number(it.qtyKg);
    const price = Math.round(Number(it.unitPrice));
    const lineSubtotal = Math.round(qty * price);
    gross += lineSubtotal;
    return { ...it, qtyKg: qty, unitPrice: price, lineSubtotal };
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
    if (!Number.isFinite(Number(it.qtyKg)) || Number(it.qtyKg) <= 0) {
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

  await prisma.manualSale.create({
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
      items: {
        create: lines.map((l) => ({
          productId: l.productId || null,
          productName: l.productName.trim(),
          qtyKg: l.qtyKg,
          unitPrice: l.unitPrice,
          lineSubtotal: l.lineSubtotal,
        })),
      },
    },
  });
}

export async function listManualSales(limit = 100) {
  return prisma.manualSale.findMany({
    orderBy: { soldAt: "desc" },
    take: limit,
    include: { items: true, customer: true },
  });
}

export async function deleteManualSale(id: string) {
  await prisma.manualSale.delete({ where: { id } });
}

// Products for the sale form: name + current price (the tradicional/default).
export async function listProductsForSale() {
  const products = await prisma.product.findMany({ orderBy: { name: "asc" } });
  return products.map((p) => ({
    id: p.id,
    name: p.name,
    price: p.price, // auto-fills the unit price; editable per sale
  }));
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
  byProduct: { name: string; qtyKg: number; units: number; net: number }[];
  byCustomer: { name: string; net: number; salesCount: number }[];
  byChannel: { channel: string; net: number; gross: number }[];
  byNeighborhood: {
    neighborhood: string;
    qtyKg: number;
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
    { name: string; qtyKg: number; units: number; net: number }
  >();
  const byCustomer = new Map<string, { net: number; salesCount: number }>();
  const byChannel = new Map<string, { net: number; gross: number }>();
  // Keyed by neighborhood; only real neighborhoods are added (no "sin barrio").
  const byNeighborhood = new Map<
    string,
    { qtyKg: number; units: number; gross: number; net: number }
  >();

  function addNeighborhood(
    name: string | null | undefined,
    qtyKg: number,
    units: number,
    g: number,
    n: number
  ) {
    const key = name?.trim();
    if (!key) return; // sales without a neighborhood are left out of this table
    const cur = byNeighborhood.get(key) ?? {
      qtyKg: 0,
      units: 0,
      gross: 0,
      net: 0,
    };
    cur.qtyKg += qtyKg;
    cur.units += units;
    cur.gross += g;
    cur.net += n;
    byNeighborhood.set(key, cur);
  }

  function addProduct(
    name: string,
    qtyKg: number,
    units: number,
    netAmount: number
  ) {
    const cur = byProduct.get(name) ?? { name, qtyKg: 0, units: 0, net: 0 };
    cur.qtyKg += qtyKg;
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
    let saleKg = 0;
    for (const it of s.items) {
      const share = s.net * (it.lineSubtotal / saleGross);
      addProduct(it.productName, it.qtyKg, 0, Math.round(share));
      saleKg += it.qtyKg;
    }
    addNeighborhood(s.customer?.barrio?.name, saleKg, 0, s.gross, s.net);
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
        0,
        it.quantity,
        it.priceAtTime * it.quantity
      );
      orderUnits += it.quantity;
    }
    // The web order's barrio comes from its linked customer (if any).
    addNeighborhood(
      o.customer?.barrio?.name,
      0,
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

// ---- Profitability ----

// Discount percentages used to derive each channel's selling price from the
// public (minorista) price. Minorista has no extra discount.
export const CHANNEL_DISCOUNTS = {
  MINORISTA: 0,
  MAYORISTA: 25,
  KIOSCO: 30,
} as const;

export type ProfitRow = {
  name: string;
  price: number; // public price (minorista)
  costPerKg: number;
  channels: {
    channel: string;
    sellPrice: number; // price after the channel discount
    marginPesos: number; // sellPrice - cost
    marginPct: number; // margin / sellPrice * 100
  }[];
};

// Builds the profitability table: for each product, the margin per channel
// (price after the channel discount minus the cost per kg).
export async function getProfitability(): Promise<ProfitRow[]> {
  const products = await prisma.product.findMany({ orderBy: { name: "asc" } });
  return products.map((p) => {
    const cost = p.costPerKg;
    const channels = Object.entries(CHANNEL_DISCOUNTS).map(([channel, pct]) => {
      const sellPrice = Math.round((p.price * (100 - pct)) / 100);
      const marginPesos = sellPrice - cost;
      const marginPct =
        sellPrice > 0 ? (marginPesos / sellPrice) * 100 : 0;
      return { channel, sellPrice, marginPesos, marginPct };
    });
    return { name: p.name, price: p.price, costPerKg: cost, channels };
  });
}

// Resolves a period preset or custom range into [from, to) dates.
export function resolvePeriod(
  preset: string,
  fromStr?: string,
  toStr?: string
): { from: Date; to: Date; label: string } {
  const now = new Date();
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
