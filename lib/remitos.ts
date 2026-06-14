import { prisma } from "@/lib/db";
import QRCode from "qrcode";
import { absoluteUrl } from "@/lib/seo";

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
  // Número de remito. Opcional: si no viene, el server sugiere el siguiente.
  // Si viene, se valida que sea un entero positivo y que no esté repetido.
  number?: number | string;
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
  breadcrumbs: string[];
  prices: Record<string, number>;
};

// Productos para el selector del formulario de remitos. Trae TODOS (incluso no
// disponibles en la web) porque un remito mayorista puede incluir cualquier
// corte. Solo expone id/nombre/precio: al elegir un producto se COPIA el precio
// actual al ítem del remito; nunca se modifica el producto.
export async function listRemitoProductOptions(): Promise<RemitoProductOption[]> {
  const rows = await prisma.product.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      price: true,
      availableBreadcrumbs: true,
      prices: true,
    },
  });
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    price: r.price,
    breadcrumbs: parseStringArray(r.availableBreadcrumbs),
    prices: parseNumberMap(r.prices),
  }));
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

// El número de remito en el mismo formato de 6 dígitos que muestra el sistema
// (000241), pero SIN el prefijo "REMITO #". Sirve para inputs/labels.
export function padRemitoNumber(number: number): string {
  return String(number).padStart(6, "0");
}

// URL pública (absoluta) que abre este remito al escanear el QR. Usa el `id`
// (cuid) como token: es no-secuencial e inadivinable, así que los remitos NO
// quedan enumerables por id incremental. La ruta /remito/[id] es de solo
// lectura y no requiere login de admin.
export function remitoPublicUrl(id: string): string {
  return absoluteUrl(`/remito/${id}`);
}

// QR del remito como data-URL PNG (alto contraste, márgenes y tamaño aptos para
// papel). Se genera en el server; el componente solo muestra la imagen.
export async function remitoQrDataUrl(id: string): Promise<string> {
  const url = remitoPublicUrl(id);
  return QRCode.toDataURL(url, {
    errorCorrectionLevel: "M",
    margin: 1,
    scale: 8,
    color: { dark: "#000000", light: "#ffffff" },
  });
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

// Normaliza el número ingresado a mano. Acepta "241", " 241 ", "000241" → 241.
// Devuelve null si el input está vacío (= usar el sugerido automático).
function parseManualNumber(value: number | string | undefined): number | null {
  if (value === undefined || value === null) return null;
  const raw = String(value).trim();
  if (raw === "") return null;
  if (!/^\d+$/.test(raw)) {
    throw new Error("El número de remito debe ser un entero positivo.");
  }
  const n = parseInt(raw, 10);
  if (!Number.isInteger(n) || n <= 0) {
    throw new Error("El número de remito debe ser un entero positivo.");
  }
  return n;
}

// Resuelve el número a guardar y valida que no esté repetido. `excludeId` se usa
// al editar (para no chocar con el propio remito). La unicidad final igual la
// garantiza el constraint @unique de la DB (ver catch P2002 abajo).
async function resolveRemitoNumber(
  input: RemitoInput,
  excludeId?: string
): Promise<number> {
  const manual = parseManualNumber(input.number);
  const number = manual ?? (await getNextRemitoNumber());
  const clash = await prisma.remito.findFirst({
    where: { number, ...(excludeId ? { id: { not: excludeId } } : {}) },
    select: { id: true },
  });
  if (clash) {
    throw new Error(
      `Ya existe un remito con el número ${padRemitoNumber(number)}. Usá otro número.`
    );
  }
  return number;
}

// Mapea el error de unicidad de Prisma (carrera entre dos guardados con el mismo
// número) a un mensaje claro en español.
function isUniqueNumberError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: string }).code === "P2002"
  );
}

export async function createRemito(input: RemitoInput) {
  const data = normalizeRemitoInput(input);
  const number = await resolveRemitoNumber(input);
  try {
    return await prisma.remito.create({
      data: {
        number,
        ...data.header,
        items: { create: data.items },
      },
      select: { id: true },
    });
  } catch (error) {
    if (isUniqueNumberError(error)) {
      throw new Error(
        `Ya existe un remito con el número ${padRemitoNumber(number)}. Usá otro número.`
      );
    }
    throw error;
  }
}

export async function updateRemito(id: string, input: RemitoInput) {
  const existing = await prisma.remito.findUnique({ where: { id } });
  if (!existing) throw new Error("Remito no encontrado.");
  const data = normalizeRemitoInput(input);
  const number = await resolveRemitoNumber(input, id);
  try {
    await prisma.$transaction([
      prisma.remitoItem.deleteMany({ where: { remitoId: id } }),
      prisma.remito.update({
        where: { id },
        data: {
          number,
          ...data.header,
          items: { create: data.items },
        },
      }),
    ]);
  } catch (error) {
    if (isUniqueNumberError(error)) {
      throw new Error(
        `Ya existe un remito con el número ${padRemitoNumber(number)}. Usá otro número.`
      );
    }
    throw error;
  }
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

function parseStringArray(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

function parseNumberMap(raw: string): Record<string, number> {
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }
    const out: Record<string, number> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === "number" && Number.isFinite(value)) out[key] = value;
    }
    return out;
  } catch {
    return {};
  }
}
