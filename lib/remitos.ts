import { prisma } from "@/lib/db";

export type RemitoItemInput = {
  quantity: number;
  unit: string;
  description: string;
  unitPrice: number;
};

export type RemitoInput = {
  date: string;
  customerName: string;
  items: RemitoItemInput[];
  discountPercent?: number;
  discountAmount?: number;
  paymentMethod?: string;
  note?: string;
  receivedSignature?: string;
  receivedClarification?: string;
  receivedDate?: string | null;
};

export type RemitoProductOption = {
  id: string;
  name: string;
  price: number;
};

// Productos para el selector del formulario de remitos. Trae TODOS (incluso no
// disponibles en la web) porque un remito mayorista puede incluir cualquier
// corte. Solo expone id/nombre/precio: al elegir un producto se COPIA el precio
// actual al ítem del remito; nunca se modifica el producto.
export async function listRemitoProductOptions(): Promise<RemitoProductOption[]> {
  const rows = await prisma.product.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, price: true },
  });
  return rows.map((r) => ({ id: r.id, name: r.name, price: r.price }));
}

export function formatRemitoNumber(number: number): string {
  return `REMITO #${String(number).padStart(6, "0")}`;
}

export function formatRemitoMoney(amount: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(amount);
}

export async function listRemitos() {
  return prisma.remito.findMany({
    orderBy: [{ date: "desc" }, { number: "desc" }],
    include: { items: { orderBy: { order: "asc" } } },
  });
}

export async function getRemito(id: string) {
  return prisma.remito.findUnique({
    where: { id },
    include: { items: { orderBy: { order: "asc" } } },
  });
}

export async function getNextRemitoNumber(): Promise<number> {
  const last = await prisma.remito.findFirst({
    orderBy: { number: "desc" },
    select: { number: true },
  });
  return (last?.number ?? 0) + 1;
}

export async function createRemito(input: RemitoInput) {
  const data = normalizeRemitoInput(input);
  const number = await getNextRemitoNumber();
  return prisma.remito.create({
    data: {
      number,
      ...data.header,
      items: { create: data.items },
    },
    select: { id: true },
  });
}

export async function updateRemito(id: string, input: RemitoInput) {
  const existing = await prisma.remito.findUnique({ where: { id } });
  if (!existing) throw new Error("Remito no encontrado.");
  const data = normalizeRemitoInput(input);
  await prisma.$transaction([
    prisma.remitoItem.deleteMany({ where: { remitoId: id } }),
    prisma.remito.update({
      where: { id },
      data: {
        ...data.header,
        items: { create: data.items },
      },
    }),
  ]);
}

export async function archiveRemito(id: string) {
  await prisma.remito.update({ where: { id }, data: { archived: true } });
}

// Borrado definitivo del remito (irreversible). Los RemitoItem se eliminan en
// cascada (onDelete: Cascade en el schema). A diferencia de archivar, esto no
// se puede recuperar.
export async function deleteRemito(id: string) {
  await prisma.remito.delete({ where: { id } });
}

function normalizeRemitoInput(input: RemitoInput) {
  const date = parseDate(input.date, "Elegí una fecha.");
  const customerName = input.customerName?.trim();
  if (!customerName) throw new Error("Ingresá el nombre del cliente.");

  if (!Array.isArray(input.items) || input.items.length === 0) {
    throw new Error("Agregá al menos un ítem.");
  }

  const items = input.items.map((item, index) => {
    const quantity = Number(item.quantity);
    const unitPrice = Math.round(Number(item.unitPrice));
    const description = item.description?.trim();
    const unit = item.unit === "paq." ? "paq." : "kg";
    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new Error("La cantidad de cada ítem debe ser mayor a cero.");
    }
    if (!description) throw new Error("Cada ítem necesita una descripción.");
    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      throw new Error("El precio unitario debe ser válido.");
    }
    return {
      quantity,
      unit,
      description,
      unitPrice,
      total: Math.round(quantity * unitPrice),
      order: index,
    };
  });

  const subtotal = items.reduce((acc, item) => acc + item.total, 0);
  const discountPercent = clamp(Number(input.discountPercent ?? 0), 0, 100);
  const percentAmount = Math.round((subtotal * discountPercent) / 100);
  const manualDiscount = Number(input.discountAmount);
  const discountAmount =
    Number.isFinite(manualDiscount) && manualDiscount >= 0
      ? Math.min(Math.round(manualDiscount), subtotal)
      : percentAmount;
  const total = Math.max(0, subtotal - discountAmount);

  return {
    header: {
      date,
      customerName,
      subtotal,
      discountPercent,
      discountAmount,
      total,
      paymentMethod: input.paymentMethod?.trim() ?? "",
      note: input.note?.trim() ?? "",
      receivedSignature: input.receivedSignature?.trim() ?? "",
      receivedClarification: input.receivedClarification?.trim() ?? "",
      receivedDate: input.receivedDate
        ? parseDate(input.receivedDate, "La fecha de recepción es inválida.")
        : null,
    },
    items,
  };
}

function parseDate(value: string | undefined | null, message: string): Date {
  if (!value) throw new Error(message);
  const date = new Date(value.includes("T") ? value : `${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) throw new Error(message);
  return date;
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}
