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
  };
}

export async function listCustomers() {
  return prisma.customer.findMany({ orderBy: { name: "asc" } });
}

export async function createCustomer(input: CustomerInput) {
  await prisma.customer.create({ data: cleanCustomer(input) });
}

export async function updateCustomer(id: string, input: CustomerInput) {
  await prisma.customer.update({ where: { id }, data: cleanCustomer(input) });
}

// Deletes a customer. Their past sales stay (customerId is set to null), so
// history/billing is never lost.
export async function deleteCustomer(id: string) {
  await prisma.customer.delete({ where: { id } });
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
