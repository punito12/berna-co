// Admin "Gestión" business logic: customers, manual sales, billing dashboard
// and profitability. All money is in whole pesos. Kept separate from the
// storefront logic. API routes call these after checking isAuthenticated().

import { prisma } from "@/lib/db";
import { DEFAULT_DUE_DAYS, createPayment } from "@/lib/payments";
import {
  orderPaymentBadgeTone,
  orderPaymentListLabel,
  type PaymentBadgeTone,
} from "@/lib/mp-order-status";
import { adjustStockForLines } from "@/lib/stock";
import { findCustomerByNormalizedName, normalizeClientName } from "@/lib/clients";

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
  // Sin query: los más recientes (orden alfabético, tope 30).
  if (!q) {
    return prisma.customer.findMany({
      include: { barrio: true, _count: { select: { orders: true, sales: true } } },
      orderBy: { name: "asc" },
      take: 30,
    });
  }
  // Con query: traemos el universo de clientes (en un admin son pocos) y
  // filtramos en memoria por nombre NORMALIZADO (acento/caso/espacio-insensible),
  // más matches por barrio/teléfono/email. Así "proveeduria" encuentra
  // "La Proveeduría" y "LA PROVEEDURIA", que el `contains` de Postgres no capta
  // por los acentos.
  const all = await prisma.customer.findMany({
    include: { barrio: true, _count: { select: { orders: true, sales: true } } },
    orderBy: { name: "asc" },
  });
  const nq = normalizeClientName(q);
  return all
    .filter((c) => {
      const byName = nq && normalizeClientName(c.name).includes(nq);
      const byBarrio =
        c.barrio && normalizeClientName(c.barrio.name).includes(nq);
      const byPhone = c.phone?.toLowerCase().includes(q.toLowerCase());
      const byEmail = c.email?.toLowerCase().includes(q.toLowerCase());
      return byName || byBarrio || byPhone || byEmail;
    })
    .slice(0, 50);
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
  const data = cleanCustomer(input);
  // Guarda anti-duplicado: si ya existe un cliente con el mismo nombre normalizado
  // (mismas letras ignorando mayúsculas/acentos/espacios), NO creamos otro.
  const existing = await findCustomerByNormalizedName(data.name);
  if (existing) {
    throw new Error(
      `Ya existe un cliente con ese nombre: "${existing.name}". Usá el existente en vez de crear un duplicado.`
    );
  }
  return prisma.customer.create({
    data: { ...data, source: "MANUAL" },
  });
}

