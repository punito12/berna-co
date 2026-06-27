// Presupuestos: documentos comerciales (cotizaciones). SOLO documentos: NO
// tocan stock, caja, cuentas por cobrar, ventas, remitos ni reportes. Reusa el
// selector de productos y la MISMA fuente de precio que remitos (P. Lista), y
// calcula P. Mayor. = P. Lista * (1 - descuento%). Snapshots por ítem para que
// un presupuesto viejo no cambie si el precio del producto cambia después.

import { prisma } from "@/lib/db";
import { findOrCreateCustomerByName } from "@/lib/clients";
import { BREADCRUMB_LABELS } from "@/lib/products";
import {
  listRemitoProductOptions,
  type RemitoProductOption,
} from "@/lib/remitos";

// Tipos de presupuesto. PRICE_LIST = lista de precios mayorista (P.Lista/P.Mayor,
// sin cantidades ni total). QUOTATION = cotización tipo remito (cantidad × precio
// = subtotal, con total). Ambos son SOLO documentos comerciales.
export const PRESUPUESTO_TYPES = ["PRICE_LIST", "QUOTATION"] as const;
export type PresupuestoType = (typeof PRESUPUESTO_TYPES)[number];

export const PRESUPUESTO_TYPE_LABELS: Record<string, string> = {
  PRICE_LIST: "Lista mayorista",
  QUOTATION: "Cotización",
};

export const PRESUPUESTO_STATUSES = [
  "BORRADOR",
  "ENVIADO",
  "ACEPTADO",
  "RECHAZADO",
] as const;
export type PresupuestoStatus = (typeof PRESUPUESTO_STATUSES)[number];

export const PRESUPUESTO_STATUS_LABELS: Record<string, string> = {
  BORRADOR: "Borrador",
  ENVIADO: "Enviado",
  ACEPTADO: "Aceptado",
  RECHAZADO: "Rechazado",
};

export const DEFAULT_WHOLESALE_DISCOUNT = 25; // %

// Productos para el selector del presupuesto: reusa exactamente la misma lista
// que remitos (todos los productos con sus precios).
export async function listPresupuestoProductOptions(): Promise<
  RemitoProductOption[]
> {
  return listRemitoProductOptions();
}

// P. Lista de un producto+empanado: MISMA lógica/fuente que usa el remito
// (precio efectivo/transferencia si está cargado, si no el precio web). Así el
// presupuesto y el remito muestran el mismo precio de lista.
export function listPriceFor(
  product: RemitoProductOption,
  breadcrumb: string
): number {
  const cashSpecific = product.cashPrices?.[breadcrumb];
  if (typeof cashSpecific === "number" && cashSpecific > 0) return cashSpecific;
  if (product.priceCashTransfer && product.priceCashTransfer > 0) {
    return product.priceCashTransfer;
  }
  const specific = product.prices?.[breadcrumb];
  if (typeof specific === "number" && specific > 0) return specific;
  return product.price;
}

// P. Mayor. = P. Lista * (1 - descuento/100), redondeado a pesos enteros.
export function wholesalePriceFor(listPrice: number, discountPercent: number): number {
  const pct = Math.max(0, Math.min(100, discountPercent));
  return Math.round(listPrice * (1 - pct / 100));
}

export function descriptionFor(
  productName: string,
  breadcrumb: string
): string {
  if (!breadcrumb) return productName;
  const label = BREADCRUMB_LABELS[breadcrumb] ?? breadcrumb;
  return `${productName} — ${label}`;
}

export function formatPresupuestoNumber(number: number): string {
  return `PRESUPUESTO #${String(number).padStart(6, "0")}`;
}

export function padPresupuestoNumber(number: number): string {
  return String(number).padStart(6, "0");
}

export function formatPresupuestoMoney(amount: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(amount);
}

export type PresupuestoItemInput = {
  productId?: string | null;
  breadcrumbType?: string | null;
  productName: string; // nombre base (sin empanado)
  variantName?: string; // empanado (etiqueta)
  // PRICE_LIST: precio de lista (P. Lista). QUOTATION: precio unitario + cantidad.
  listPrice?: number;
  quantity?: number;
  unitPrice?: number;
};