export async function updateCustomer(id: string, input: CustomerInput) {
  const data = cleanCustomer(input);
  // Si el nuevo nombre normaliza igual que OTRO cliente, bloquear (sería crear un
  // duplicado por la puerta de atrás). Permitir mantener el mismo registro.
  const clash = await findCustomerByNormalizedName(data.name);
  if (clash && clash.id !== id) {
    throw new Error(
      `Ya existe otro cliente con ese nombre: "${clash.name}".`
    );
  }
  await prisma.customer.update({ where: { id }, data });
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

// ---- Manual sales ----

export const SALE_CHANNELS = ["WEB", "WHATSAPP", "MAYORISTA", "KIOSCO"] as const;
export const SALE_CHANNEL_LABELS: Record<string, string> = {
  WEB: "Web",
  WHATSAPP: "WhatsApp",
  MAYORISTA: "Mayorista",
  KIOSCO: "Kiosco",
};

// Medios de pago de la venta manual.
export const SALE_PAYMENT_METHODS = [
  "EFECTIVO",
  "TRANSFERENCIA",
  "MERCADO_PAGO",
  "OTRO",
] as const;
export const SALE_PAYMENT_METHOD_LABELS: Record<string, string> = {
  EFECTIVO: "Efectivo",
  TRANSFERENCIA: "Transferencia",
  MERCADO_PAGO: "Mercado Pago",
  OTRO: "Otro",
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
  // Medio de pago (EFECTIVO | TRANSFERENCIA | MERCADO_PAGO | OTRO). Default efectivo.
  paymentMethod?: string;
  // true = pendiente de pago hasta registrar el pago.
  paymentPending?: boolean;
  // ¿Descontar stock al cargar la venta? Default true (comportamiento histórico).
  // false = no toca inventario (p. ej. mercadería ya descontada antes): la venta
  // se factura/registra igual pero no mueve stock.
  discountStock?: boolean;
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
  const paymentMethod = SALE_PAYMENT_METHODS.includes(
    input.paymentMethod as (typeof SALE_PAYMENT_METHODS)[number]
  )
    ? (input.paymentMethod as string)
    : "EFECTIVO";
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

  // Cuenta corriente / pendiente: la venta queda PENDING si el admin la marca
  // pendiente O si el cliente es mayorista. Si no, queda PAID. Admin V2 no usa
  // Caja, por lo que no se generan movimientos contables invisibles.
  const onCredit = Boolean(input.paymentPending) || customer?.type === "MAYORISTA";
  const dueDate =
    customer?.type === "MAYORISTA"
      ? new Date(soldAt.getTime() + DEFAULT_DUE_DAYS * 86400000)
      : null;

  // Por defecto descuenta stock (como siempre). Solo NO descuenta si el admin lo
  // pide explícitamente. Se persiste para que cancelar/editar respeten la decisión
  // (una venta que no descontó stock tampoco lo reintegra al cancelar).
  const discountStock = input.discountStock !== false;

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
      paymentMethod,
      paymentStatus: onCredit ? "PENDING" : "PAID",
      dueDate,
      stockDiscounted: discountStock,
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
  // Solo si la venta descuenta stock; si no, no se toca inventario ni el cache
  // del home (que depende del stock).
  if (discountStock) {
    try {
      await adjustStockForLines(lines, -1, {
        type: "SALE",
        referenceType: "MANUAL_SALE",
        referenceId: sale.id,
      });
    } catch (e) {
      console.error("adjustStockForLines (sale create) failed:", e);
    }
  }

  // El caller (ruta API) revalida el cache del home si cambió stock. La
  // revalidación vive en la ruta (server-only) para no arrastrar next/headers
  // al bundle cliente que importa labels de este módulo.
  return { stockChanged: discountStock };
}

export async function listManualSales(limit = 100) {
  return prisma.manualSale.findMany({
    orderBy: { soldAt: "desc" },
    take: limit,
    include: { items: true, customer: true },
  });
}

// Reverse everything a manual sale put into the system: restock its items.
// Payment rows cascade on delete; cancelling keeps the sale visible as cancelled.
async function reverseSaleEffects(saleId: string) {
  const sale = await prisma.manualSale.findUnique({
    where: { id: saleId },
    include: { items: true },
  });
  if (!sale) return;
  // Restock (only lines that tracked product + empanado). Solo si la venta había
  // descontado stock al cargarse: una venta cargada con "no descontar stock" no
  // tiene nada que reintegrar (de lo contrario sumaría stock fantasma).
  if (sale.stockDiscounted) {
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
  }
}

export async function deleteManualSale(id: string) {
  // Reverse stock first, then delete (payments cascade-delete with it).
  await reverseSaleEffects(id);
  await prisma.manualSale.delete({ where: { id } });
}

export const SALE_DELIVERY_STATUSES = [
  "PENDING",
  "DELIVERED",
  "CANCELLED",
] as const;

// Set the logistic status of a manual sale. Cancelling restocks once. Moving
// OUT of cancelled re-discounts the stock.
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
    // Re-activating a cancelled sale: discount stock again. Solo si la
    // venta descuenta stock; si se cargó sin descontar, reactivarla tampoco lo mueve.
    if (sale.stockDiscounted) {
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
  }

  await prisma.manualSale.update({
    where: { id },
    data: { deliveryStatus: status },
  });
}