export type PresupuestoInput = {
  type?: string; // PRICE_LIST | QUOTATION (default PRICE_LIST)
  customerId?: string | null;
  customerName: string;
  date: string;
  validUntil?: string | null;
  status?: string;
  discountPercent?: number;
  notesInternal?: string;
  items: PresupuestoItemInput[];
  number?: number | string;
};

// ---- Lecturas ----

export async function listPresupuestos() {
  return prisma.presupuesto.findMany({
    orderBy: [{ date: "desc" }, { number: "desc" }],
    include: { items: { orderBy: { sortOrder: "asc" } } },
  });
}

export async function getPresupuesto(id: string) {
  return prisma.presupuesto.findUnique({
    where: { id },
    include: { items: { orderBy: { sortOrder: "asc" } } },
  });
}

async function getNextNumber(): Promise<number> {
  const last = await prisma.presupuesto.findFirst({
    orderBy: { number: "desc" },
    select: { number: true },
  });
  return (last?.number ?? 0) + 1;
}

// ---- Normalización + validación ----

function parseDate(value: string | undefined | null, message: string): Date {
  if (!value) throw new Error(message);
  const date = new Date(value.includes("T") ? value : `${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) throw new Error(message);
  return date;
}

function normalizeInput(input: PresupuestoInput) {
  const customerName = input.customerName?.trim();
  if (!customerName) throw new Error("Elegí un cliente o escribí un nombre.");
  if (!Array.isArray(input.items) || input.items.length === 0) {
    throw new Error("Agregá al menos un producto.");
  }
  const type: PresupuestoType = PRESUPUESTO_TYPES.includes(
    input.type as PresupuestoType
  )
    ? (input.type as PresupuestoType)
    : "PRICE_LIST";

  const discountPercent = Number.isFinite(Number(input.discountPercent))
    ? Math.max(0, Math.min(100, Number(input.discountPercent)))
    : DEFAULT_WHOLESALE_DISCOUNT;

  const status = PRESUPUESTO_STATUSES.includes(input.status as PresupuestoStatus)
    ? (input.status as string)
    : "BORRADOR";

  let total = 0;
  const items = input.items.map((it, index) => {
    const productName = it.productName?.trim();
    if (!productName) throw new Error("Cada ítem necesita una descripción.");
    const base = {
      productId: it.productId || null,
      breadcrumbType: it.breadcrumbType || null,
      productName,
      variantName: it.variantName?.trim() || "",
      sortOrder: index,
      // defaults; cada tipo llena lo suyo
      listPrice: 0,
      wholesalePrice: 0,
      quantity: 0,
      unitPrice: 0,
      subtotal: 0,
    };
    if (type === "QUOTATION") {
      // Cotización: cantidad × precio unitario = subtotal (como remito).
      const quantity = Number(it.quantity);
      const unitPrice = Math.round(Number(it.unitPrice));
      if (!Number.isFinite(quantity) || quantity <= 0) {
        throw new Error(`Cantidad inválida para ${productName}.`);
      }
      if (!Number.isFinite(unitPrice) || unitPrice < 0) {
        throw new Error(`Precio inválido para ${productName}.`);
      }
      const subtotal = Math.round(quantity * unitPrice);
      total += subtotal;
      return { ...base, quantity, unitPrice, subtotal };
    }
    // PRICE_LIST: P. Lista + P. Mayor (calculado en server). Sin cantidad/total.
    const listPrice = Math.round(Number(it.listPrice));
    if (!Number.isFinite(listPrice) || listPrice < 0) {
      throw new Error("El precio de lista debe ser válido.");
    }
    return {
      ...base,
      listPrice,
      wholesalePrice: wholesalePriceFor(listPrice, discountPercent),
    };
  });

  return {
    type,
    total,
    header: {
      type,
      total,
      customerName,
      date: parseDate(input.date, "Elegí una fecha."),
      validUntil: input.validUntil
        ? parseDate(input.validUntil, "La validez es inválida.")
        : null,
      status,
      discountPercent,
      notesInternal: input.notesInternal?.trim() ?? "",
    },
    items,
  };
}

// Resuelve el cliente: si vino customerId, lo usa (nombre canónico). Si no, lo
// resuelve por el registro deduplicado (reusa el existente o crea uno nuevo SIN
// duplicar). Un presupuesto para un potencial cliente nuevo crea el cliente una
// sola vez; tipear "LA PROVEEDURÍA" reusa "La Proveeduría".
async function resolveCustomer(
  input: PresupuestoInput
): Promise<{ customerId: string | null; customerName: string }> {
  if (input.customerId) {
    const c = await prisma.customer.findUnique({
      where: { id: input.customerId },
      select: { id: true, name: true },
    });
    if (c) return { customerId: c.id, customerName: c.name };
  }
  // Sin id: resolver por nombre. type MAYORISTA por defecto (presupuesto mayorista).
  const { customer } = await findOrCreateCustomerByName({
    name: input.customerName,
    type: "MAYORISTA",
    source: "MANUAL",
  });
  return { customerId: customer.id, customerName: customer.name };
}

// ---- Mutaciones (sin efectos colaterales: solo escriben el documento) ----

export async function createPresupuesto(input: PresupuestoInput) {
  const data = normalizeInput(input);
  const client = await resolveCustomer(input);
  const number = await getNextNumber();
  return prisma.presupuesto.create({
    data: {
      number,
      ...data.header,
      // El cliente resuelto (id + nombre canónico) pisa el nombre normalizado.
      customerId: client.customerId,
      customerName: client.customerName,
      items: { create: data.items },
    },
    select: { id: true },
  });
}

export async function updatePresupuesto(id: string, input: PresupuestoInput) {
  const existing = await prisma.presupuesto.findUnique({ where: { id } });
  if (!existing) throw new Error("Presupuesto no encontrado.");
  const data = normalizeInput(input);
  const client = await resolveCustomer(input);
  await prisma.$transaction([
    prisma.presupuestoItem.deleteMany({ where: { presupuestoId: id } }),
    prisma.presupuesto.update({
      where: { id },
      data: {
        ...data.header,
        customerId: client.customerId,
        customerName: client.customerName,
        items: { create: data.items },
      },
    }),
  ]);
}

// Cambia solo el estado (informativo). No dispara ningún efecto de negocio.
export async function setPresupuestoStatus(id: string, status: string) {
  if (!PRESUPUESTO_STATUSES.includes(status as PresupuestoStatus)) {
    throw new Error("Estado inválido.");
  }
  await prisma.presupuesto.update({ where: { id }, data: { status } });
}

// Duplica un presupuesto (nuevo número, estado BORRADOR, mismos ítems snapshot).
export async function duplicatePresupuesto(id: string): Promise<{ id: string }> {
  const src = await prisma.presupuesto.findUnique({
    where: { id },
    include: { items: { orderBy: { sortOrder: "asc" } } },
  });
  if (!src) throw new Error("Presupuesto no encontrado.");
  const number = await getNextNumber();
  return prisma.presupuesto.create({
    data: {
      number,
      type: src.type,
      customerId: src.customerId,
      customerName: src.customerName,
      date: new Date(),
      validUntil: src.validUntil,
      status: "BORRADOR",
      discountPercent: src.discountPercent,
      notesInternal: src.notesInternal,
      items: {
        create: src.items.map((it) => ({
          productId: it.productId,
          breadcrumbType: it.breadcrumbType,
          productName: it.productName,
          variantName: it.variantName,
          listPrice: it.listPrice,
          wholesalePrice: it.wholesalePrice,
          sortOrder: it.sortOrder,
        })),
      },
    },
    select: { id: true },
  });
}

// Borrado definitivo (los ítems caen en cascada). No toca nada más.
export async function deletePresupuesto(id: string) {
  await prisma.presupuesto.delete({ where: { id } });
}