// "Marcar pagado": register a payment for the outstanding balance and recompute
// paymentStatus. Admin V2 does not create Caja movements.
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
  date: Date; // fecha efectiva: soldAt (manual) / createdAt (web)
  createdAt: Date; // alta del registro; desempata el orden cuando date empata
  customerName: string;
  customerType: string | null; // MINORISTA | MAYORISTA | KIOSCO
  total: number;
  status: string; // CONFIRMED | DELIVERED | CANCELLED
  paymentLabel: string; // short payment hint for the row
  paymentTone: PaymentBadgeTone;
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
      createdAt: o.createdAt,
      customerName: o.customerName,
      customerType: o.customer?.type ?? null,
      total: o.total,
      status: normalizeStatus(o.status),
      paymentLabel: orderPaymentListLabel(o),
      paymentTone: orderPaymentBadgeTone(o),
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
      createdAt: s.createdAt,
      customerName: s.customerName ?? "Sin nombre",
      customerType: s.customer?.type ?? null,
      total: s.net,
      status: normalizeStatus(s.deliveryStatus),
      paymentLabel: s.paymentStatus === "PAID" ? "Cobrada" : "Cta. corriente",
      paymentTone: s.paymentStatus === "PAID" ? "success" : "warning",
      itemsCount: s.items.length,
      href: detailHref("MANUAL", s.id),
    });
  }

  // Status filter applies AFTER normalization.
  if (filters.status) rows = rows.filter((r) => r.status === filters.status);

  // Más nuevo primero por fecha efectiva (soldAt / createdAt). Si dos filas
  // tienen la misma fecha efectiva (p. ej. varias ventas manuales del mismo
  // día), desempata por createdAt (el alta real) descendente.
  rows.sort((a, b) => {
    const byDate = b.date.getTime() - a.date.getTime();
    if (byDate !== 0) return byDate;
    return b.createdAt.getTime() - a.createdAt.getTime();
  });
  return rows.slice(0, limit);
}

export type StatusCounts = {
  CONFIRMED: number;
  DELIVERED: number;
  CANCELLED: number;
  activos: number;
};

// Cuenta filas por estado a partir de un set YA cargado (sin tocar la DB). La
// página de Pedidos y ventas trae las filas una sola vez y deriva los contadores
// con esto, en vez de pegarle de nuevo a la base.
export function tallyStatusCounts(rows: UnifiedSale[]): StatusCounts {
  const out: StatusCounts = { CONFIRMED: 0, DELIVERED: 0, CANCELLED: 0, activos: 0 };
  for (const r of rows) {
    if (r.status === "CONFIRMED") out.CONFIRMED += 1;
    else if (r.status === "DELIVERED") out.DELIVERED += 1;
    else if (r.status === "CANCELLED") out.CANCELLED += 1;
  }
  out.activos = out.CONFIRMED + out.DELIVERED;
  return out;
}

// Counts per status for the current filters (ignoring the status filter itself),
// so the filter buttons can show "(N)". Returns all 3 + total non-cancelled.
// (Se mantiene por compatibilidad; la página unificada ahora usa
// tallyStatusCounts sobre las filas ya traídas para evitar una segunda query.)
export async function countSalesByStatus(
  filters: Omit<UnifiedFilters, "status" | "limit">
): Promise<StatusCounts> {
  const all = await listSalesUnified({ ...filters, limit: 5000 });
  return tallyStatusCounts(all);
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
    // PRECIO EFECTIVO/TRANSFERENCIA por empanado (precio base de la venta manual).
    let cashPriceMap: Record<string, number> = {};
    try {
      const pr = JSON.parse(p.pricesCashTransfer ?? "{}");
      if (pr && typeof pr === "object") cashPriceMap = pr;
    } catch {
      cashPriceMap = {};
    }
    return {
      id: p.id,
      name: p.name,
      price: p.price,
      priceCashTransfer: p.priceCashTransfer ?? 0,
      breadcrumbs,
      prices: priceMap,
      cashPrices: cashPriceMap,
    };
  });
}

// (Profitability moved to Catálogo → Costos y Precios; see lib/pricing.ts.)

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
